/**
 * SVG Renderer
 *
 * Renders a laid-out graph to SVG format.
 */

import { Graph, Node, Edge, Bezier, Point, NodeShape, ArrowType } from '../core/types';

export interface SVGRenderOptions {
  width?: number;
  height?: number;
  scale?: number;
  padding?: number;
  background?: string;
  fontFamily?: string;
  fontSize?: number;
}

const DEFAULT_OPTIONS: Required<SVGRenderOptions> = {
  width: 0, // 0 means auto
  height: 0,
  scale: 1,
  padding: 10,
  background: 'transparent',
  fontFamily: 'Arial, Helvetica, sans-serif',
  fontSize: 14,
};

/**
 * Render a graph to SVG
 */
export function renderSVG(graph: Graph, options: SVGRenderOptions = {}): string {
  // Filter out undefined values to preserve defaults
  const cleanOptions: SVGRenderOptions = {};
  for (const [key, value] of Object.entries(options)) {
    if (value !== undefined) {
      (cleanOptions as Record<string, unknown>)[key] = value;
    }
  }
  const opts = { ...DEFAULT_OPTIONS, ...cleanOptions };

  // Get graph font settings
  if (graph.attributes.fontname) {
    opts.fontFamily = graph.attributes.fontname as string;
  }
  if (typeof graph.attributes.fontsize === 'number') {
    opts.fontSize = graph.attributes.fontsize;
  }

  // Calculate dimensions
  const bb = graph.boundingBox || { x: 0, y: 0, width: 100, height: 100 };
  const width = (opts.width || bb.width) * opts.scale + 2 * opts.padding;
  const height = (opts.height || bb.height) * opts.scale + 2 * opts.padding;

  const lines: string[] = [];

  // SVG header
  lines.push(`<?xml version="1.0" encoding="UTF-8"?>`);
  lines.push(`<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"`);
  lines.push(`     width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`);

  // Defs for arrow markers and gradients
  lines.push(`  <defs>`);
  lines.push(`    <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">`);
  lines.push(`      <polygon points="0 0, 10 3.5, 0 7" fill="currentColor"/>`);
  lines.push(`    </marker>`);
  lines.push(`    <marker id="arrowhead-inv" markerWidth="10" markerHeight="7" refX="1" refY="3.5" orient="auto">`);
  lines.push(`      <polygon points="10 0, 0 3.5, 10 7" fill="currentColor"/>`);
  lines.push(`    </marker>`);
  lines.push(`    <marker id="arrowhead-dot" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto">`);
  lines.push(`      <circle cx="4" cy="4" r="3" fill="currentColor"/>`);
  lines.push(`    </marker>`);
  lines.push(`    <marker id="arrowhead-odot" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto">`);
  lines.push(`      <circle cx="4" cy="4" r="3" fill="white" stroke="currentColor" stroke-width="1"/>`);
  lines.push(`    </marker>`);
  lines.push(`    <marker id="arrowhead-diamond" markerWidth="12" markerHeight="8" refX="6" refY="4" orient="auto">`);
  lines.push(`      <polygon points="0 4, 6 0, 12 4, 6 8" fill="currentColor"/>`);
  lines.push(`    </marker>`);
  lines.push(`    <marker id="arrowhead-odiamond" markerWidth="12" markerHeight="8" refX="6" refY="4" orient="auto">`);
  lines.push(`      <polygon points="0 4, 6 0, 12 4, 6 8" fill="white" stroke="currentColor" stroke-width="1"/>`);
  lines.push(`    </marker>`);
  lines.push(`    <marker id="arrowhead-box" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto">`);
  lines.push(`      <rect x="1" y="1" width="6" height="6" fill="currentColor"/>`);
  lines.push(`    </marker>`);
  lines.push(`    <marker id="arrowhead-obox" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto">`);
  lines.push(`      <rect x="1" y="1" width="6" height="6" fill="white" stroke="currentColor" stroke-width="1"/>`);
  lines.push(`    </marker>`);
  lines.push(`    <marker id="arrowhead-vee" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">`);
  lines.push(`      <polyline points="0 0, 10 3.5, 0 7" fill="none" stroke="currentColor" stroke-width="1"/>`);
  lines.push(`    </marker>`);
  lines.push(`    <marker id="arrowhead-tee" markerWidth="10" markerHeight="10" refX="5" refY="5" orient="auto">`);
  lines.push(`      <line x1="0" y1="0" x2="0" y2="10" stroke="currentColor" stroke-width="2"/>`);
  lines.push(`    </marker>`);
  lines.push(`    <marker id="arrowhead-crow" markerWidth="10" markerHeight="10" refX="10" refY="5" orient="auto">`);
  lines.push(`      <polyline points="0 0, 10 5, 0 10" fill="none" stroke="currentColor" stroke-width="1"/>`);
  lines.push(`      <line x1="5" y1="0" x2="5" y2="10" stroke="currentColor" stroke-width="1"/>`);
  lines.push(`    </marker>`);
  lines.push(`  </defs>`);

  // Background
  if (opts.background && opts.background !== 'transparent') {
    lines.push(`  <rect width="100%" height="100%" fill="${escapeXml(opts.background)}"/>`);
  } else if (graph.attributes.bgcolor) {
    lines.push(`  <rect width="100%" height="100%" fill="${escapeXml(graph.attributes.bgcolor as string)}"/>`);
  }

  // Main group with transform
  lines.push(`  <g transform="translate(${opts.padding}, ${opts.padding}) scale(${opts.scale})">`);

  // Render clusters (subgraphs)
  for (const [, subgraph] of graph.subgraphs) {
    if (subgraph.isCluster && subgraph.boundingBox) {
      lines.push(renderCluster(subgraph, opts));
    }
  }

  // Render edges first (below nodes)
  for (const edge of graph.edges) {
    lines.push(renderEdge(graph, edge, opts));
  }

  // Render nodes
  for (const [, node] of graph.nodes) {
    lines.push(renderNode(node, opts));
  }

  // Render graph label if present
  if (graph.attributes.label) {
    const labelY = graph.attributes.labelloc === 'b'
      ? (graph.boundingBox?.height || 100) - 10
      : 15;
    lines.push(`    <text x="${(graph.boundingBox?.width || 100) / 2}" y="${labelY}"`);
    lines.push(`          text-anchor="middle" font-family="${opts.fontFamily}"`);
    lines.push(`          font-size="${opts.fontSize}" fill="${graph.attributes.fontcolor || 'black'}">`);
    lines.push(`      ${escapeXml(graph.attributes.label as string)}`);
    lines.push(`    </text>`);
  }

  lines.push(`  </g>`);
  lines.push(`</svg>`);

  return lines.join('\n');
}

