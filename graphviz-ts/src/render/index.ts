/**
 * Render module - Graph rendering to various formats
 */

import { Graph, RenderOptions, RenderResult } from '../core/types';
import { renderSVG } from './svg';
import { renderJSON } from './json';

export { renderSVG, SVGRenderOptions } from './svg';
export { renderJSON, JSONRenderOptions, parseJSON, JSONGraph, JSONNode, JSONEdge, JSONSubgraph } from './json';

/**
 * Render a graph to the specified format
 */
export function render(graph: Graph, options: RenderOptions = {}): RenderResult {
  const format = options.format || 'svg';

  switch (format) {
    case 'svg':
      const svgOutput = renderSVG(graph, {
        width: options.width,
        height: options.height,
        scale: options.scale,
        padding: options.padding,
        background: options.background,
      });
      return {
        output: svgOutput,
        width: graph.boundingBox?.width || 0,
        height: graph.boundingBox?.height || 0,
      };

    case 'json':
      const jsonOutput = renderJSON(graph, { pretty: true });
      return {
        output: jsonOutput,
        width: graph.boundingBox?.width || 0,
        height: graph.boundingBox?.height || 0,
      };

    case 'xdot':
      // XDot is essentially JSON with specific format
      const xdotOutput = renderJSON(graph, { pretty: true, includeDefaults: true });
      return {
        output: xdotOutput,
        width: graph.boundingBox?.width || 0,
        height: graph.boundingBox?.height || 0,
      };

    default:
      throw new Error(`Unsupported output format: ${format}`);
  }
}
