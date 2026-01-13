/**
 * Hierarchical Layout Engine (dot-like)
 *
 * Implements a simplified version of the Sugiyama algorithm:
 * 1. Cycle removal - break cycles by reversing edges
 * 2. Rank assignment - assign nodes to horizontal layers
 * 3. Ordering - minimize edge crossings within ranks
 * 4. Position assignment - assign x-coordinates
 * 5. Edge routing - compute edge paths
 */
import { Graph } from '../core/types';
export interface HierarchicalLayoutOptions {
    rankdir?: 'TB' | 'BT' | 'LR' | 'RL';
    ranksep?: number;
    nodesep?: number;
    marginx?: number;
    marginy?: number;
}
/**
 * Apply hierarchical layout to a graph
 */
export declare function hierarchicalLayout(graph: Graph, options?: HierarchicalLayoutOptions): Graph;
//# sourceMappingURL=hierarchical.d.ts.map