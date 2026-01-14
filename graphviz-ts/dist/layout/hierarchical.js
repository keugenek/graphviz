"use strict";
/**
 * Hierarchical Layout Engine (dot-like)
 *
 * Implements a simplified version of the Sugiyama algorithm:
 * 1. Cycle removal - break cycles by reversing edges
 * 2. Rank assignment - assign nodes to horizontal layers
 * 3. Ordering - minimize edge crossings within ranks
 * 4. Position assignment - assign x-coordinates
 * 5. Edge routing - compute edge paths
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.hierarchicalLayout = hierarchicalLayout;
const graph_1 = require("../core/graph");
const DEFAULT_OPTIONS = {
    rankdir: 'TB',
    ranksep: 50,
    nodesep: 30,
    marginx: 20,
    marginy: 20,
};
/**
 * Apply hierarchical layout to a graph
 */
function hierarchicalLayout(graph, options = {}) {
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
    if (graph.attributes.rankdir) {
        opts.rankdir = graph.attributes.rankdir;
    }
    if (typeof graph.attributes.ranksep === 'number') {
        opts.ranksep = graph.attributes.ranksep;
    }
    if (typeof graph.attributes.nodesep === 'number') {
        opts.nodesep = graph.attributes.nodesep;
    }
    // Handle empty graph
    if (result.nodes.size === 0) {
        result.boundingBox = { x: 0, y: 0, width: 0, height: 0 };
        return result;
    }
    // Initialize node dimensions
    initializeNodeDimensions(result);
    // Step 1: Remove cycles by reversing edges
    const reversedEdges = removeCycles(result);
    // Step 2: Assign ranks (layers) to nodes
    const ranks = assignRanks(result);
    // Step 3: Add virtual nodes for edges spanning multiple ranks
    const virtualNodeMap = addVirtualNodes(result, ranks);
    // Step 4: Order nodes within ranks to minimize crossings
    orderNodes(result, ranks);
    // Step 5: Assign positions
    assignPositions(result, ranks, opts);
    // Step 6: Remove virtual nodes and route edges
    routeEdges(result, virtualNodeMap, reversedEdges);
    // Step 7: Handle different rank directions
    transformForRankdir(result, opts.rankdir);
    // Calculate bounding box
    result.boundingBox = calculateBoundingBox(result, opts);
    return result;
}
/**
 * Initialize node dimensions based on label/shape
 */
function initializeNodeDimensions(graph) {
    for (const node of graph.nodes.values()) {
        // Default dimensions
        node.width = node.attributes.width
            ? node.attributes.width * 72 // Convert inches to points
            : 60;
        node.height = node.attributes.height
            ? node.attributes.height * 72
            : 40;
        // Estimate dimensions based on label
        const label = node.attributes.label || node.id;
        if (label) {
            const fontSize = node.attributes.fontsize || 14;
            const estimatedWidth = label.length * fontSize * 0.6 + 20;
            const estimatedHeight = fontSize + 20;
            if (!node.attributes.width) {
                node.width = Math.max(node.width, estimatedWidth);
            }
            if (!node.attributes.height) {
                node.height = Math.max(node.height, estimatedHeight);
            }
        }
        // Adjust for shape
        const shape = node.attributes.shape || 'ellipse';
        if (shape === 'point') {
            node.width = 5;
            node.height = 5;
        }
        else if (shape === 'circle' || shape === 'doublecircle') {
            const size = Math.max(node.width, node.height);
            node.width = size;
            node.height = size;
        }
    }
}
/**
 * Remove cycles by reversing some edges (greedy DFS-based)
 */
function removeCycles(graph) {
    const reversed = new Set();
    const visited = new Set();
    const recStack = new Set();
    function dfs(nodeId) {
        visited.add(nodeId);
        recStack.add(nodeId);
        for (const edge of graph.edges) {
            if (edge.source !== nodeId)
                continue;
            const target = edge.target;
            if (!visited.has(target)) {
                dfs(target);
            }
            else if (recStack.has(target)) {
                // Found a cycle - reverse this edge
                const temp = edge.source;
                edge.source = edge.target;
                edge.target = temp;
                reversed.add(edge.id);
                edge.reversed = true;
            }
        }
        recStack.delete(nodeId);
    }
    for (const nodeId of graph.nodes.keys()) {
        if (!visited.has(nodeId)) {
            dfs(nodeId);
        }
    }
    return reversed;
}
/**
 * Assign ranks using longest path algorithm
 */