/**
 * Render a cluster (subgraph with cluster_ prefix)
 */
function renderCluster(
  subgraph: { id: string; attributes: Record<string, unknown>; boundingBox?: { x: number; y: number; width: number; height: number } },
  opts: Required<SVGRenderOptions>
): string {
  const bb = subgraph.boundingBox!;
  const lines: string[] = [];

  const style = subgraph.attributes.style as string || '';
  const color = subgraph.attributes.color as string || 'black';
  const fillcolor = subgraph.attributes.fillcolor as string;
  const penwidth = subgraph.attributes.penwidth as number || 1;
  const label = subgraph.attributes.label as string;

  const fill = style.includes('filled') ? (fillcolor || color) : 'none';
  const stroke = color;
  const strokeDasharray = style.includes('dashed') ? '5,5' : (style.includes('dotted') ? '2,2' : 'none');

  lines.push(`    <g class="cluster" id="${escapeXml(subgraph.id)}">`);
  lines.push(`      <rect x="${bb.x}" y="${bb.y}" width="${bb.width}" height="${bb.height}"`);
  lines.push(`            fill="${fill}" stroke="${stroke}" stroke-width="${penwidth}"`);
  if (strokeDasharray !== 'none') {
    lines.push(`            stroke-dasharray="${strokeDasharray}"`);
  }
  lines.push(`      />`);

  if (label) {
    const labelloc = subgraph.attributes.labelloc as string || 't';
    const labeljust = subgraph.attributes.labeljust as string || 'c';

    let labelX = bb.x + bb.width / 2;
    let labelY = labelloc === 'b' ? bb.y + bb.height - 5 : bb.y + 15;

    if (labeljust === 'l') {
      labelX = bb.x + 5;
    } else if (labeljust === 'r') {
      labelX = bb.x + bb.width - 5;
    }

    const textAnchor = labeljust === 'l' ? 'start' : (labeljust === 'r' ? 'end' : 'middle');

    lines.push(`      <text x="${labelX}" y="${labelY}" text-anchor="${textAnchor}"`);
    lines.push(`            font-family="${opts.fontFamily}" font-size="${opts.fontSize}">`);
    lines.push(`        ${escapeXml(label)}`);
    lines.push(`      </text>`);
  }

  lines.push(`    </g>`);

  return lines.join('\n');
}

