/**
 * Layout module - Graph layout algorithms
 */
import { Graph, LayoutOptions } from '../core/types';
export { hierarchicalLayout, HierarchicalLayoutOptions } from './hierarchical';
export { forceDirectedLayout, ForceDirectedLayoutOptions, circularLayout, radialLayout } from './force-directed';
/**
 * Apply layout to a graph using the specified engine
 */
export declare function layout(graph: Graph, options?: LayoutOptions): Graph;
//# sourceMappingURL=index.d.ts.map