/**
 * Core types for graphviz-ts
 */
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
export type GraphType = 'graph' | 'digraph';
export interface GraphAttributes {
    rankdir?: 'TB' | 'BT' | 'LR' | 'RL';
    ranksep?: number;
    nodesep?: number;
    splines?: 'none' | 'line' | 'polyline' | 'curved' | 'ortho' | 'spline' | boolean;
    overlap?: boolean | 'scale' | 'prism';
    pack?: boolean;
    packmode?: 'node' | 'clust' | 'graph';
    size?: string;
    ratio?: string | number;
    pad?: number;
    margin?: number | string;
    bgcolor?: string;
    fontname?: string;
    fontsize?: number;
    fontcolor?: string;
    label?: string;
    labelloc?: 't' | 'b' | 'c';
    labeljust?: 'l' | 'r' | 'c';
    K?: number;
    maxiter?: number;
    start?: string;
    epsilon?: number;
    style?: string;
    color?: string;
    fillcolor?: string;
    penwidth?: number;
    [key: string]: unknown;
}
export interface NodeAttributes {
    pos?: string;
    width?: number;
    height?: number;
    fixedsize?: boolean | 'shape';
    shape?: NodeShape;
    sides?: number;
    orientation?: number;
    distortion?: number;
    skew?: number;
    regular?: boolean;
    peripheries?: number;
    style?: string;
    color?: string;
    fillcolor?: string;
    fontname?: string;
    fontsize?: number;
    fontcolor?: string;
    penwidth?: number;
    label?: string;
    xlabel?: string;
    labelloc?: 't' | 'b' | 'c';
    URL?: string;
    href?: string;
    target?: string;
    tooltip?: string;
    group?: string;
    rank?: 'same' | 'min' | 'max' | 'source' | 'sink';
    [key: string]: unknown;
}
export type NodeShape = 'box' | 'rect' | 'rectangle' | 'square' | 'ellipse' | 'oval' | 'circle' | 'point' | 'diamond' | 'trapezium' | 'parallelogram' | 'house' | 'invhouse' | 'invtrapezium' | 'pentagon' | 'hexagon' | 'septagon' | 'octagon' | 'doublecircle' | 'doubleoctagon' | 'tripleoctagon' | 'invtriangle' | 'triangle' | 'cylinder' | 'note' | 'tab' | 'folder' | 'box3d' | 'component' | 'promoter' | 'cds' | 'terminator' | 'utr' | 'primersite' | 'restrictionsite' | 'fivepoverhang' | 'threepoverhang' | 'noverhang' | 'assembly' | 'signature' | 'insulator' | 'ribosite' | 'rnastab' | 'proteasesite' | 'proteinstab' | 'rpromoter' | 'rarrow' | 'larrow' | 'lpromoter' | 'Mdiamond' | 'Msquare' | 'Mcircle' | 'star' | 'underline' | 'cylinder' | 'plaintext' | 'plain' | 'none' | 'record' | 'Mrecord';
export interface EdgeAttributes {
    style?: string;
    color?: string;
    fillcolor?: string;
    fontname?: string;
    fontsize?: number;
    fontcolor?: string;
    penwidth?: number;
    arrowhead?: ArrowType;
    arrowtail?: ArrowType;
    arrowsize?: number;
    dir?: 'forward' | 'back' | 'both' | 'none';
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
    weight?: number;
    minlen?: number;
    len?: number;
    constraint?: boolean;
    headport?: string;
    tailport?: string;
    URL?: string;
    href?: string;
    target?: string;
    tooltip?: string;
    pos?: string;
    [key: string]: unknown;
}
export type ArrowType = 'normal' | 'inv' | 'dot' | 'invdot' | 'odot' | 'invodot' | 'none' | 'tee' | 'empty' | 'invempty' | 'diamond' | 'odiamond' | 'box' | 'obox' | 'open' | 'halfopen' | 'vee' | 'crow';
export interface Node {
    id: string;
    attributes: NodeAttributes;
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
    nodeDefaults: NodeAttributes;
    edgeDefaults: EdgeAttributes;
    boundingBox?: BoundingBox;
}
export type LayoutEngine = 'dot' | 'neato' | 'fdp' | 'circo' | 'twopi';
export interface LayoutOptions {
    engine?: LayoutEngine;
    rankdir?: 'TB' | 'BT' | 'LR' | 'RL';
    ranksep?: number;
    nodesep?: number;
    iterations?: number;
    cooling?: number;
}
export interface LayoutResult {
    graph: Graph;
    boundingBox: BoundingBox;
}
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
//# sourceMappingURL=types.d.ts.map