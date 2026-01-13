/**
 * JSON Renderer
 *
 * Exports a laid-out graph to a JSON format suitable for further processing.
 */

import { Graph, Node, Edge, Point, Bezier, BoundingBox } from '../core/types';

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
export function renderJSON(graph: Graph, options: JSONRenderOptions = {}): string {
  const output: JSONGraph = {
    id: graph.id,
    type: graph.type,
    strict: graph.strict,
    attributes: { ...graph.attributes },
    boundingBox: graph.boundingBox,
    nodes: [],
    edges: [],
    subgraphs: [],
  };

  // Include defaults if requested
  if (options.includeDefaults) {
    output.attributes = {
      ...output.attributes,
      nodeDefaults: { ...graph.nodeDefaults },
      edgeDefaults: { ...graph.edgeDefaults },
    };
  }

  // Convert nodes
  for (const [id, node] of graph.nodes) {
    const jsonNode: JSONNode = {
      id,
      attributes: { ...node.attributes },
    };

    if (node.x !== undefined) jsonNode.x = node.x;
    if (node.y !== undefined) jsonNode.y = node.y;
    if (node.width !== undefined) jsonNode.width = node.width;
    if (node.height !== undefined) jsonNode.height = node.height;

    output.nodes.push(jsonNode);
  }

  // Convert edges
  for (const edge of graph.edges) {
    const jsonEdge: JSONEdge = {
      id: edge.id,
      source: edge.source,
      target: edge.target,
      attributes: { ...edge.attributes },
    };

    if (edge.points) jsonEdge.points = edge.points;
    if (edge.splines) jsonEdge.splines = edge.splines;
    if (edge.labelPos) jsonEdge.labelPos = edge.labelPos;

    output.edges.push(jsonEdge);
  }

  // Convert subgraphs
  for (const [id, subgraph] of graph.subgraphs) {
    output.subgraphs.push({
      id,
      isCluster: subgraph.isCluster,
      attributes: { ...subgraph.attributes },
      nodes: [...subgraph.nodes],
      boundingBox: subgraph.boundingBox,
    });
  }

  return options.pretty
    ? JSON.stringify(output, null, 2)
    : JSON.stringify(output);
}

/**
 * Parse JSON back into a Graph
 */
export function parseJSON(json: string): Graph {
  const data = JSON.parse(json) as JSONGraph;

  const graph: Graph = {
    id: data.id,
    type: data.type,
    strict: data.strict,
    attributes: data.attributes || {},
    nodes: new Map(),
    edges: [],
    subgraphs: new Map(),
    nodeDefaults: {},
    edgeDefaults: {},
    boundingBox: data.boundingBox,
  };

  // Extract defaults if present
  if (graph.attributes.nodeDefaults) {
    graph.nodeDefaults = graph.attributes.nodeDefaults as Record<string, unknown>;
    delete graph.attributes.nodeDefaults;
  }
  if (graph.attributes.edgeDefaults) {
    graph.edgeDefaults = graph.attributes.edgeDefaults as Record<string, unknown>;
    delete graph.attributes.edgeDefaults;
  }

  // Convert nodes
  for (const jsonNode of data.nodes) {
    const node: Node = {
      id: jsonNode.id,
      attributes: jsonNode.attributes || {},
      x: jsonNode.x,
      y: jsonNode.y,
      width: jsonNode.width,
      height: jsonNode.height,
    };
    graph.nodes.set(jsonNode.id, node);
  }

  // Convert edges
  for (const jsonEdge of data.edges) {
    const edge: Edge = {
      id: jsonEdge.id,
      source: jsonEdge.source,
      target: jsonEdge.target,
      attributes: jsonEdge.attributes || {},
      points: jsonEdge.points,
      splines: jsonEdge.splines,
      labelPos: jsonEdge.labelPos,
    };
    graph.edges.push(edge);
  }

  // Convert subgraphs
  for (const jsonSubgraph of data.subgraphs) {
    graph.subgraphs.set(jsonSubgraph.id, {
      id: jsonSubgraph.id,
      isCluster: jsonSubgraph.isCluster,
      attributes: jsonSubgraph.attributes || {},
      nodes: jsonSubgraph.nodes || [],
      edges: [],
      subgraphs: [],
      boundingBox: jsonSubgraph.boundingBox,
    });
  }

  return graph;
}
