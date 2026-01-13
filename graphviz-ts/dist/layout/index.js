"use strict";
/**
 * Layout module - Graph layout algorithms
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.radialLayout = exports.circularLayout = exports.forceDirectedLayout = exports.hierarchicalLayout = void 0;
exports.layout = layout;
const hierarchical_1 = require("./hierarchical");
const force_directed_1 = require("./force-directed");
var hierarchical_2 = require("./hierarchical");
Object.defineProperty(exports, "hierarchicalLayout", { enumerable: true, get: function () { return hierarchical_2.hierarchicalLayout; } });
var force_directed_2 = require("./force-directed");
Object.defineProperty(exports, "forceDirectedLayout", { enumerable: true, get: function () { return force_directed_2.forceDirectedLayout; } });
Object.defineProperty(exports, "circularLayout", { enumerable: true, get: function () { return force_directed_2.circularLayout; } });
Object.defineProperty(exports, "radialLayout", { enumerable: true, get: function () { return force_directed_2.radialLayout; } });
/**
 * Apply layout to a graph using the specified engine
 */
function layout(graph, options = {}) {
    const engine = options.engine || getDefaultEngine(graph);
    switch (engine) {
        case 'dot':
            return (0, hierarchical_1.hierarchicalLayout)(graph, {
                rankdir: options.rankdir,
                ranksep: options.ranksep,
                nodesep: options.nodesep,
            });
        case 'neato':
        case 'fdp':
            return (0, force_directed_1.forceDirectedLayout)(graph, {
                iterations: options.iterations,
                cooling: options.cooling,
            });
        case 'circo':
            return (0, force_directed_1.circularLayout)(graph);
        case 'twopi':
            return (0, force_directed_1.radialLayout)(graph);
        default:
            // Default to hierarchical for digraphs, force-directed for graphs
            if (graph.type === 'digraph') {
                return (0, hierarchical_1.hierarchicalLayout)(graph);
            }
            else {
                return (0, force_directed_1.forceDirectedLayout)(graph);
            }
    }
}
/**
 * Determine the default layout engine based on graph type and attributes
 */
function getDefaultEngine(graph) {
    // Check for explicit layout attribute
    const layoutAttr = graph.attributes.layout;
    if (layoutAttr) {
        if (['dot', 'neato', 'fdp', 'circo', 'twopi'].includes(layoutAttr)) {
            return layoutAttr;
        }
    }
    // Use dot for directed graphs, neato for undirected
    return graph.type === 'digraph' ? 'dot' : 'neato';
}
//# sourceMappingURL=index.js.map