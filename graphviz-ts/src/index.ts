/**
 * graphviz-ts
 *
 * A modern TypeScript graph visualization library.
 * Runs in both browser and Node.js with zero dependencies.
 *
 * @example
 * ```typescript
 * import { Graphviz } from 'graphviz-ts';
 *
 * const dot = `
 *   digraph G {
 *     A -> B -> C;
 *     B -> D;
 *   }
 * `;
 *
 * const svg = Graphviz.dot(dot);
 * document.body.innerHTML = svg;
 * ```
 */

// Re-export types
export * from './core/types';

// Re-export core functions
export {
  createGraph,
  addNode,
  addEdge,
  addSubgraph,
  addNodeToSubgraph,
  getEdgesForNode,
  getNeighbors,
  getPredecessors,
  getSuccessors,
  getInDegree,
  getOutDegree,
  getDegree,
  getSourceNodes,
  getSinkNodes,
  hasCycle,
  topologicalSort,
  calculateBoundingBox,
  cloneGraph,
} from './core/graph';

// Re-export parser
export { parse, Parser, ParseResult, ParseError, Lexer, Token, TokenType } from './parser';

// Re-export layout engines
export {
  layout,
  hierarchicalLayout,
  forceDirectedLayout,
  circularLayout,
  radialLayout,
  HierarchicalLayoutOptions,
  ForceDirectedLayoutOptions,
} from './layout';

// Re-export renderers
export {
  render,
  renderSVG,
  renderJSON,
  parseJSON,
  SVGRenderOptions,
  JSONRenderOptions,
  JSONGraph,
  JSONNode,
  JSONEdge,
  JSONSubgraph,
} from './render';

import { Graph, LayoutEngine, LayoutOptions, RenderOptions, OutputFormat } from './core/types';
import { parse } from './parser';
import { layout } from './layout';
import { render } from './render';

/**
 * Options for the Graphviz class
 */
export interface GraphvizOptions extends LayoutOptions, RenderOptions {
  engine?: LayoutEngine;
  format?: OutputFormat;
}

/**
 * Main Graphviz class providing a simple API for graph visualization
 */
export class Graphviz {
  private graph: Graph | null = null;
  private layoutGraph: Graph | null = null;
  private options: GraphvizOptions;

  constructor(options: GraphvizOptions = {}) {
    this.options = options;
  }

  /**
   * Parse a DOT string and store the graph
   */
  parse(dot: string): this {
    const result = parse(dot);
    if (result.errors.length > 0) {
      const errorMessages = result.errors
        .map((e) => `Line ${e.line}:${e.column}: ${e.message}`)
        .join('\n');
      throw new Error(`Parse errors:\n${errorMessages}`);
    }
    if (!result.graph) {
      throw new Error('Failed to parse DOT string');
    }
    this.graph = result.graph;
    this.layoutGraph = null;
    return this;
  }

  /**
   * Apply layout to the parsed graph
   */
  layout(options?: LayoutOptions): this {
    if (!this.graph) {
      throw new Error('No graph parsed. Call parse() first.');
    }
    const opts = { ...this.options, ...options };
    this.layoutGraph = layout(this.graph, opts);
    return this;
  }

  /**
   * Render the graph to the specified format
   */
  render(options?: RenderOptions): string {
    const graphToRender = this.layoutGraph || this.graph;
    if (!graphToRender) {
      throw new Error('No graph to render. Call parse() first.');
    }

    // Auto-layout if not done yet
    if (!this.layoutGraph) {
      this.layout();
    }

    const opts = { ...this.options, ...options };
    const result = render(this.layoutGraph!, opts);
    return result.output;
  }

  /**
   * Get the underlying graph object
   */
  getGraph(): Graph | null {
    return this.layoutGraph || this.graph;
  }

  /**
   * Set options
   */
  setOptions(options: GraphvizOptions): this {
    this.options = { ...this.options, ...options };
    return this;
  }

  // ============================================================================
  // Static convenience methods
  // ============================================================================

  /**
   * Quick render: parse DOT and render to SVG using hierarchical layout
   */
  static dot(dot: string, options?: GraphvizOptions): string {
    return new Graphviz({ engine: 'dot', ...options })
      .parse(dot)
      .layout()
      .render();
  }

  /**
   * Quick render: parse DOT and render to SVG using force-directed layout
   */
  static neato(dot: string, options?: GraphvizOptions): string {
    return new Graphviz({ engine: 'neato', ...options })
      .parse(dot)
      .layout()
      .render();
  }

  /**
   * Quick render: parse DOT and render to SVG using force-directed layout (fdp)
   */
  static fdp(dot: string, options?: GraphvizOptions): string {
    return new Graphviz({ engine: 'fdp', ...options })
      .parse(dot)
      .layout()
      .render();
  }

  /**
   * Quick render: parse DOT and render to SVG using circular layout
   */
  static circo(dot: string, options?: GraphvizOptions): string {
    return new Graphviz({ engine: 'circo', ...options })
      .parse(dot)
      .layout()
      .render();
  }

  /**
   * Quick render: parse DOT and render to SVG using radial layout
   */
  static twopi(dot: string, options?: GraphvizOptions): string {
    return new Graphviz({ engine: 'twopi', ...options })
      .parse(dot)
      .layout()
      .render();
  }

  /**
   * Render DOT to SVG with auto-detected layout engine
   */
  static render(dot: string, options?: GraphvizOptions): string {
    return new Graphviz(options)
      .parse(dot)
      .layout()
      .render();
  }

  /**
   * Parse DOT and return JSON representation
   */
  static toJSON(dot: string, options?: GraphvizOptions): string {
    return new Graphviz({ ...options, format: 'json' })
      .parse(dot)
      .layout()
      .render();
  }

  /**
   * Parse DOT string only (no layout)
   */
  static parse(dot: string): Graph {
    const result = parse(dot);
    if (result.errors.length > 0 || !result.graph) {
      throw new Error('Failed to parse DOT string');
    }
    return result.graph;
  }
}

// Default export
export default Graphviz;
