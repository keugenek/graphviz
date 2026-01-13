/**
 * Force-Directed Layout Engine (neato/fdp-like)
 *
 * Implements the Fruchterman-Reingold force-directed algorithm:
 * - Repulsive forces between all node pairs (inversely proportional to distance)
 * - Attractive forces along edges (proportional to distance)
 * - Iterative simulation with cooling
 */
import { Graph } from '../core/types';
export interface ForceDirectedLayoutOptions {
    iterations?: number;
    cooling?: number;
    optimalDistance?: number;
    gravity?: number;
    margin?: number;
}
/**
 * Apply force-directed layout to a graph
 */
export declare function forceDirectedLayout(graph: Graph, options?: ForceDirectedLayoutOptions): Graph;
/**
 * Circular layout - place nodes in a circle
 */
export declare function circularLayout(graph: Graph, options?: {
    radius?: number;
    margin?: number;
}): Graph;
/**
 * Radial layout - place nodes in concentric circles based on distance from root
 */
export declare function radialLayout(graph: Graph, options?: {
    root?: string;
    levelSep?: number;
    margin?: number;
}): Graph;
//# sourceMappingURL=force-directed.d.ts.map