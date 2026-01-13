"use strict";
/**
 * graphviz-ts
 *
 * A modern TypeScript graph visualization library.
 * Runs in both browser and Node.js with zero dependencies.
 *
 * @example
 * ```typescript
 * import { Graphviz } from 'graphviz-ts';
 *
 * const dot = `
 *   digraph G {
 *     A -> B -> C;
 *     B -> D;
 *   }
 * `;
 *
 * const svg = Graphviz.dot(dot);
 * document.body.innerHTML = svg;
 * ```
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Graphviz = exports.parseJSON = exports.renderJSON = exports.renderSVG = exports.render = exports.radialLayout = exports.circularLayout = exports.forceDirectedLayout = exports.hierarchicalLayout = exports.layout = exports.TokenType = exports.Lexer = exports.Parser = exports.parse = exports.cloneGraph = exports.calculateBoundingBox = exports.topologicalSort = exports.hasCycle = exports.getSinkNodes = exports.getSourceNodes = exports.getDegree = exports.getOutDegree = exports.getInDegree = exports.getSuccessors = exports.getPredecessors = exports.getNeighbors = exports.getEdgesForNode = exports.addNodeToSubgraph = exports.addSubgraph = exports.addEdge = exports.addNode = exports.createGraph = void 0;
// Re-export types
__exportStar(require("./core/types"), exports);
// Re-export core functions
var graph_1 = require("./core/graph");
Object.defineProperty(exports, "createGraph", { enumerable: true, get: function () { return graph_1.createGraph; } });
Object.defineProperty(exports, "addNode", { enumerable: true, get: function () { return graph_1.addNode; } });
Object.defineProperty(exports, "addEdge", { enumerable: true, get: function () { return graph_1.addEdge; } });
Object.defineProperty(exports, "addSubgraph", { enumerable: true, get: function () { return graph_1.addSubgraph; } });
Object.defineProperty(exports, "addNodeToSubgraph", { enumerable: true, get: function () { return graph_1.addNodeToSubgraph; } });
Object.defineProperty(exports, "getEdgesForNode", { enumerable: true, get: function () { return graph_1.getEdgesForNode; } });
Object.defineProperty(exports, "getNeighbors", { enumerable: true, get: function () { return graph_1.getNeighbors; } });
Object.defineProperty(exports, "getPredecessors", { enumerable: true, get: function () { return graph_1.getPredecessors; } });
Object.defineProperty(exports, "getSuccessors", { enumerable: true, get: function () { return graph_1.getSuccessors; } });
Object.defineProperty(exports, "getInDegree", { enumerable: true, get: function () { return graph_1.getInDegree; } });
Object.defineProperty(exports, "getOutDegree", { enumerable: true, get: function () { return graph_1.getOutDegree; } });
Object.defineProperty(exports, "getDegree", { enumerable: true, get: function () { return graph_1.getDegree; } });
Object.defineProperty(exports, "getSourceNodes", { enumerable: true, get: function () { return graph_1.getSourceNodes; } });
Object.defineProperty(exports, "getSinkNodes", { enumerable: true, get: function () { return graph_1.getSinkNodes; } });
Object.defineProperty(exports, "hasCycle", { enumerable: true, get: function () { return graph_1.hasCycle; } });
Object.defineProperty(exports, "topologicalSort", { enumerable: true, get: function () { return graph_1.topologicalSort; } });
Object.defineProperty(exports, "calculateBoundingBox", { enumerable: true, get: function () { return graph_1.calculateBoundingBox; } });
Object.defineProperty(exports, "cloneGraph", { enumerable: true, get: function () { return graph_1.cloneGraph; } });
// Re-export parser
var parser_1 = require("./parser");
Object.defineProperty(exports, "parse", { enumerable: true, get: function () { return parser_1.parse; } });
Object.defineProperty(exports, "Parser", { enumerable: true, get: function () { return parser_1.Parser; } });
Object.defineProperty(exports, "Lexer", { enumerable: true, get: function () { return parser_1.Lexer; } });
Object.defineProperty(exports, "TokenType", { enumerable: true, get: function () { return parser_1.TokenType; } });
// Re-export layout engines
var layout_1 = require("./layout");
Object.defineProperty(exports, "layout", { enumerable: true, get: function () { return layout_1.layout; } });
Object.defineProperty(exports, "hierarchicalLayout", { enumerable: true, get: function () { return layout_1.hierarchicalLayout; } });
Object.defineProperty(exports, "forceDirectedLayout", { enumerable: true, get: function () { return layout_1.forceDirectedLayout; } });
Object.defineProperty(exports, "circularLayout", { enumerable: true, get: function () { return layout_1.circularLayout; } });
Object.defineProperty(exports, "radialLayout", { enumerable: true, get: function () { return layout_1.radialLayout; } });
// Re-export renderers
var render_1 = require("./render");
Object.defineProperty(exports, "render", { enumerable: true, get: function () { return render_1.render; } });
Object.defineProperty(exports, "renderSVG", { enumerable: true, get: function () { return render_1.renderSVG; } });
Object.defineProperty(exports, "renderJSON", { enumerable: true, get: function () { return render_1.renderJSON; } });
Object.defineProperty(exports, "parseJSON", { enumerable: true, get: function () { return render_1.parseJSON; } });
const parser_2 = require("./parser");
const layout_2 = require("./layout");
const render_2 = require("./render");
/**
 * Main Graphviz class providing a simple API for graph visualization
 */
