/**
 * Layout module - Graph layout algorithms
 */

import { Graph, LayoutEngine, LayoutOptions } from '../core/types';
import { hierarchicalLayout } from './hierarchical';
import { forceDirectedLayout, circularLayout, radialLayout } from './force-directed';

export { hierarchicalLayout, HierarchicalLayoutOptions } from './hierarchical';
export { forceDirectedLayout, ForceDirectedLayoutOptions, circularLayout, radialLayout } from './force-directed';

/**
 * Apply layout to a graph using the specified engine
 */
export function layout(graph: Graph, options: LayoutOptions = {}): Graph {
  const engine = options.engine || getDefaultEngine(graph);

  switch (engine) {
    case 'dot':
      return hierarchicalLayout(graph, {
        rankdir: options.rankdir,
        ranksep: options.ranksep,
        nodesep: options.nodesep,
      });

    case 'neato':
    case 'fdp':
      return forceDirectedLayout(graph, {
        iterations: options.iterations,
        cooling: options.cooling,
      });

    case 'circo':
      return circularLayout(graph);

    case 'twopi':
      return radialLayout(graph);

    default:
      // Default to hierarchical for digraphs, force-directed for graphs
      if (graph.type === 'digraph') {
        return hierarchicalLayout(graph);
      } else {
        return forceDirectedLayout(graph);
      }
  }
}

/**
 * Determine the default layout engine based on graph type and attributes
 */
function getDefaultEngine(graph: Graph): LayoutEngine {
  // Check for explicit layout attribute
  const layoutAttr = graph.attributes.layout as string | undefined;
  if (layoutAttr) {
    if (['dot', 'neato', 'fdp', 'circo', 'twopi'].includes(layoutAttr)) {
      return layoutAttr as LayoutEngine;
    }
  }

  // Use dot for directed graphs, neato for undirected
  return graph.type === 'digraph' ? 'dot' : 'neato';
}