/**
 * Render a node
 */
function renderNode(node: Node, opts: Required<SVGRenderOptions>): string {
  const x = node.x || 0;
  const y = node.y || 0;
  const width = node.width || 60;
  const height = node.height || 40;

  const shape = (node.attributes.shape || 'ellipse') as NodeShape;
  const label = (node.attributes.label !== undefined ? node.attributes.label : node.id) as string;
  const style = (node.attributes.style || '') as string;
  const color = (node.attributes.color || 'black') as string;
  const fillcolor = (node.attributes.fillcolor || (style.includes('filled') ? 'lightgrey' : 'none')) as string;
  const fontcolor = (node.attributes.fontcolor || 'black') as string;
  const fontname = (node.attributes.fontname || opts.fontFamily) as string;
  const fontsize = (node.attributes.fontsize || opts.fontSize) as number;
  const penwidth = (node.attributes.penwidth || 1) as number;

  const fill = style.includes('filled') || node.attributes.fillcolor ? fillcolor : 'none';
  const strokeDasharray = style.includes('dashed') ? '5,5' : (style.includes('dotted') ? '2,2' : 'none');

  const lines: string[] = [];

  // Start group
  const tooltip = node.attributes.tooltip as string;
  const url = (node.attributes.URL || node.attributes.href) as string;

  if (url) {
    lines.push(`    <a xlink:href="${escapeXml(url)}" target="${node.attributes.target || '_self'}">`);
  }

  lines.push(`    <g class="node" id="${escapeXml(node.id)}"${tooltip ? ` title="${escapeXml(tooltip)}"` : ''}>`);

  // Render shape
  lines.push(renderShape(shape, x, y, width, height, fill, color, penwidth, strokeDasharray, node.attributes));

  // Render label (not for point shape)
  if (shape !== 'point' && shape !== 'none' && label) {
    const labelLines = label.split('\\n');
    const lineHeight = fontsize * 1.2;
    const startY = y - ((labelLines.length - 1) * lineHeight) / 2;

    for (let i = 0; i < labelLines.length; i++) {
      lines.push(`      <text x="${x}" y="${startY + i * lineHeight + fontsize * 0.35}"`);
      lines.push(`            text-anchor="middle" font-family="${fontname}" font-size="${fontsize}"`);
      lines.push(`            fill="${fontcolor}">${escapeXml(labelLines[i])}</text>`);
    }
  }

  lines.push(`    </g>`);

  if (url) {
    lines.push(`    </a>`);
  }

  return lines.join('\n');
}

/**
 * Render a node shape
 */