class Graphviz {
    graph = null;
    layoutGraph = null;
    options;
    constructor(options = {}) {
        this.options = options;
    }
    /**
     * Parse a DOT string and store the graph
     */
    parse(dot) {
        const result = (0, parser_2.parse)(dot);
        if (result.errors.length > 0) {
            const errorMessages = result.errors
                .map((e) => `Line ${e.line}:${e.column}: ${e.message}`)
                .join('\n');
            throw new Error(`Parse errors:\n${errorMessages}`);
        }
        if (!result.graph) {
            throw new Error('Failed to parse DOT string');
        }
        this.graph = result.graph;
        this.layoutGraph = null;
        return this;
    }
    /**
     * Apply layout to the parsed graph
     */
    layout(options) {
        if (!this.graph) {
            throw new Error('No graph parsed. Call parse() first.');
        }
        const opts = { ...this.options, ...options };
        this.layoutGraph = (0, layout_2.layout)(this.graph, opts);
        return this;
    }
    /**
     * Render the graph to the specified format
     */
    render(options) {
        const graphToRender = this.layoutGraph || this.graph;
        if (!graphToRender) {
            throw new Error('No graph to render. Call parse() first.');
        }
        // Auto-layout if not done yet
        if (!this.layoutGraph) {
            this.layout();
        }
        const opts = { ...this.options, ...options };
        const result = (0, render_2.render)(this.layoutGraph, opts);
        return result.output;
    }
    /**
     * Get the underlying graph object
     */
    getGraph() {
        return this.layoutGraph || this.graph;
    }
    /**
     * Set options
     */
    setOptions(options) {
        this.options = { ...this.options, ...options };
        return this;
    }
    // ============================================================================
    // Static convenience methods
    // ============================================================================
    /**
     * Quick render: parse DOT and render to SVG using hierarchical layout
     */
    static dot(dot, options) {
        return new Graphviz({ engine: 'dot', ...options })
            .parse(dot)
            .layout()
            .render();
    }
    /**
     * Quick render: parse DOT and render to SVG using force-directed layout
     */
    static neato(dot, options) {
        return new Graphviz({ engine: 'neato', ...options })
            .parse(dot)
            .layout()
            .render();
    }
    /**
     * Quick render: parse DOT and render to SVG using force-directed layout (fdp)
     */
    static fdp(dot, options) {
        return new Graphviz({ engine: 'fdp', ...options })
            .parse(dot)
            .layout()
            .render();
    }
    /**
     * Quick render: parse DOT and render to SVG using circular layout
     */
    static circo(dot, options) {
        return new Graphviz({ engine: 'circo', ...options })
            .parse(dot)
            .layout()
            .render();
    }
    /**
     * Quick render: parse DOT and render to SVG using radial layout
     */
    static twopi(dot, options) {
        return new Graphviz({ engine: 'twopi', ...options })
            .parse(dot)
            .layout()
            .render();
    }
    /**
     * Render DOT to SVG with auto-detected layout engine
     */
    static render(dot, options) {
        return new Graphviz(options)
            .parse(dot)
            .layout()
            .render();
    }
    /**
     * Parse DOT and return JSON representation
     */
    static toJSON(dot, options) {
        return new Graphviz({ ...options, format: 'json' })
            .parse(dot)
            .layout()
            .render();
    }
    /**
     * Parse DOT string only (no layout)
     */
    static parse(dot) {
        const result = (0, parser_2.parse)(dot);
        if (result.errors.length > 0 || !result.graph) {
            throw new Error('Failed to parse DOT string');
        }
        return result.graph;
    }
}
exports.Graphviz = Graphviz;
// Default export
exports.default = Graphviz;
//# sourceMappingURL=index.js.map