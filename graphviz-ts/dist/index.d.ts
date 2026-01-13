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
export * from './core/types';
export { createGraph, addNode, addEdge, addSubgraph, addNodeToSubgraph, getEdgesForNode, getNeighbors, getPredecessors, getSuccessors, getInDegree, getOutDegree, getDegree, getSourceNodes, getSinkNodes, hasCycle, topologicalSort, calculateBoundingBox, cloneGraph, } from './core/graph';
export { parse, Parser, ParseResult, ParseError, Lexer, Token, TokenType } from './parser';
export { layout, hierarchicalLayout, forceDirectedLayout, circularLayout, radialLayout, HierarchicalLayoutOptions, ForceDirectedLayoutOptions, } from './layout';
export { render, renderSVG, renderJSON, parseJSON, SVGRenderOptions, JSONRenderOptions, JSONGraph, JSONNode, JSONEdge, JSONSubgraph, } from './render';
import { Graph, LayoutEngine, LayoutOptions, RenderOptions, OutputFormat } from './core/types';
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
export declare class Graphviz {
    private graph;
    private layoutGraph;
    private options;
    constructor(options?: GraphvizOptions);
    /**
     * Parse a DOT string and store the graph
     */
    parse(dot: string): this;
    /**
     * Apply layout to the parsed graph
     */
    layout(options?: LayoutOptions): this;
    /**
     * Render the graph to the specified format
     */
    render(options?: RenderOptions): string;
    /**
     * Get the underlying graph object
     */
    getGraph(): Graph | null;
    /**
     * Set options
     */
    setOptions(options: GraphvizOptions): this;
    /**
     * Quick render: parse DOT and render to SVG using hierarchical layout
     */
    static dot(dot: string, options?: GraphvizOptions): string;
    /**
     * Quick render: parse DOT and render to SVG using force-directed layout
     */
    static neato(dot: string, options?: GraphvizOptions): string;
    /**
     * Quick render: parse DOT and render to SVG using force-directed layout (fdp)
     */
    static fdp(dot: string, options?: GraphvizOptions): string;
    /**
     * Quick render: parse DOT and render to SVG using circular layout
     */
    static circo(dot: string, options?: GraphvizOptions): string;
    /**
     * Quick render: parse DOT and render to SVG using radial layout
     */
    static twopi(dot: string, options?: GraphvizOptions): string;
    /**
     * Render DOT to SVG with auto-detected layout engine
     */
    static render(dot: string, options?: GraphvizOptions): string;
    /**
     * Parse DOT and return JSON representation
     */
    static toJSON(dot: string, options?: GraphvizOptions): string;
    /**
     * Parse DOT string only (no layout)
     */
    static parse(dot: string): Graph;
}
export default Graphviz;
//# sourceMappingURL=index.d.ts.map