function renderShape(
  shape: NodeShape,
  x: number,
  y: number,
  width: number,
  height: number,
  fill: string,
  stroke: string,
  strokeWidth: number,
  strokeDasharray: string,
  _attrs: Record<string, unknown>
): string {
  const dashAttr = strokeDasharray !== 'none' ? ` stroke-dasharray="${strokeDasharray}"` : '';

  switch (shape) {
    case 'box':
    case 'rect':
    case 'rectangle':
    case 'square':
      return `      <rect x="${x - width/2}" y="${y - height/2}" width="${width}" height="${height}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}"${dashAttr}/>`;

    case 'ellipse':
    case 'oval':
      return `      <ellipse cx="${x}" cy="${y}" rx="${width/2}" ry="${height/2}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}"${dashAttr}/>`;

    case 'circle':
      const r = Math.max(width, height) / 2;
      return `      <circle cx="${x}" cy="${y}" r="${r}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}"${dashAttr}/>`;

    case 'doublecircle': {
      const r1 = Math.max(width, height) / 2;
      const r2 = r1 - 5;
      return `      <circle cx="${x}" cy="${y}" r="${r1}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}"${dashAttr}/>
      <circle cx="${x}" cy="${y}" r="${r2}" fill="none" stroke="${stroke}" stroke-width="${strokeWidth}"${dashAttr}/>`;
    }

    case 'point':
      return `      <circle cx="${x}" cy="${y}" r="2" fill="${stroke}" stroke="none"/>`;

    case 'plaintext':
    case 'plain':
    case 'none':
      return ''; // No shape

    case 'diamond': {
      const hw = width / 2;
      const hh = height / 2;
      return `      <polygon points="${x},${y-hh} ${x+hw},${y} ${x},${y+hh} ${x-hw},${y}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}"${dashAttr}/>`;
    }

    case 'triangle': {
      const hw = width / 2;
      const hh = height / 2;
      return `      <polygon points="${x},${y-hh} ${x+hw},${y+hh} ${x-hw},${y+hh}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}"${dashAttr}/>`;
    }

    case 'invtriangle': {
      const hw = width / 2;
      const hh = height / 2;
      return `      <polygon points="${x-hw},${y-hh} ${x+hw},${y-hh} ${x},${y+hh}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}"${dashAttr}/>`;
    }

    case 'house': {
      const hw = width / 2;
      const hh = height / 2;
      const roofHeight = height * 0.3;
      return `      <polygon points="${x},${y-hh} ${x+hw},${y-hh+roofHeight} ${x+hw},${y+hh} ${x-hw},${y+hh} ${x-hw},${y-hh+roofHeight}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}"${dashAttr}/>`;
    }

    case 'invhouse': {
      const hw = width / 2;
      const hh = height / 2;
      const roofHeight = height * 0.3;
      return `      <polygon points="${x-hw},${y-hh} ${x+hw},${y-hh} ${x+hw},${y+hh-roofHeight} ${x},${y+hh} ${x-hw},${y+hh-roofHeight}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}"${dashAttr}/>`;
    }

    case 'trapezium': {
      const hw = width / 2;
      const hh = height / 2;
      const topWidth = width * 0.6;
      return `      <polygon points="${x-topWidth/2},${y-hh} ${x+topWidth/2},${y-hh} ${x+hw},${y+hh} ${x-hw},${y+hh}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}"${dashAttr}/>`;
    }

    case 'invtrapezium': {
      const hw = width / 2;
      const hh = height / 2;
      const bottomWidth = width * 0.6;
      return `      <polygon points="${x-hw},${y-hh} ${x+hw},${y-hh} ${x+bottomWidth/2},${y+hh} ${x-bottomWidth/2},${y+hh}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}"${dashAttr}/>`;
    }

    case 'parallelogram': {
      const hw = width / 2;
      const hh = height / 2;
      const skew = width * 0.2;
      return `      <polygon points="${x-hw+skew},${y-hh} ${x+hw+skew},${y-hh} ${x+hw-skew},${y+hh} ${x-hw-skew},${y+hh}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}"${dashAttr}/>`;
    }

    case 'pentagon': {
      const r = Math.max(width, height) / 2;
      const points = polygonPoints(x, y, r, 5, -Math.PI/2);
      return `      <polygon points="${points}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}"${dashAttr}/>`;
    }

    case 'hexagon': {
      const r = Math.max(width, height) / 2;
      const points = polygonPoints(x, y, r, 6, 0);
      return `      <polygon points="${points}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}"${dashAttr}/>`;
    }

    case 'septagon': {
      const r = Math.max(width, height) / 2;
      const points = polygonPoints(x, y, r, 7, -Math.PI/2);
      return `      <polygon points="${points}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}"${dashAttr}/>`;
    }

    case 'octagon': {
      const r = Math.max(width, height) / 2;
      const points = polygonPoints(x, y, r, 8, Math.PI/8);
      return `      <polygon points="${points}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}"${dashAttr}/>`;
    }

    case 'doubleoctagon': {
      const r1 = Math.max(width, height) / 2;
      const r2 = r1 - 5;
      const points1 = polygonPoints(x, y, r1, 8, Math.PI/8);
      const points2 = polygonPoints(x, y, r2, 8, Math.PI/8);
      return `      <polygon points="${points1}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}"${dashAttr}/>
      <polygon points="${points2}" fill="none" stroke="${stroke}" stroke-width="${strokeWidth}"${dashAttr}/>`;
    }

    case 'star': {
      const r = Math.max(width, height) / 2;
      const points = starPoints(x, y, r, r/2, 5);
      return `      <polygon points="${points}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}"${dashAttr}/>`;
    }

    case 'cylinder': {
      const hw = width / 2;
      const hh = height / 2;
      const ellipseHeight = height * 0.15;
      return `      <path d="M${x-hw},${y-hh+ellipseHeight}
        A${hw},${ellipseHeight} 0 0,1 ${x+hw},${y-hh+ellipseHeight}
        L${x+hw},${y+hh-ellipseHeight}
        A${hw},${ellipseHeight} 0 0,1 ${x-hw},${y+hh-ellipseHeight}
        Z" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}"${dashAttr}/>
      <ellipse cx="${x}" cy="${y-hh+ellipseHeight}" rx="${hw}" ry="${ellipseHeight}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}"${dashAttr}/>`;
    }

    case 'note': {
      const hw = width / 2;
      const hh = height / 2;
      const fold = Math.min(width, height) * 0.2;
      return `      <path d="M${x-hw},${y-hh} L${x+hw-fold},${y-hh} L${x+hw},${y-hh+fold} L${x+hw},${y+hh} L${x-hw},${y+hh} Z M${x+hw-fold},${y-hh} L${x+hw-fold},${y-hh+fold} L${x+hw},${y-hh+fold}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}"${dashAttr}/>`;
    }

    case 'folder': {
      const hw = width / 2;
      const hh = height / 2;
      const tabWidth = width * 0.3;
      const tabHeight = height * 0.15;
      return `      <path d="M${x-hw},${y-hh+tabHeight} L${x-hw},${y-hh} L${x-hw+tabWidth},${y-hh} L${x-hw+tabWidth+tabHeight},${y-hh+tabHeight} L${x+hw},${y-hh+tabHeight} L${x+hw},${y+hh} L${x-hw},${y+hh} Z" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}"${dashAttr}/>`;
    }

    case 'component': {
      const hw = width / 2;
      const hh = height / 2;
      const tabWidth = 10;
      const tabHeight = 5;
      const lines = [];
      lines.push(`      <rect x="${x-hw}" y="${y-hh}" width="${width}" height="${height}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}"${dashAttr}/>`);
      lines.push(`      <rect x="${x-hw-tabWidth/2}" y="${y-hh+height*0.25}" width="${tabWidth}" height="${tabHeight*2}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}"/>`);
      lines.push(`      <rect x="${x-hw-tabWidth/2}" y="${y+hh-height*0.25-tabHeight*2}" width="${tabWidth}" height="${tabHeight*2}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}"/>`);
      return lines.join('\n');
    }

    case 'Mdiamond': {
      const hw = width / 2;
      const hh = height / 2;
      return `      <polygon points="${x},${y-hh} ${x+hw},${y} ${x},${y+hh} ${x-hw},${y}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}"${dashAttr}/>
      <line x1="${x}" y1="${y-hh*0.5}" x2="${x}" y2="${y+hh*0.5}" stroke="${stroke}" stroke-width="${strokeWidth}"/>
      <line x1="${x-hw*0.5}" y1="${y}" x2="${x+hw*0.5}" y2="${y}" stroke="${stroke}" stroke-width="${strokeWidth}"/>`;
    }

    case 'Msquare': {
      const hw = width / 2;
      const hh = height / 2;
      return `      <rect x="${x-hw}" y="${y-hh}" width="${width}" height="${height}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}"${dashAttr}/>
      <line x1="${x}" y1="${y-hh}" x2="${x}" y2="${y+hh}" stroke="${stroke}" stroke-width="${strokeWidth}"/>
      <line x1="${x-hw}" y1="${y}" x2="${x+hw}" y2="${y}" stroke="${stroke}" stroke-width="${strokeWidth}"/>`;
    }

    case 'Mcircle': {
      const r = Math.max(width, height) / 2;
      return `      <circle cx="${x}" cy="${y}" r="${r}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}"${dashAttr}/>
      <line x1="${x}" y1="${y-r*0.7}" x2="${x}" y2="${y+r*0.7}" stroke="${stroke}" stroke-width="${strokeWidth}"/>
      <line x1="${x-r*0.7}" y1="${y}" x2="${x+r*0.7}" y2="${y}" stroke="${stroke}" stroke-width="${strokeWidth}"/>`;
    }

    default:
      // Default to ellipse
      return `      <ellipse cx="${x}" cy="${y}" rx="${width/2}" ry="${height/2}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}"${dashAttr}/>`;
  }
}