function assignRanks(graph) {
    const nodeRanks = new Map();
    const ranks = new Map();
    // Calculate in-degree for each node
    const inDegree = new Map();
    for (const nodeId of graph.nodes.keys()) {
        inDegree.set(nodeId, 0);
    }
    for (const edge of graph.edges) {
        inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1);
    }
    // Find source nodes (no incoming edges)
    const queue = [];
    for (const [nodeId, degree] of inDegree) {
        if (degree === 0) {
            queue.push(nodeId);
            nodeRanks.set(nodeId, 0);
        }
    }
    // If no sources found (all nodes in cycles), start with first node
    if (queue.length === 0 && graph.nodes.size > 0) {
        const firstNode = graph.nodes.keys().next().value;
        queue.push(firstNode);
        nodeRanks.set(firstNode, 0);
    }
    // BFS to assign ranks
    while (queue.length > 0) {
        const nodeId = queue.shift();
        const nodeRank = nodeRanks.get(nodeId);
        for (const edge of graph.edges) {
            if (edge.source !== nodeId)
                continue;
            const target = edge.target;
            const minLen = typeof edge.attributes.minlen === 'number'
                ? edge.attributes.minlen
                : 1;
            const newRank = nodeRank + minLen;
            const currentRank = nodeRanks.get(target);
            if (currentRank === undefined || newRank > currentRank) {
                nodeRanks.set(target, newRank);
            }
            inDegree.set(target, (inDegree.get(target) || 1) - 1);
            if (inDegree.get(target) === 0) {
                queue.push(target);
            }
        }
    }
    // Handle nodes not reached (disconnected components)
    for (const nodeId of graph.nodes.keys()) {
        if (!nodeRanks.has(nodeId)) {
            nodeRanks.set(nodeId, 0);
        }
    }
    // Build rank structure
    for (const [nodeId, rank] of nodeRanks) {
        const node = graph.nodes.get(nodeId);
        node.rank = rank;
        if (!ranks.has(rank)) {
            ranks.set(rank, { nodes: [], y: 0 });
        }
        ranks.get(rank).nodes.push(nodeId);
    }
    return ranks;
}
/**
 * Add virtual nodes for edges spanning multiple ranks
 */
function addVirtualNodes(graph, ranks) {
    const virtualNodeMap = new Map();
    let virtualCounter = 0;
    for (const edge of [...graph.edges]) {
        const sourceNode = graph.nodes.get(edge.source);
        const targetNode = graph.nodes.get(edge.target);
        const sourceRank = sourceNode.rank;
        const targetRank = targetNode.rank;
        const rankDiff = targetRank - sourceRank;
        if (rankDiff > 1) {
            // Need virtual nodes
            const virtualNodes = [];
            for (let r = sourceRank + 1; r < targetRank; r++) {
                const virtualId = `_virtual_${virtualCounter++}`;
                virtualNodes.push(virtualId);
                // Create virtual node
                const virtualNode = {
                    id: virtualId,
                    attributes: {},
                    rank: r,
                    order: 0,
                    x: 0,
                    y: 0,
                    width: 0,
                    height: 0,
                    isVirtual: true,
                    originalEdge: edge,
                };
                graph.nodes.set(virtualId, virtualNode);
                // Add to rank
                if (!ranks.has(r)) {
                    ranks.set(r, { nodes: [], y: 0 });
                }
                ranks.get(r).nodes.push(virtualId);
            }
            virtualNodeMap.set(edge.id, virtualNodes);
            edge.virtualNodes = virtualNodes;
        }
    }
    return virtualNodeMap;
}
/**
 * Order nodes within ranks to minimize edge crossings (barycenter heuristic)
 */
