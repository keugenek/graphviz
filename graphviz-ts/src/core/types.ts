/**
 * Core types for graphviz-ts
 */

// ============================================================================
// Basic Geometry Types
// ============================================================================

export interface Point {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Bezier {
  start: Point;
  cp1: Point;
  cp2: Point;
  end: Point;
}

// ============================================================================
// Graph Structure Types
// ============================================================================

export type GraphType = 'graph' | 'digraph';

export interface GraphAttributes {
  // Layout
  rankdir?: 'TB' | 'BT' | 'LR' | 'RL';
  ranksep?: number;
  nodesep?: number;
  splines?: 'none' | 'line' | 'polyline' | 'curved' | 'ortho' | 'spline' | boolean;
  overlap?: boolean | 'scale' | 'prism';
  pack?: boolean;
  packmode?: 'node' | 'clust' | 'graph';

  // Size
  size?: string;
  ratio?: string | number;
  pad?: number;
  margin?: number | string;

  // Appearance
  bgcolor?: string;
  fontname?: string;
  fontsize?: number;
  fontcolor?: string;
  label?: string;
  labelloc?: 't' | 'b' | 'c';
  labeljust?: 'l' | 'r' | 'c';

  // Force-directed specific
  K?: number;
  maxiter?: number;
  start?: string;
  epsilon?: number;

  // Cluster specific
  style?: string;
  color?: string;
  fillcolor?: string;
  penwidth?: number;

  // Generic
  [key: string]: unknown;
}

export interface NodeAttributes {
  // Position (used after layout)
  pos?: string;

  // Size
  width?: number;
  height?: number;
  fixedsize?: boolean | 'shape';

  // Shape
  shape?: NodeShape;
  sides?: number;
  orientation?: number;
  distortion?: number;
  skew?: number;
  regular?: boolean;
  peripheries?: number;

  // Appearance
  style?: string;
  color?: string;
  fillcolor?: string;
  fontname?: string;
  fontsize?: number;
  fontcolor?: string;
  penwidth?: number;

  // Label
  label?: string;
  xlabel?: string;
  labelloc?: 't' | 'b' | 'c';

  // Interaction
  URL?: string;
  href?: string;
  target?: string;
  tooltip?: string;

  // Layout hints
  group?: string;
  rank?: 'same' | 'min' | 'max' | 'source' | 'sink';

  // Generic
  [key: string]: unknown;
}

export type NodeShape =
  | 'box' | 'rect' | 'rectangle' | 'square'
  | 'ellipse' | 'oval' | 'circle' | 'point'
  | 'diamond' | 'trapezium' | 'parallelogram'
  | 'house' | 'invhouse' | 'invtrapezium'
  | 'pentagon' | 'hexagon' | 'septagon' | 'octagon'
  | 'doublecircle' | 'doubleoctagon' | 'tripleoctagon'
  | 'invtriangle' | 'triangle'
  | 'cylinder' | 'note' | 'tab' | 'folder'
  | 'box3d' | 'component' | 'promoter' | 'cds'
  | 'terminator' | 'utr' | 'primersite' | 'restrictionsite'
  | 'fivepoverhang' | 'threepoverhang' | 'noverhang'
  | 'assembly' | 'signature' | 'insulator' | 'ribosite'
  | 'rnastab' | 'proteasesite' | 'proteinstab'
  | 'rpromoter' | 'rarrow' | 'larrow' | 'lpromoter'
  | 'Mdiamond' | 'Msquare' | 'Mcircle'
  | 'star' | 'underline' | 'cylinder'
  | 'plaintext' | 'plain' | 'none' | 'record' | 'Mrecord';

export interface EdgeAttributes {
  // Appearance
  style?: string;
  color?: string;
  fillcolor?: string;
  fontname?: string;
  fontsize?: number;
  fontcolor?: string;
  penwidth?: number;

  // Arrow
  arrowhead?: ArrowType;
  arrowtail?: ArrowType;
  arrowsize?: number;
  dir?: 'forward' | 'back' | 'both' | 'none';

  // Label
  label?: string;
  xlabel?: string;
  headlabel?: string;
  taillabel?: string;
  labeldistance?: number;
  labelangle?: number;
  labelfloat?: boolean;
  labelfontname?: string;
  labelfontsize?: number;
  labelfontcolor?: string;

  // Layout
  weight?: number;
  minlen?: number;
  len?: number;
  constraint?: boolean;

  // Ports
  headport?: string;
  tailport?: string;

  // Interaction
  URL?: string;
  href?: string;
  target?: string;
  tooltip?: string;

  // Edge routing (after layout)
  pos?: string;

  // Generic
  [key: string]: unknown;
}

export type ArrowType =
  | 'normal' | 'inv' | 'dot' | 'invdot' | 'odot' | 'invodot'
  | 'none' | 'tee' | 'empty' | 'invempty' | 'diamond' | 'odiamond'
  | 'box' | 'obox' | 'open' | 'halfopen' | 'vee' | 'crow';

// ============================================================================
// Graph Model
// ============================================================================

export interface Node {
  id: string;
  attributes: NodeAttributes;
  // Layout data (computed)
  x?: number;
  y?: number;
  width?: number;
  height?: number;
}

export interface Edge {
  id: string;
  source: string;
  target: string;
  attributes: EdgeAttributes;
  // Layout data (computed)
  points?: Point[];
  labelPos?: Point;
  splines?: Bezier[];
}

export interface Subgraph {
  id: string;
  isCluster: boolean;
  attributes: GraphAttributes;
  nodes: string[];
  edges: string[];
  subgraphs: string[];
  // Layout data (computed)
  boundingBox?: BoundingBox;
}

export interface Graph {
  id: string;
  type: GraphType;
  strict: boolean;
  attributes: GraphAttributes;
  nodes: Map<string, Node>;
  edges: Edge[];
  subgraphs: Map<string, Subgraph>;
  // Default attributes
  nodeDefaults: NodeAttributes;
  edgeDefaults: EdgeAttributes;
  // Layout data (computed)
  boundingBox?: BoundingBox;
}

// ============================================================================
// Layout Types
// ============================================================================

export type LayoutEngine = 'dot' | 'neato' | 'fdp' | 'circo' | 'twopi';

export interface LayoutOptions {
  engine?: LayoutEngine;
  // Override graph attributes
  rankdir?: 'TB' | 'BT' | 'LR' | 'RL';
  ranksep?: number;
  nodesep?: number;
  // Force-directed options
  iterations?: number;
  cooling?: number;
}

export interface LayoutResult {
  graph: Graph;
  boundingBox: BoundingBox;
}

// ============================================================================
// Render Types
// ============================================================================

export type OutputFormat = 'svg' | 'json' | 'xdot';

export interface RenderOptions {
  format?: OutputFormat;
  width?: number;
  height?: number;
  scale?: number;
  padding?: number;
  background?: string;
}

export interface RenderResult {
  output: string;
  width: number;
  height: number;
}
