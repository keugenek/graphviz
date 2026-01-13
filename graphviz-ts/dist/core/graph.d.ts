/**
 * Graph data structure implementation
 */
import { Graph, Node, Edge, Subgraph, GraphType, GraphAttributes, NodeAttributes, EdgeAttributes, BoundingBox } from './types';
/**
 * Create a new empty graph
 */
export declare function createGraph(id?: string, type?: GraphType, strict?: boolean): Graph;
/**
 * Add a node to the graph
 */
export declare function addNode(graph: Graph, id: string, attributes?: NodeAttributes): Node;
/**
 * Add an edge to the graph
 */
export declare function addEdge(graph: Graph, source: string, target: string, attributes?: EdgeAttributes): Edge;
/**
 * Add a subgraph (cluster) to the graph
 */
export declare function addSubgraph(graph: Graph, id: string, attributes?: GraphAttributes): Subgraph;
/**
 * Add a node to a subgraph
 */
export declare function addNodeToSubgraph(graph: Graph, subgraphId: string, nodeId: string): void;
/**
 * Get all edges connected to a node
 */
export declare function getEdgesForNode(graph: Graph, nodeId: string): {
    incoming: Edge[];
    outgoing: Edge[];
};
/**
 * Get adjacent nodes (neighbors)
 */
export declare function getNeighbors(graph: Graph, nodeId: string): string[];
/**
 * Get all predecessor nodes (nodes with edges pointing to this node)
 */
export declare function getPredecessors(graph: Graph, nodeId: string): string[];
/**
 * Get all successor nodes (nodes this node points to)
 */
export declare function getSuccessors(graph: Graph, nodeId: string): string[];
/**
 * Get the in-degree of a node (number of edges pointing to it)
 */
export declare function getInDegree(graph: Graph, nodeId: string): number;
/**
 * Get the out-degree of a node (number of edges from it)
 */
export declare function getOutDegree(graph: Graph, nodeId: string): number;
/**
 * Get the degree of a node (total edges)
 */
export declare function getDegree(graph: Graph, nodeId: string): number;
/**
 * Find nodes with no incoming edges (source nodes)
 */
export declare function getSourceNodes(graph: Graph): string[];
/**
 * Find nodes with no outgoing edges (sink nodes)
 */
export declare function getSinkNodes(graph: Graph): string[];
/**
 * Check if the graph contains a cycle
 */
export declare function hasCycle(graph: Graph): boolean;
/**
 * Topological sort (returns null if graph has cycle)
 */
export declare function topologicalSort(graph: Graph): string[] | null;
/**
 * Calculate the bounding box of all nodes
 */
export declare function calculateBoundingBox(graph: Graph): BoundingBox;
/**
 * Clone a graph (deep copy)
 */
export declare function cloneGraph(graph: Graph): Graph;
//# sourceMappingURL=graph.d.ts.map