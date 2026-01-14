"use strict";
/**
 * Render module - Graph rendering to various formats
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseJSON = exports.renderJSON = exports.renderSVG = void 0;
exports.render = render;
const svg_1 = require("./svg");
const json_1 = require("./json");
var svg_2 = require("./svg");
Object.defineProperty(exports, "renderSVG", { enumerable: true, get: function () { return svg_2.renderSVG; } });
var json_2 = require("./json");
Object.defineProperty(exports, "renderJSON", { enumerable: true, get: function () { return json_2.renderJSON; } });
Object.defineProperty(exports, "parseJSON", { enumerable: true, get: function () { return json_2.parseJSON; } });
/**
 * Render a graph to the specified format
 */
function render(graph, options = {}) {
    const format = options.format || 'svg';
    switch (format) {
        case 'svg':
            const svgOutput = (0, svg_1.renderSVG)(graph, {
                width: options.width,
                height: options.height,
                scale: options.scale,
                padding: options.padding,
                background: options.background,
            });
            return {
                output: svgOutput,
                width: graph.boundingBox?.width || 0,
                height: graph.boundingBox?.height || 0,
            };
        case 'json':
            const jsonOutput = (0, json_1.renderJSON)(graph, { pretty: true });
            return {
                output: jsonOutput,
                width: graph.boundingBox?.width || 0,
                height: graph.boundingBox?.height || 0,
            };
        case 'xdot':
            // XDot is essentially JSON with specific format
            const xdotOutput = (0, json_1.renderJSON)(graph, { pretty: true, includeDefaults: true });
            return {
                output: xdotOutput,
                width: graph.boundingBox?.width || 0,
                height: graph.boundingBox?.height || 0,
            };
        default:
            throw new Error(`Unsupported output format: ${format}`);
    }
}
//# sourceMappingURL=index.js.map