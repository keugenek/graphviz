/**
 * SVG Renderer
 *
 * Renders a laid-out graph to SVG format.
 */
import { Graph } from '../core/types';
export interface SVGRenderOptions {
    width?: number;
    height?: number;
    scale?: number;
    padding?: number;
    background?: string;
    fontFamily?: string;
    fontSize?: number;
}
/**
 * Render a graph to SVG
 */
export declare function renderSVG(graph: Graph, options?: SVGRenderOptions): string;
//# sourceMappingURL=svg.d.ts.map