function orderNodes(graph, ranks) {
    const sortedRanks = Array.from(ranks.keys()).sort((a, b) => a - b);
    // Initialize order
    for (const rank of sortedRanks) {
        const rankData = ranks.get(rank);
        rankData.nodes.forEach((nodeId, i) => {
            graph.nodes.get(nodeId).order = i;
        });
    }
    // Multiple passes of barycenter ordering
    const maxIterations = 24;
    for (let iter = 0; iter < maxIterations; iter++) {
        const direction = iter % 2 === 0 ? 1 : -1;
        const ranksToProcess = direction === 1 ? sortedRanks.slice(1) : sortedRanks.slice(0, -1).reverse();
        let improved = false;
        for (const rank of ranksToProcess) {
            const rankData = ranks.get(rank);
            const adjacentRank = direction === 1 ? rank - 1 : rank + 1;
            // Calculate barycenter for each node
            const barycenters = new Map();
            for (const nodeId of rankData.nodes) {
                const neighbors = getAdjacentNodesInRank(graph, nodeId, adjacentRank);
                if (neighbors.length > 0) {
                    const sum = neighbors.reduce((acc, n) => {
                        return acc + graph.nodes.get(n).order;
                    }, 0);
                    barycenters.set(nodeId, sum / neighbors.length);
                }
                else {
                    barycenters.set(nodeId, graph.nodes.get(nodeId).order);
                }
            }
            // Sort by barycenter
            const oldOrder = [...rankData.nodes];
            rankData.nodes.sort((a, b) => {
                const bcA = barycenters.get(a);
                const bcB = barycenters.get(b);
                if (bcA !== bcB)
                    return bcA - bcB;
                return graph.nodes.get(a).order -
                    graph.nodes.get(b).order;
            });
            // Update order
            rankData.nodes.forEach((nodeId, i) => {
                graph.nodes.get(nodeId).order = i;
            });
            // Check if order changed
            if (!arraysEqual(oldOrder, rankData.nodes)) {
                improved = true;
            }
        }
        if (!improved)
            break;
    }
}
/**
 * Get nodes adjacent to a node that are in a specific rank
 */
function getAdjacentNodesInRank(graph, nodeId, rank) {
    const adjacent = [];
    for (const edge of graph.edges) {
        if (edge.source === nodeId) {
            const target = graph.nodes.get(edge.target);
            if (target.rank === rank) {
                adjacent.push(edge.target);
            }
        }
        if (edge.target === nodeId) {
            const source = graph.nodes.get(edge.source);
            if (source.rank === rank) {
                adjacent.push(edge.source);
            }
        }
    }
    // Also check virtual node connections
    for (const edge of graph.edges) {
        const virtualNodes = edge.virtualNodes;
        if (virtualNodes) {
            const fullPath = [edge.source, ...virtualNodes, edge.target];
            const idx = fullPath.indexOf(nodeId);
            if (idx !== -1) {
                if (idx > 0) {
                    const prev = graph.nodes.get(fullPath[idx - 1]);
                    if (prev.rank === rank && !adjacent.includes(fullPath[idx - 1])) {
                        adjacent.push(fullPath[idx - 1]);
                    }
                }
                if (idx < fullPath.length - 1) {
                    const next = graph.nodes.get(fullPath[idx + 1]);
                    if (next.rank === rank && !adjacent.includes(fullPath[idx + 1])) {
                        adjacent.push(fullPath[idx + 1]);
                    }
                }
            }
        }
    }
    return adjacent;
}
/**
 * Check if two arrays are equal
 */
function arraysEqual(a, b) {
    if (a.length !== b.length)
        return false;
    for (let i = 0; i < a.length; i++) {
        if (a[i] !== b[i])
            return false;
    }
    return true;
}
/**
 * Assign x and y positions to nodes
 */
