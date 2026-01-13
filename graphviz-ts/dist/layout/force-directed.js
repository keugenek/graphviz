"use strict";
/**
 * Force-Directed Layout Engine (neato/fdp-like)
 *
 * Implements the Fruchterman-Reingold force-directed algorithm:
 * - Repulsive forces between all node pairs (inversely proportional to distance)
 * - Attractive forces along edges (proportional to distance)
 * - Iterative simulation with cooling
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.forceDirectedLayout = forceDirectedLayout;
exports.circularLayout = circularLayout;
exports.radialLayout = radialLayout;
const graph_1 = require("../core/graph");
const DEFAULT_OPTIONS = {
    iterations: 300,
    cooling: 0.95,
    optimalDistance: 100,
    gravity: 0.1,
    margin: 40,
};
/**
 * Apply force-directed layout to a graph
 */
function forceDirectedLayout(graph, options = {}) {
    // Filter out undefined values to preserve defaults
    const cleanOptions = {};
    for (const [key, value] of Object.entries(options)) {
        if (value !== undefined) {
            cleanOptions[key] = value;
        }
    }
    const opts = { ...DEFAULT_OPTIONS, ...cleanOptions };
    const result = (0, graph_1.cloneGraph)(graph);
    // Get layout parameters from graph attributes
    if (typeof graph.attributes.K === 'number') {
        opts.optimalDistance = graph.attributes.K;
    }
    if (typeof graph.attributes.maxiter === 'number') {
        opts.iterations = graph.attributes.maxiter;
    }
    // Handle empty graph
    if (result.nodes.size === 0) {
        result.boundingBox = { x: 0, y: 0, width: 0, height: 0 };
        return result;
    }
    // Initialize layout nodes
    const layoutNodes = initializeNodes(result, opts);
    const nodeMap = new Map(layoutNodes.map(n => [n.id, n]));
    // Build adjacency for edge lookup
    const edges = result.edges.map(e => ({
        source: nodeMap.get(e.source),
        target: nodeMap.get(e.target),
        weight: typeof e.attributes.weight === 'number' ? e.attributes.weight : 1,
        len: typeof e.attributes.len === 'number' ? e.attributes.len : opts.optimalDistance,
    }));
    // Run simulation
    let temperature = opts.optimalDistance * Math.sqrt(layoutNodes.length);
    for (let iter = 0; iter < opts.iterations; iter++) {
        // Reset velocities
        for (const node of layoutNodes) {
            node.vx = 0;
            node.vy = 0;
        }
        // Calculate repulsive forces between all node pairs
        for (let i = 0; i < layoutNodes.length; i++) {
            for (let j = i + 1; j < layoutNodes.length; j++) {
                applyRepulsiveForce(layoutNodes[i], layoutNodes[j], opts.optimalDistance);
            }
        }
        // Calculate attractive forces along edges
        for (const edge of edges) {
            applyAttractiveForce(edge.source, edge.target, edge.len, edge.weight);
        }
        // Apply gravity toward center
        const centerX = layoutNodes.reduce((sum, n) => sum + n.x, 0) / layoutNodes.length;
        const centerY = layoutNodes.reduce((sum, n) => sum + n.y, 0) / layoutNodes.length;
        for (const node of layoutNodes) {
            if (!node.fixed) {
                node.vx -= (node.x - centerX) * opts.gravity;
                node.vy -= (node.y - centerY) * opts.gravity;
            }
        }
        // Apply velocities with temperature limiting
        for (const node of layoutNodes) {
            if (node.fixed)
                continue;
            const magnitude = Math.sqrt(node.vx * node.vx + node.vy * node.vy);
            if (magnitude > 0) {
                const scale = Math.min(magnitude, temperature) / magnitude;
                node.x += node.vx * scale;
                node.y += node.vy * scale;
            }
        }
        // Cool down
        temperature *= opts.cooling;
        // Early termination if temperature is very low
        if (temperature < 0.01)
            break;
    }
    // Copy positions back to result graph
    for (const layoutNode of layoutNodes) {
        const node = result.nodes.get(layoutNode.id);
        node.x = layoutNode.x;
        node.y = layoutNode.y;
        node.width = layoutNode.width;
        node.height = layoutNode.height;
    }
    // Create edge routes
    routeEdges(result);
    // Normalize positions and calculate bounding box
    result.boundingBox = normalizeAndCalculateBoundingBox(result, opts.margin);
    return result;
}
/**
 * Initialize layout nodes with positions and dimensions
 */