/**
 * Generate points for a regular polygon
 */
function polygonPoints(cx: number, cy: number, r: number, sides: number, startAngle: number = 0): string {
  const points: string[] = [];
  for (let i = 0; i < sides; i++) {
    const angle = startAngle + (2 * Math.PI * i) / sides;
    points.push(`${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`);
  }
  return points.join(' ');
}

/**
 * Generate points for a star
 */
function starPoints(cx: number, cy: number, outerR: number, innerR: number, points: number): string {
  const result: string[] = [];
  for (let i = 0; i < points * 2; i++) {
    const angle = -Math.PI/2 + (Math.PI * i) / points;
    const r = i % 2 === 0 ? outerR : innerR;
    result.push(`${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`);
  }
  return result.join(' ');
}

/**
 * Render an edge
 */
function renderEdge(graph: Graph, edge: Edge, opts: Required<SVGRenderOptions>): string {
  const lines: string[] = [];

  const style = (edge.attributes.style || '') as string;
  const color = (edge.attributes.color || 'black') as string;
  const penwidth = (edge.attributes.penwidth || 1) as number;
  const fontcolor = (edge.attributes.fontcolor || color) as string;
  const fontname = (edge.attributes.fontname || opts.fontFamily) as string;
  const fontsize = (edge.attributes.fontsize || opts.fontSize) as number;

  const strokeDasharray = style.includes('dashed') ? '5,5' : (style.includes('dotted') ? '2,2' : 'none');
  const dashAttr = strokeDasharray !== 'none' ? ` stroke-dasharray="${strokeDasharray}"` : '';

  // Determine arrow markers
  const dir = (edge.attributes.dir || (graph.type === 'digraph' ? 'forward' : 'none')) as string;
  const arrowhead = (edge.attributes.arrowhead || 'normal') as ArrowType;
  const arrowtail = (edge.attributes.arrowtail || 'normal') as ArrowType;

  let markerEnd = '';
  let markerStart = '';

  if (dir === 'forward' || dir === 'both') {
    markerEnd = ` marker-end="url(#${getArrowMarkerId(arrowhead)})"`;
  }
  if (dir === 'back' || dir === 'both') {
    markerStart = ` marker-start="url(#${getArrowMarkerId(arrowtail)})"`;
  }

  const tooltip = edge.attributes.tooltip as string;
  const url = (edge.attributes.URL || edge.attributes.href) as string;

  if (url) {
    lines.push(`    <a xlink:href="${escapeXml(url)}" target="${edge.attributes.target || '_self'}">`);
  }

  lines.push(`    <g class="edge" id="${escapeXml(edge.id)}"${tooltip ? ` title="${escapeXml(tooltip)}"` : ''}>`);

  // Render edge path
  if (edge.splines && edge.splines.length > 0) {
    const path = splinesToPath(edge.splines);
    lines.push(`      <path d="${path}" fill="none" stroke="${color}" stroke-width="${penwidth}"${dashAttr}${markerEnd}${markerStart}/>`);
  } else if (edge.points && edge.points.length >= 2) {
    const path = pointsToPath(edge.points);
    lines.push(`      <path d="${path}" fill="none" stroke="${color}" stroke-width="${penwidth}"${dashAttr}${markerEnd}${markerStart}/>`);
  }

  // Render edge label
  const label = edge.attributes.label as string;
  if (label) {
    const labelPos = edge.labelPos || calculateLabelPosition(edge);
    lines.push(`      <text x="${labelPos.x}" y="${labelPos.y}" text-anchor="middle"`);
    lines.push(`            font-family="${fontname}" font-size="${fontsize}" fill="${fontcolor}">`);
    lines.push(`        ${escapeXml(label)}`);
    lines.push(`      </text>`);
  }

  lines.push(`    </g>`);

  if (url) {
    lines.push(`    </a>`);
  }

  return lines.join('\n');
}

