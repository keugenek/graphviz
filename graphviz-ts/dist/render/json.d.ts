/**
 * JSON Renderer
 *
 * Exports a laid-out graph to a JSON format suitable for further processing.
 */
import { Graph, Point, Bezier, BoundingBox } from '../core/types';
export interface JSONRenderOptions {
    pretty?: boolean;
    includeDefaults?: boolean;
}
export interface JSONGraph {
    id: string;
    type: 'graph' | 'digraph';
    strict: boolean;
    attributes: Record<string, unknown>;
    boundingBox?: BoundingBox;
    nodes: JSONNode[];
    edges: JSONEdge[];
    subgraphs: JSONSubgraph[];
}
export interface JSONNode {
    id: string;
    attributes: Record<string, unknown>;
    x?: number;
    y?: number;
    width?: number;
    height?: number;
}
export interface JSONEdge {
    id: string;
    source: string;
    target: string;
    attributes: Record<string, unknown>;
    points?: Point[];
    splines?: Bezier[];
    labelPos?: Point;
}
export interface JSONSubgraph {
    id: string;
    isCluster: boolean;
    attributes: Record<string, unknown>;
    nodes: string[];
    boundingBox?: BoundingBox;
}
/**
 * Render a graph to JSON
 */
export declare function renderJSON(graph: Graph, options?: JSONRenderOptions): string;
/**
 * Parse JSON back into a Graph
 */
export declare function parseJSON(json: string): Graph;
//# sourceMappingURL=json.d.ts.map