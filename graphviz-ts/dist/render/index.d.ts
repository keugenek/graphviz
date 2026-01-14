/**
 * Render module - Graph rendering to various formats
 */
import { Graph, RenderOptions, RenderResult } from '../core/types';
export { renderSVG, SVGRenderOptions } from './svg';
export { renderJSON, JSONRenderOptions, parseJSON, JSONGraph, JSONNode, JSONEdge, JSONSubgraph } from './json';
/**
 * Render a graph to the specified format
 */
export declare function render(graph: Graph, options?: RenderOptions): RenderResult;
//# sourceMappingURL=index.d.ts.map