function assignPositions(graph, ranks, options) {
    const sortedRanks = Array.from(ranks.keys()).sort((a, b) => a - b);
    // Calculate y positions for each rank
    let currentY = options.marginy;
    for (const rank of sortedRanks) {
        const rankData = ranks.get(rank);
        // Find max height in this rank
        let maxHeight = 0;
        for (const nodeId of rankData.nodes) {
            const node = graph.nodes.get(nodeId);
            maxHeight = Math.max(maxHeight, node.height);
        }
        rankData.y = currentY + maxHeight / 2;
        currentY += maxHeight + options.ranksep;
    }
    // Calculate x positions within each rank
    for (const rank of sortedRanks) {
        const rankData = ranks.get(rank);
        let currentX = options.marginx;
        for (const nodeId of rankData.nodes) {
            const node = graph.nodes.get(nodeId);
            node.x = currentX + node.width / 2;
            node.y = rankData.y;
            currentX += node.width + options.nodesep;
        }
    }
    // Center ranks (optional improvement)
    centerRanks(graph, ranks, sortedRanks);
}
/**
 * Center all ranks relative to the widest rank
 */
function centerRanks(graph, ranks, sortedRanks) {
    // Find the widest rank
    let maxWidth = 0;
    for (const rank of sortedRanks) {
        const rankData = ranks.get(rank);
        if (rankData.nodes.length === 0)
            continue;
        const lastNode = graph.nodes.get(rankData.nodes[rankData.nodes.length - 1]);
        const width = lastNode.x + lastNode.width / 2;
        maxWidth = Math.max(maxWidth, width);
    }
    // Center each rank
    for (const rank of sortedRanks) {
        const rankData = ranks.get(rank);
        if (rankData.nodes.length === 0)
            continue;
        const lastNode = graph.nodes.get(rankData.nodes[rankData.nodes.length - 1]);
        const rankWidth = lastNode.x + lastNode.width / 2;
        const offset = (maxWidth - rankWidth) / 2;
        for (const nodeId of rankData.nodes) {
            const node = graph.nodes.get(nodeId);
            node.x += offset;
        }
    }
}
/**
 * Route edges (create splines) and remove virtual nodes
 */
function routeEdges(graph, virtualNodeMap, reversedEdges) {
    for (const edge of graph.edges) {
        const virtualNodes = virtualNodeMap.get(edge.id);
        if (virtualNodes && virtualNodes.length > 0) {
            // Edge with virtual nodes - create path through them
            const points = [];
            const sourceNode = graph.nodes.get(edge.source);
            points.push({ x: sourceNode.x, y: sourceNode.y });
            for (const virtualId of virtualNodes) {
                const virtualNode = graph.nodes.get(virtualId);
                points.push({ x: virtualNode.x, y: virtualNode.y });
            }
            const targetNode = graph.nodes.get(edge.target);
            points.push({ x: targetNode.x, y: targetNode.y });
            edge.points = points;
            edge.splines = createSplines(points);
            // Remove virtual nodes
            for (const virtualId of virtualNodes) {
                graph.nodes.delete(virtualId);
            }
        }
        else {
            // Direct edge
            const sourceNode = graph.nodes.get(edge.source);
            const targetNode = graph.nodes.get(edge.target);
            edge.points = [
                { x: sourceNode.x, y: sourceNode.y },
                { x: targetNode.x, y: targetNode.y },
            ];
            edge.splines = createSplines(edge.points);
        }
        // Handle reversed edges
        if (reversedEdges.has(edge.id)) {
            // Swap source and target back
            const temp = edge.source;
            edge.source = edge.target;
            edge.target = temp;
            // Reverse the points
            if (edge.points) {
                edge.points.reverse();
            }
            if (edge.splines) {
                edge.splines.reverse();
                for (const spline of edge.splines) {
                    const temp = spline.start;
                    spline.start = spline.end;
                    spline.end = temp;
                    const tempCp = spline.cp1;
                    spline.cp1 = spline.cp2;
                    spline.cp2 = tempCp;
                }
            }
        }
    }
}
/**
 * Create bezier splines from a series of points
 */
