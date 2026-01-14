/**
 * Graph data structure implementation
 */

import {
  Graph,
  Node,
  Edge,
  Subgraph,
  GraphType,
  GraphAttributes,
  NodeAttributes,
  EdgeAttributes,
  BoundingBox,
} from './types';

/**
 * Create a new empty graph
 */
export function createGraph(
  id: string = 'G',
  type: GraphType = 'digraph',
  strict: boolean = false
): Graph {
  return {
    id,
    type,
    strict,
    attributes: {},
    nodes: new Map(),
    edges: [],
    subgraphs: new Map(),
    nodeDefaults: {},
    edgeDefaults: {},
  };
}

/**
 * Add a node to the graph
 */
export function addNode(
  graph: Graph,
  id: string,
  attributes: NodeAttributes = {}
): Node {
  const existing = graph.nodes.get(id);
  if (existing) {
    // Merge attributes
    Object.assign(existing.attributes, attributes);
    return existing;
  }

  const node: Node = {
    id,
    attributes: { ...graph.nodeDefaults, ...attributes },
  };
  graph.nodes.set(id, node);
  return node;
}

/**
 * Add an edge to the graph
 */
export function addEdge(
  graph: Graph,
  source: string,
  target: string,
  attributes: EdgeAttributes = {}
): Edge {
  // Auto-create nodes if they don't exist
  if (!graph.nodes.has(source)) {
    addNode(graph, source);
  }
  if (!graph.nodes.has(target)) {
    addNode(graph, target);
  }

  // Check for strict mode (no duplicates)
  if (graph.strict) {
    const existing = graph.edges.find(
      (e) => e.source === source && e.target === target
    );
    if (existing) {
      // Merge attributes
      Object.assign(existing.attributes, attributes);
      return existing;
    }
  }

  const id = `${source}->${target}:${graph.edges.length}`;
  const edge: Edge = {
    id,
    source,
    target,
    attributes: { ...graph.edgeDefaults, ...attributes },
  };
  graph.edges.push(edge);
  return edge;
}

/**
 * Add a subgraph (cluster) to the graph
 */
export function addSubgraph(
  graph: Graph,
  id: string,
  attributes: GraphAttributes = {}
): Subgraph {
  const existing = graph.subgraphs.get(id);
  if (existing) {
    Object.assign(existing.attributes, attributes);
    return existing;
  }

  const isCluster = id.startsWith('cluster');
  const subgraph: Subgraph = {
    id,
    isCluster,
    attributes,
    nodes: [],
    edges: [],
    subgraphs: [],
  };
  graph.subgraphs.set(id, subgraph);
  return subgraph;
}

/**
 * Add a node to a subgraph
 */
export function addNodeToSubgraph(
  graph: Graph,
  subgraphId: string,
  nodeId: string
): void {
  const subgraph = graph.subgraphs.get(subgraphId);
  if (subgraph && !subgraph.nodes.includes(nodeId)) {
    subgraph.nodes.push(nodeId);
  }
}

/**
 * Get all edges connected to a node
 */
export function getEdgesForNode(
  graph: Graph,
  nodeId: string
): { incoming: Edge[]; outgoing: Edge[] } {
  const incoming = graph.edges.filter((e) => e.target === nodeId);
  const outgoing = graph.edges.filter((e) => e.source === nodeId);
  return { incoming, outgoing };
}

/**
 * Get adjacent nodes (neighbors)
 */
export function getNeighbors(graph: Graph, nodeId: string): string[] {
  const neighbors = new Set<string>();
  for (const edge of graph.edges) {
    if (edge.source === nodeId) {
      neighbors.add(edge.target);
    }
    if (graph.type === 'graph' || edge.target === nodeId) {
      if (edge.target === nodeId) {
        neighbors.add(edge.source);
      }
    }
  }
  return Array.from(neighbors);
}

/**
 * Get all predecessor nodes (nodes with edges pointing to this node)
 */
export function getPredecessors(graph: Graph, nodeId: string): string[] {
  return graph.edges
    .filter((e) => e.target === nodeId)
    .map((e) => e.source);
}

/**
 * Get all successor nodes (nodes this node points to)
 */
export function getSuccessors(graph: Graph, nodeId: string): string[] {
  return graph.edges
    .filter((e) => e.source === nodeId)
    .map((e) => e.target);
}

/**
 * Get the in-degree of a node (number of edges pointing to it)
 */
export function getInDegree(graph: Graph, nodeId: string): number {
  return graph.edges.filter((e) => e.target === nodeId).length;
}

/**
 * Get the out-degree of a node (number of edges from it)
 */