function initializeNodes(graph, opts) {
    const nodes = [];
    const n = graph.nodes.size;
    const radius = opts.optimalDistance * Math.sqrt(n);
    let i = 0;
    for (const [id, node] of graph.nodes) {
        // Check for fixed position
        let x, y;
        let fixed = false;
        if (typeof node.attributes.pos === 'string') {
            const posMatch = node.attributes.pos.match(/([0-9.-]+),([0-9.-]+)/);
            if (posMatch) {
                x = parseFloat(posMatch[1]);
                y = parseFloat(posMatch[2]);
                if (node.attributes.pos.endsWith('!')) {
                    fixed = true;
                }
            }
            else {
                // Random initial position in a circle
                const angle = (2 * Math.PI * i) / n + Math.random() * 0.5;
                const r = radius * (0.5 + Math.random() * 0.5);
                x = Math.cos(angle) * r;
                y = Math.sin(angle) * r;
            }
        }
        else {
            // Random initial position in a circle
            const angle = (2 * Math.PI * i) / n + Math.random() * 0.5;
            const r = radius * (0.5 + Math.random() * 0.5);
            x = Math.cos(angle) * r;
            y = Math.sin(angle) * r;
        }
        // Calculate dimensions
        let width = 60;
        let height = 40;
        if (typeof node.attributes.width === 'number') {
            width = node.attributes.width * 72;
        }
        if (typeof node.attributes.height === 'number') {
            height = node.attributes.height * 72;
        }
        // Estimate based on label
        const label = node.attributes.label || id;
        const fontSize = node.attributes.fontsize || 14;
        width = Math.max(width, label.length * fontSize * 0.6 + 20);
        height = Math.max(height, fontSize + 20);
        // Adjust for shape
        const shape = node.attributes.shape || 'ellipse';
        if (shape === 'point') {
            width = 5;
            height = 5;
        }
        else if (shape === 'circle' || shape === 'doublecircle') {
            const size = Math.max(width, height);
            width = size;
            height = size;
        }
        nodes.push({ id, x, y, width, height, vx: 0, vy: 0, fixed });
        i++;
    }
    return nodes;
}
/**
 * Apply repulsive force between two nodes
 */
function applyRepulsiveForce(a, b, optimalDistance) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    let distance = Math.sqrt(dx * dx + dy * dy);
    // Prevent division by zero
    if (distance < 0.01) {
        distance = 0.01;
    }
    // Repulsive force = k^2 / distance
    const force = (optimalDistance * optimalDistance) / distance;
    const fx = (dx / distance) * force;
    const fy = (dy / distance) * force;
    if (!a.fixed) {
        a.vx -= fx;
        a.vy -= fy;
    }
    if (!b.fixed) {
        b.vx += fx;
        b.vy += fy;
    }
}
/**
 * Apply attractive force along an edge
 */
function applyAttractiveForce(source, target, optimalLen, weight) {
    const dx = target.x - source.x;
    const dy = target.y - source.y;
    let distance = Math.sqrt(dx * dx + dy * dy);
    if (distance < 0.01) {
        distance = 0.01;
    }
    // Attractive force = distance^2 / k
    const force = ((distance - optimalLen) * weight) / optimalLen;
    const fx = (dx / distance) * force;
    const fy = (dy / distance) * force;
    if (!source.fixed) {
        source.vx += fx;
        source.vy += fy;
    }
    if (!target.fixed) {
        target.vx -= fx;
        target.vy -= fy;
    }
}
/**
 * Create edge routes (straight lines for force-directed)
 */
function routeEdges(graph) {
    for (const edge of graph.edges) {
        const source = graph.nodes.get(edge.source);
        const target = graph.nodes.get(edge.target);
        const startPoint = getNodeBoundaryPoint(source, target);
        const endPoint = getNodeBoundaryPoint(target, source);
        edge.points = [startPoint, endPoint];
        edge.splines = [
            {
                start: startPoint,
                cp1: {
                    x: startPoint.x + (endPoint.x - startPoint.x) / 3,
                    y: startPoint.y + (endPoint.y - startPoint.y) / 3,
                },
                cp2: {
                    x: startPoint.x + (2 * (endPoint.x - startPoint.x)) / 3,
                    y: startPoint.y + (2 * (endPoint.y - startPoint.y)) / 3,
                },
                end: endPoint,
            },
        ];
    }
}
/**
 * Get the point on a node's boundary closest to another node
 */