function createSplines(points) {
    if (points.length < 2)
        return [];
    const splines = [];
    if (points.length === 2) {
        // Simple straight line as a bezier
        const [p0, p1] = points;
        splines.push({
            start: p0,
            cp1: {
                x: p0.x + (p1.x - p0.x) / 3,
                y: p0.y + (p1.y - p0.y) / 3,
            },
            cp2: {
                x: p0.x + (2 * (p1.x - p0.x)) / 3,
                y: p0.y + (2 * (p1.y - p0.y)) / 3,
            },
            end: p1,
        });
        return splines;
    }
    // Create smooth curves through multiple points using Catmull-Rom to Bezier conversion
    for (let i = 0; i < points.length - 1; i++) {
        const p0 = points[Math.max(0, i - 1)];
        const p1 = points[i];
        const p2 = points[i + 1];
        const p3 = points[Math.min(points.length - 1, i + 2)];
        // Catmull-Rom to Bezier conversion
        const tension = 0.5;
        const cp1x = p1.x + (p2.x - p0.x) * tension / 3;
        const cp1y = p1.y + (p2.y - p0.y) * tension / 3;
        const cp2x = p2.x - (p3.x - p1.x) * tension / 3;
        const cp2y = p2.y - (p3.y - p1.y) * tension / 3;
        splines.push({
            start: p1,
            cp1: { x: cp1x, y: cp1y },
            cp2: { x: cp2x, y: cp2y },
            end: p2,
        });
    }
    return splines;
}
/**
 * Transform coordinates for different rank directions
 */
function transformForRankdir(graph, rankdir) {
    if (rankdir === 'TB')
        return; // Already in top-to-bottom
    for (const node of graph.nodes.values()) {
        const layoutNode = node;
        switch (rankdir) {
            case 'BT':
                layoutNode.y = -layoutNode.y;
                break;
            case 'LR':
                [layoutNode.x, layoutNode.y] = [layoutNode.y, layoutNode.x];
                [layoutNode.width, layoutNode.height] = [layoutNode.height, layoutNode.width];
                break;
            case 'RL':
                [layoutNode.x, layoutNode.y] = [-layoutNode.y, layoutNode.x];
                [layoutNode.width, layoutNode.height] = [layoutNode.height, layoutNode.width];
                break;
        }
    }
    // Transform edge points
    for (const edge of graph.edges) {
        if (edge.points) {
            for (const point of edge.points) {
                switch (rankdir) {
                    case 'BT':
                        point.y = -point.y;
                        break;
                    case 'LR':
                        [point.x, point.y] = [point.y, point.x];
                        break;
                    case 'RL':
                        [point.x, point.y] = [-point.y, point.x];
                        break;
                }
            }
        }
        if (edge.splines) {
            for (const spline of edge.splines) {
                const transform = (p) => {
                    switch (rankdir) {
                        case 'BT':
                            p.y = -p.y;
                            break;
                        case 'LR':
                            [p.x, p.y] = [p.y, p.x];
                            break;
                        case 'RL':
                            [p.x, p.y] = [-p.y, p.x];
                            break;
                    }
                };
                transform(spline.start);
                transform(spline.cp1);
                transform(spline.cp2);
                transform(spline.end);
            }
        }
    }
}
/**
 * Calculate bounding box of the laid out graph
 */
function calculateBoundingBox(graph, options) {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const node of graph.nodes.values()) {
        const layoutNode = node;
        const halfWidth = layoutNode.width / 2;
        const halfHeight = layoutNode.height / 2;
        minX = Math.min(minX, layoutNode.x - halfWidth);
        minY = Math.min(minY, layoutNode.y - halfHeight);
        maxX = Math.max(maxX, layoutNode.x + halfWidth);
        maxY = Math.max(maxY, layoutNode.y + halfHeight);
    }
    // Include edge points
    for (const edge of graph.edges) {
        if (edge.points) {
            for (const point of edge.points) {
                minX = Math.min(minX, point.x);
                minY = Math.min(minY, point.y);
                maxX = Math.max(maxX, point.x);
                maxY = Math.max(maxY, point.y);
            }
        }
    }
    if (minX === Infinity) {
        return { x: 0, y: 0, width: 0, height: 0 };
    }
    // Normalize to start from margin
    const offsetX = -minX + options.marginx;
    const offsetY = -minY + options.marginy;
    for (const node of graph.nodes.values()) {
        node.x += offsetX;
        node.y += offsetY;
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
        width: maxX - minX + 2 * options.marginx,
        height: maxY - minY + 2 * options.marginy,
    };
}
//# sourceMappingURL=hierarchical.js.map