export function getOutDegree(graph: Graph, nodeId: string): number {
  return graph.edges.filter((e) => e.source === nodeId).length;
}

/**
 * Get the degree of a node (total edges)
 */
export function getDegree(graph: Graph, nodeId: string): number {
  if (graph.type === 'digraph') {
    return getInDegree(graph, nodeId) + getOutDegree(graph, nodeId);
  }
  // For undirected graphs, count each edge once
  return graph.edges.filter(
    (e) => e.source === nodeId || e.target === nodeId
  ).length;
}

/**
 * Find nodes with no incoming edges (source nodes)
 */
export function getSourceNodes(graph: Graph): string[] {
  const hasIncoming = new Set<string>();
  for (const edge of graph.edges) {
    hasIncoming.add(edge.target);
  }
  return Array.from(graph.nodes.keys()).filter((id) => !hasIncoming.has(id));
}

/**
 * Find nodes with no outgoing edges (sink nodes)
 */
export function getSinkNodes(graph: Graph): string[] {
  const hasOutgoing = new Set<string>();
  for (const edge of graph.edges) {
    hasOutgoing.add(edge.source);
  }
  return Array.from(graph.nodes.keys()).filter((id) => !hasOutgoing.has(id));
}

/**
 * Check if the graph contains a cycle
 */
export function hasCycle(graph: Graph): boolean {
  const visited = new Set<string>();
  const recStack = new Set<string>();

  function dfs(nodeId: string): boolean {
    visited.add(nodeId);
    recStack.add(nodeId);

    for (const successor of getSuccessors(graph, nodeId)) {
      if (!visited.has(successor)) {
        if (dfs(successor)) return true;
      } else if (recStack.has(successor)) {
        return true;
      }
    }

    recStack.delete(nodeId);
    return false;
  }

  for (const nodeId of graph.nodes.keys()) {
    if (!visited.has(nodeId)) {
      if (dfs(nodeId)) return true;
    }
  }

  return false;
}

/**
 * Topological sort (returns null if graph has cycle)
 */
export function topologicalSort(graph: Graph): string[] | null {
  const result: string[] = [];
  const visited = new Set<string>();
  const temp = new Set<string>();

  function visit(nodeId: string): boolean {
    if (temp.has(nodeId)) return false; // Cycle detected
    if (visited.has(nodeId)) return true;

    temp.add(nodeId);

    for (const successor of getSuccessors(graph, nodeId)) {
      if (!visit(successor)) return false;
    }

    temp.delete(nodeId);
    visited.add(nodeId);
    result.unshift(nodeId);
    return true;
  }

  for (const nodeId of graph.nodes.keys()) {
    if (!visited.has(nodeId)) {
      if (!visit(nodeId)) return null;
    }
  }

  return result;
}

/**
 * Calculate the bounding box of all nodes
 */
export function calculateBoundingBox(graph: Graph): BoundingBox {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const node of graph.nodes.values()) {
    if (node.x !== undefined && node.y !== undefined) {
      const halfWidth = (node.width || 0) / 2;
      const halfHeight = (node.height || 0) / 2;
      minX = Math.min(minX, node.x - halfWidth);
      minY = Math.min(minY, node.y - halfHeight);
      maxX = Math.max(maxX, node.x + halfWidth);
      maxY = Math.max(maxY, node.y + halfHeight);
    }
  }

  if (minX === Infinity) {
    return { x: 0, y: 0, width: 0, height: 0 };
  }

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

/**
 * Clone a graph (deep copy)
 */
export function cloneGraph(graph: Graph): Graph {
  const clone = createGraph(graph.id, graph.type, graph.strict);
  clone.attributes = { ...graph.attributes };
  clone.nodeDefaults = { ...graph.nodeDefaults };
  clone.edgeDefaults = { ...graph.edgeDefaults };

  for (const [id, node] of graph.nodes) {
    clone.nodes.set(id, {
      ...node,
      attributes: { ...node.attributes },
    });
  }

  clone.edges = graph.edges.map((edge) => ({
    ...edge,
    attributes: { ...edge.attributes },
    points: edge.points ? [...edge.points] : undefined,
    splines: edge.splines ? [...edge.splines] : undefined,
  }));

  for (const [id, subgraph] of graph.subgraphs) {
    clone.subgraphs.set(id, {
      ...subgraph,
      attributes: { ...subgraph.attributes },
      nodes: [...subgraph.nodes],
      edges: [...subgraph.edges],
      subgraphs: [...subgraph.subgraphs],
    });
  }

  return clone;
}