function getNodeBoundaryPoint(node, other) {
    const cx = node.x || 0;
    const cy = node.y || 0;
    const ox = other.x || 0;
    const oy = other.y || 0;
    const dx = ox - cx;
    const dy = oy - cy;
    const distance = Math.sqrt(dx * dx + dy * dy);
    if (distance < 0.01) {
        return { x: cx, y: cy };
    }
    const shape = node.attributes.shape || 'ellipse';
    const w = (node.width || 60) / 2;
    const h = (node.height || 40) / 2;
    if (shape === 'box' || shape === 'rect' || shape === 'rectangle' || shape === 'square') {
        // Rectangle boundary
        const angle = Math.atan2(dy, dx);
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        let t;
        if (Math.abs(cos * h) > Math.abs(sin * w)) {
            t = w / Math.abs(cos);
        }
        else {
            t = h / Math.abs(sin);
        }
        return {
            x: cx + cos * t,
            y: cy + sin * t,
        };
    }
    else {
        // Ellipse boundary
        const angle = Math.atan2(dy, dx);
        return {
            x: cx + w * Math.cos(angle),
            y: cy + h * Math.sin(angle),
        };
    }
}
/**
 * Normalize positions to start from margin and calculate bounding box
 */
function normalizeAndCalculateBoundingBox(graph, margin) {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const node of graph.nodes.values()) {
        const w = (node.width || 60) / 2;
        const h = (node.height || 40) / 2;
        minX = Math.min(minX, (node.x || 0) - w);
        minY = Math.min(minY, (node.y || 0) - h);
        maxX = Math.max(maxX, (node.x || 0) + w);
        maxY = Math.max(maxY, (node.y || 0) + h);
    }
    if (minX === Infinity) {
        return { x: 0, y: 0, width: 0, height: 0 };
    }
    // Shift all positions
    const offsetX = -minX + margin;
    const offsetY = -minY + margin;
    for (const node of graph.nodes.values()) {
        node.x = (node.x || 0) + offsetX;
        node.y = (node.y || 0) + offsetY;
    }
    for (const edge of graph.edges) {
        if (edge.points) {
            for (const point of edge.points) {
                point.x += offsetX;
                point.y += offsetY;
            }
        }
        if (edge.splines) {
            for (const spline of edge.splines) {
                spline.start.x += offsetX;
                spline.start.y += offsetY;
                spline.cp1.x += offsetX;
                spline.cp1.y += offsetY;
                spline.cp2.x += offsetX;
                spline.cp2.y += offsetY;
                spline.end.x += offsetX;
                spline.end.y += offsetY;
            }
        }
    }
    return {
        x: 0,
        y: 0,
        width: maxX - minX + 2 * margin,
        height: maxY - minY + 2 * margin,
    };
}
/**
 * Circular layout - place nodes in a circle
 */
function circularLayout(graph, options = {}) {
    const result = (0, graph_1.cloneGraph)(graph);
    const n = result.nodes.size;
    if (n === 0) {
        result.boundingBox = { x: 0, y: 0, width: 0, height: 0 };
        return result;
    }
    const margin = options.margin || 40;
    // Calculate node dimensions
    let maxNodeSize = 0;
    for (const node of result.nodes.values()) {
        let width = 60;
        let height = 40;
        if (typeof node.attributes.width === 'number') {
            width = node.attributes.width * 72;
        }
        if (typeof node.attributes.height === 'number') {
            height = node.attributes.height * 72;
        }
        const label = node.attributes.label || node.id;
        const fontSize = node.attributes.fontsize || 14;
        width = Math.max(width, label.length * fontSize * 0.6 + 20);
        node.width = width;
        node.height = height;
        maxNodeSize = Math.max(maxNodeSize, Math.max(width, height));
    }
    // Calculate radius
    const radius = options.radius || Math.max(100, (n * maxNodeSize) / (2 * Math.PI));
    const centerX = radius + margin + maxNodeSize / 2;
    const centerY = radius + margin + maxNodeSize / 2;
    // Place nodes in a circle
    let i = 0;
    for (const node of result.nodes.values()) {
        const angle = (2 * Math.PI * i) / n - Math.PI / 2;
        node.x = centerX + radius * Math.cos(angle);
        node.y = centerY + radius * Math.sin(angle);
        i++;
    }
    // Route edges
    routeEdges(result);
    // Calculate bounding box
    result.boundingBox = {
        x: 0,
        y: 0,
        width: 2 * (radius + margin + maxNodeSize / 2),
        height: 2 * (radius + margin + maxNodeSize / 2),
    };
    return result;
}
/**
 * Radial layout - place nodes in concentric circles based on distance from root
 */