/**
 * Get the marker ID for an arrow type
 */
function getArrowMarkerId(type: ArrowType): string {
  switch (type) {
    case 'none': return '';
    case 'inv': return 'arrowhead-inv';
    case 'dot': return 'arrowhead-dot';
    case 'odot': return 'arrowhead-odot';
    case 'diamond': return 'arrowhead-diamond';
    case 'odiamond': return 'arrowhead-odiamond';
    case 'box': return 'arrowhead-box';
    case 'obox': return 'arrowhead-obox';
    case 'vee': return 'arrowhead-vee';
    case 'tee': return 'arrowhead-tee';
    case 'crow': return 'arrowhead-crow';
    default: return 'arrowhead';
  }
}

/**
 * Convert bezier splines to SVG path
 */
function splinesToPath(splines: Bezier[]): string {
  if (splines.length === 0) return '';

  const parts: string[] = [];
  parts.push(`M${splines[0].start.x},${splines[0].start.y}`);

  for (const spline of splines) {
    parts.push(`C${spline.cp1.x},${spline.cp1.y} ${spline.cp2.x},${spline.cp2.y} ${spline.end.x},${spline.end.y}`);
  }

  return parts.join(' ');
}

/**
 * Convert points to SVG path (polyline)
 */
function pointsToPath(points: Point[]): string {
  if (points.length === 0) return '';

  const parts: string[] = [];
  parts.push(`M${points[0].x},${points[0].y}`);

  for (let i = 1; i < points.length; i++) {
    parts.push(`L${points[i].x},${points[i].y}`);
  }

  return parts.join(' ');
}

/**
 * Calculate label position for an edge (midpoint)
 */
function calculateLabelPosition(edge: Edge): Point {
  if (edge.splines && edge.splines.length > 0) {
    // Use middle of middle spline
    const midSpline = edge.splines[Math.floor(edge.splines.length / 2)];
    return {
      x: (midSpline.start.x + midSpline.end.x) / 2,
      y: (midSpline.start.y + midSpline.end.y) / 2 - 10,
    };
  }

  if (edge.points && edge.points.length >= 2) {
    const midIndex = Math.floor(edge.points.length / 2);
    return {
      x: edge.points[midIndex].x,
      y: edge.points[midIndex].y - 10,
    };
  }

  return { x: 0, y: 0 };
}

/**
 * Escape XML special characters
 */
function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