function radialLayout(graph, options = {}) {
    const result = (0, graph_1.cloneGraph)(graph);
    const n = result.nodes.size;
    if (n === 0) {
        result.boundingBox = { x: 0, y: 0, width: 0, height: 0 };
        return result;
    }
    const margin = options.margin || 40;
    const levelSep = options.levelSep || 80;
    // Find root node (first node with no predecessors, or specified root)
    let rootId = options.root;
    if (!rootId) {
        const hasIncoming = new Set();
        for (const edge of result.edges) {
            hasIncoming.add(edge.target);
        }
        for (const nodeId of result.nodes.keys()) {
            if (!hasIncoming.has(nodeId)) {
                rootId = nodeId;
                break;
            }
        }
        if (!rootId) {
            rootId = result.nodes.keys().next().value;
        }
    }
    // BFS to assign levels
    const levels = new Map();
    const queue = [rootId];
    levels.set(rootId, 0);
    while (queue.length > 0) {
        const nodeId = queue.shift();
        const level = levels.get(nodeId);
        for (const edge of result.edges) {
            if (edge.source === nodeId && !levels.has(edge.target)) {
                levels.set(edge.target, level + 1);
                queue.push(edge.target);
            }
            if (graph.type === 'graph' && edge.target === nodeId && !levels.has(edge.source)) {
                levels.set(edge.source, level + 1);
                queue.push(edge.source);
            }
        }
    }
    // Handle disconnected nodes
    for (const nodeId of result.nodes.keys()) {
        if (!levels.has(nodeId)) {
            levels.set(nodeId, 0);
        }
    }
    // Group nodes by level
    const levelNodes = new Map();
    for (const [nodeId, level] of levels) {
        if (!levelNodes.has(level)) {
            levelNodes.set(level, []);
        }
        levelNodes.get(level).push(nodeId);
    }
    // Calculate max level
    const maxLevel = Math.max(...levels.values());
    // Initialize node dimensions and find max size
    let maxNodeSize = 0;
    for (const node of result.nodes.values()) {
        let width = 60;
        let height = 40;
        const label = node.attributes.label || node.id;
        const fontSize = node.attributes.fontsize || 14;
        width = Math.max(width, label.length * fontSize * 0.6 + 20);
        node.width = width;
        node.height = height;
        maxNodeSize = Math.max(maxNodeSize, Math.max(width, height));
    }
    // Calculate center
    const maxRadius = maxLevel * levelSep + maxNodeSize;
    const centerX = maxRadius + margin;
    const centerY = maxRadius + margin;
    // Place nodes
    for (const [level, nodes] of levelNodes) {
        const radius = level * levelSep;
        const count = nodes.length;
        if (level === 0) {
            // Root at center
            const node = result.nodes.get(nodes[0]);
            node.x = centerX;
            node.y = centerY;
        }
        else {
            // Distribute nodes around circle
            for (let i = 0; i < count; i++) {
                const angle = (2 * Math.PI * i) / count - Math.PI / 2;
                const node = result.nodes.get(nodes[i]);
                node.x = centerX + radius * Math.cos(angle);
                node.y = centerY + radius * Math.sin(angle);
            }
        }
    }
    // Route edges
    routeEdges(result);
    // Calculate bounding box
    result.boundingBox = {
        x: 0,
        y: 0,
        width: 2 * (maxRadius + margin),
        height: 2 * (maxRadius + margin),
    };
    return result;
}
//# sourceMappingURL=force-directed.js.map