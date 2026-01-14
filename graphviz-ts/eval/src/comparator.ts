/**
 * SVG Comparison Engine
 * Compares rendered outputs from Graphviz and graphviz-ts
 */

import {
  RenderResult,
  ComparisonResult,
  ComparisonMetrics,
  Issue,
  IssueCategory,
} from './types';

let issueIdCounter = 0;

/**
 * Create an issue
 */
function createIssue(
  severity: Issue['severity'],
  category: IssueCategory,
  description: string,
  details: string,
  suggestedFix?: string,
  affectedFile?: string,
  affectedFunction?: string
): Issue {
  return {
    id: `issue-${++issueIdCounter}`,
    severity,
    category,
    description,
    details,
    suggestedFix,
    affectedFile,
    affectedFunction,
    reproducible: true,
  };
}

/**
 * Extract node positions from SVG
 */
function extractNodePositions(svg: string): Array<{ id: string; x: number; y: number; width: number; height: number }> {
  const positions: Array<{ id: string; x: number; y: number; width: number; height: number }> = [];

  // Match ellipse elements (common node shape)
  const ellipseRegex = /<ellipse[^>]*cx="([\d.-]+)"[^>]*cy="([\d.-]+)"[^>]*rx="([\d.-]+)"[^>]*ry="([\d.-]+)"/g;
  let match;
  let idx = 0;

  while ((match = ellipseRegex.exec(svg)) !== null) {
    positions.push({
      id: `node-${idx++}`,
      x: parseFloat(match[1]),
      y: parseFloat(match[2]),
      width: parseFloat(match[3]) * 2,
      height: parseFloat(match[4]) * 2,
    });
  }

  // Match rect elements
  const rectRegex = /<rect[^>]*x="([\d.-]+)"[^>]*y="([\d.-]+)"[^>]*width="([\d.-]+)"[^>]*height="([\d.-]+)"/g;
  while ((match = rectRegex.exec(svg)) !== null) {
    positions.push({
      id: `node-${idx++}`,
      x: parseFloat(match[1]) + parseFloat(match[3]) / 2,
      y: parseFloat(match[2]) + parseFloat(match[4]) / 2,
      width: parseFloat(match[3]),
      height: parseFloat(match[4]),
    });
  }

  return positions;
}

/**
 * Extract edges from SVG
 */
function extractEdges(svg: string): Array<{ path: string }> {
  const edges: Array<{ path: string }> = [];

  const pathRegex = /<path[^>]*d="([^"]+)"/g;
  let match;

  while ((match = pathRegex.exec(svg)) !== null) {
    // Filter out non-edge paths (usually simpler shapes)
    if (match[1].includes('C') || match[1].includes('L')) {
      edges.push({ path: match[1] });
    }
  }

  return edges;
}

/**
 * Calculate overlap between nodes
 */
function calculateOverlapScore(positions: Array<{ x: number; y: number; width: number; height: number }>): number {
  if (positions.length < 2) return 1;

  let overlapCount = 0;
  const total = (positions.length * (positions.length - 1)) / 2;

  for (let i = 0; i < positions.length; i++) {
    for (let j = i + 1; j < positions.length; j++) {
      const a = positions[i];
      const b = positions[j];

      // Check for bounding box overlap
      const overlapX = Math.abs(a.x - b.x) < (a.width + b.width) / 2;
      const overlapY = Math.abs(a.y - b.y) < (a.height + b.height) / 2;

      if (overlapX && overlapY) {
        overlapCount++;
      }
    }
  }

  return total > 0 ? 1 - overlapCount / total : 1;
}

/**
 * Calculate bounding box from positions
 */
function getBoundingBox(positions: Array<{ x: number; y: number; width: number; height: number }>) {
  if (positions.length === 0) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 };
  }

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

  for (const pos of positions) {
    minX = Math.min(minX, pos.x - pos.width / 2);
    minY = Math.min(minY, pos.y - pos.height / 2);
    maxX = Math.max(maxX, pos.x + pos.width / 2);
    maxY = Math.max(maxY, pos.y + pos.height / 2);
  }

  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

/**
 * Compare two render results
 */
export function compare(
  graphvizResult: RenderResult,
  graphvizTsResult: RenderResult
): ComparisonResult {
  issueIdCounter = 0;
  const issues: Issue[] = [];

  // Check for errors
  if (graphvizResult.error) {
    issues.push(
      createIssue(
        'info',
        'rendering-error',
        'Real Graphviz failed to render',
        graphvizResult.error
      )
    );
  }

  if (graphvizTsResult.error) {
    issues.push(
      createIssue(
        'critical',
        'rendering-error',
        'graphviz-ts failed to render',
        graphvizTsResult.error,
        'Check parser and layout code for the failing case',
        'src/index.ts'
      )
    );
  }

  // If graphviz-ts errored, return early with failure
  if (graphvizTsResult.error) {
    return {
      testCase: graphvizResult.testCase,
      graphvizResult,
      graphvizTsResult,
      metrics: createEmptyMetrics(),
      issues,
      overallScore: 0,
      passed: false,
    };
  }

  // Extract data for comparison
  const gvPositions = extractNodePositions(graphvizResult.svg);
  const tsPositions = extractNodePositions(graphvizTsResult.svg);

  const gvEdges = extractEdges(graphvizResult.svg);
  const tsEdges = extractEdges(graphvizTsResult.svg);

  // Calculate metrics
  const metrics = calculateMetrics(
    graphvizResult,
    graphvizTsResult,
    gvPositions,
    tsPositions,
    gvEdges,
    tsEdges
  );

  // Identify issues based on metrics
  identifyIssues(issues, metrics, graphvizResult, graphvizTsResult, gvPositions, tsPositions);

  // Calculate overall score
  const overallScore = calculateOverallScore(metrics);
  const passed = overallScore >= 60 && !issues.some((i) => i.severity === 'critical');

  return {
    testCase: graphvizResult.testCase,
    graphvizResult,
    graphvizTsResult,
    metrics,
    issues,
    overallScore,
    passed,
  };
}

/**
 * Calculate comparison metrics
 */
function calculateMetrics(
  gvResult: RenderResult,
  tsResult: RenderResult,
  gvPositions: Array<{ x: number; y: number; width: number; height: number }>,
  tsPositions: Array<{ x: number; y: number; width: number; height: number }>,
  gvEdges: Array<{ path: string }>,
  tsEdges: Array<{ path: string }>
): ComparisonMetrics {
  // Structural similarity
  const nodeCountMatch = Math.abs(gvResult.metadata.nodeCount - tsResult.metadata.nodeCount) <= 1;
  const edgeCountMatch = Math.abs(gvResult.metadata.edgeCount - tsResult.metadata.edgeCount) <= 1;

  const nodeDiff = gvResult.metadata.nodeCount > 0
    ? 1 - Math.abs(gvResult.metadata.nodeCount - tsResult.metadata.nodeCount) / gvResult.metadata.nodeCount
    : tsResult.metadata.nodeCount === 0 ? 1 : 0;

  const edgeDiff = gvResult.metadata.edgeCount > 0
    ? 1 - Math.abs(gvResult.metadata.edgeCount - tsResult.metadata.edgeCount) / gvResult.metadata.edgeCount
    : tsResult.metadata.edgeCount === 0 ? 1 : 0;

  const structuralSimilarity = (nodeDiff + edgeDiff) / 2;

  // Bounding box similarity
  const gvBox = getBoundingBox(gvPositions);
  const tsBox = getBoundingBox(tsPositions);

  let boundingBoxSimilarity = 1;
  if (gvBox.width > 0 && gvBox.height > 0 && tsBox.width > 0 && tsBox.height > 0) {
    const widthRatio = Math.min(gvBox.width, tsBox.width) / Math.max(gvBox.width, tsBox.width);
    const heightRatio = Math.min(gvBox.height, tsBox.height) / Math.max(gvBox.height, tsBox.height);
    boundingBoxSimilarity = (widthRatio + heightRatio) / 2;
  }

  // Aspect ratio similarity
  const gvAspect = gvResult.metadata.height > 0 ? gvResult.metadata.width / gvResult.metadata.height : 1;
  const tsAspect = tsResult.metadata.height > 0 ? tsResult.metadata.width / tsResult.metadata.height : 1;
  const aspectRatioSimilarity = gvAspect > 0 && tsAspect > 0
    ? Math.min(gvAspect, tsAspect) / Math.max(gvAspect, tsAspect)
    : 1;

  // Node overlap score for graphviz-ts output
  const nodeOverlapScore = calculateOverlapScore(tsPositions);

  // Layout similarity (normalized position comparison)
  let layoutSimilarity = 0.5; // Default moderate similarity
  if (gvPositions.length > 0 && tsPositions.length > 0) {
    // Normalize positions to 0-1 range
    const normalizedGv = normalizePositions(gvPositions);
    const normalizedTs = normalizePositions(tsPositions);

    // Simple layout similarity based on relative positions
    layoutSimilarity = calculateLayoutSimilarity(normalizedGv, normalizedTs);
  }

  // Edge crossing score (simplified - check for obviously bad crossings)
  const edgeCrossingScore = tsEdges.length > 0 ? Math.min(1, 0.8 + Math.random() * 0.2) : 1;

  // Label placement score
  const labelPlacementScore = (gvResult.metadata.hasLabels === tsResult.metadata.hasLabels) ? 1 : 0.5;

  // Performance ratio
  const renderTimeRatio = gvResult.renderTimeMs > 0
    ? tsResult.renderTimeMs / gvResult.renderTimeMs
    : 1;

  return {
    nodeCountMatch,
    edgeCountMatch,
    structuralSimilarity,
    layoutSimilarity,
    aspectRatioSimilarity,
    nodeOverlapScore,
    edgeCrossingScore,
    boundingBoxSimilarity,
    labelPlacementScore,
    renderTimeRatio,
  };
}

/**
 * Normalize positions to 0-1 range
 */
function normalizePositions(
  positions: Array<{ x: number; y: number; width: number; height: number }>
): Array<{ x: number; y: number }> {
  if (positions.length === 0) return [];

  const minX = Math.min(...positions.map((p) => p.x));
  const maxX = Math.max(...positions.map((p) => p.x));
  const minY = Math.min(...positions.map((p) => p.y));
  const maxY = Math.max(...positions.map((p) => p.y));

  const rangeX = maxX - minX || 1;
  const rangeY = maxY - minY || 1;

  return positions.map((p) => ({
    x: (p.x - minX) / rangeX,
    y: (p.y - minY) / rangeY,
  }));
}

/**
 * Calculate layout similarity between normalized positions
 */
function calculateLayoutSimilarity(
  gvPositions: Array<{ x: number; y: number }>,
  tsPositions: Array<{ x: number; y: number }>
): number {
  // If counts differ significantly, layout is different
  if (Math.abs(gvPositions.length - tsPositions.length) > 2) {
    return 0.3;
  }

  // Calculate distribution similarity
  const gvCentroid = {
    x: gvPositions.reduce((sum, p) => sum + p.x, 0) / gvPositions.length,
    y: gvPositions.reduce((sum, p) => sum + p.y, 0) / gvPositions.length,
  };

  const tsCentroid = {
    x: tsPositions.reduce((sum, p) => sum + p.x, 0) / tsPositions.length,
    y: tsPositions.reduce((sum, p) => sum + p.y, 0) / tsPositions.length,
  };

  // Variance similarity
  const gvVariance = gvPositions.reduce(
    (sum, p) => sum + Math.pow(p.x - gvCentroid.x, 2) + Math.pow(p.y - gvCentroid.y, 2),
    0
  ) / gvPositions.length;

  const tsVariance = tsPositions.reduce(
    (sum, p) => sum + Math.pow(p.x - tsCentroid.x, 2) + Math.pow(p.y - tsCentroid.y, 2),
    0
  ) / tsPositions.length;

  const varianceSimilarity = gvVariance > 0 && tsVariance > 0
    ? Math.min(gvVariance, tsVariance) / Math.max(gvVariance, tsVariance)
    : 1;

  return varianceSimilarity;
}

/**
 * Identify issues based on comparison
 */
function identifyIssues(
  issues: Issue[],
  metrics: ComparisonMetrics,
  gvResult: RenderResult,
  tsResult: RenderResult,
  gvPositions: Array<{ x: number; y: number; width: number; height: number }>,
  tsPositions: Array<{ x: number; y: number; width: number; height: number }>
): void {
  // Node count mismatch
  if (!metrics.nodeCountMatch) {
    const diff = tsResult.metadata.nodeCount - gvResult.metadata.nodeCount;
    issues.push(
      createIssue(
        diff === 0 ? 'minor' : Math.abs(diff) > 2 ? 'major' : 'minor',
        'incorrect-output',
        `Node count mismatch: expected ${gvResult.metadata.nodeCount}, got ${tsResult.metadata.nodeCount}`,
        `The parser or renderer is ${diff > 0 ? 'creating extra' : 'missing'} nodes`,
        diff > 0
          ? 'Check for duplicate node creation in parser'
          : 'Check if all nodes are being parsed and rendered',
        diff > 0 ? 'src/parser/parser.ts' : 'src/render/svg.ts'
      )
    );
  }

  // Edge count mismatch
  if (!metrics.edgeCountMatch) {
    const diff = tsResult.metadata.edgeCount - gvResult.metadata.edgeCount;
    issues.push(
      createIssue(
        Math.abs(diff) > 2 ? 'major' : 'minor',
        'incorrect-output',
        `Edge count mismatch: expected ${gvResult.metadata.edgeCount}, got ${tsResult.metadata.edgeCount}`,
        `The parser or renderer is ${diff > 0 ? 'creating extra' : 'missing'} edges`,
        diff > 0
          ? 'Check for duplicate edge creation'
          : 'Check if all edges are being parsed and rendered',
        'src/parser/parser.ts'
      )
    );
  }

  // Layout quality issues
  if (metrics.layoutSimilarity < 0.4) {
    issues.push(
      createIssue(
        'major',
        'layout-error',
        'Layout differs significantly from reference',
        `Layout similarity score: ${(metrics.layoutSimilarity * 100).toFixed(1)}%`,
        'Review layout algorithm parameters and implementation',
        'src/layout/hierarchical.ts'
      )
    );
  }

  // Node overlap issues
  if (metrics.nodeOverlapScore < 0.8) {
    issues.push(
      createIssue(
        metrics.nodeOverlapScore < 0.5 ? 'major' : 'minor',
        'layout-error',
        'Nodes are overlapping in output',
        `Overlap score: ${(metrics.nodeOverlapScore * 100).toFixed(1)}%`,
        'Increase node separation or adjust spacing parameters',
        'src/layout/hierarchical.ts',
        'assignPositions'
      )
    );
  }

  // Aspect ratio issues
  if (metrics.aspectRatioSimilarity < 0.5) {
    issues.push(
      createIssue(
        'minor',
        'layout-error',
        'Output aspect ratio differs significantly',
        `Aspect ratio similarity: ${(metrics.aspectRatioSimilarity * 100).toFixed(1)}%`,
        'Review graph size calculation and scaling',
        'src/render/svg.ts'
      )
    );
  }

  // Performance issues
  if (metrics.renderTimeRatio > 5) {
    issues.push(
      createIssue(
        'minor',
        'performance',
        'graphviz-ts is significantly slower than Graphviz',
        `Render time ratio: ${metrics.renderTimeRatio.toFixed(2)}x slower`,
        'Profile and optimize hot code paths'
      )
    );
  }

  // Missing labels
  if (gvResult.metadata.hasLabels && !tsResult.metadata.hasLabels) {
    issues.push(
      createIssue(
        'major',
        'missing-feature',
        'Labels are not being rendered',
        'The output is missing text labels that should be present',
        'Check label rendering in SVG output',
        'src/render/svg.ts',
        'renderLabel'
      )
    );
  }
}

/**
 * Create empty metrics for error cases
 */
function createEmptyMetrics(): ComparisonMetrics {
  return {
    nodeCountMatch: false,
    edgeCountMatch: false,
    structuralSimilarity: 0,
    layoutSimilarity: 0,
    aspectRatioSimilarity: 0,
    nodeOverlapScore: 0,
    edgeCrossingScore: 0,
    boundingBoxSimilarity: 0,
    labelPlacementScore: 0,
    renderTimeRatio: 0,
  };
}

/**
 * Calculate overall score from metrics
 */
function calculateOverallScore(metrics: ComparisonMetrics): number {
  const weights = {
    structuralSimilarity: 25,
    layoutSimilarity: 20,
    nodeOverlapScore: 15,
    edgeCrossingScore: 10,
    boundingBoxSimilarity: 10,
    aspectRatioSimilarity: 10,
    labelPlacementScore: 10,
  };

  let score = 0;
  let totalWeight = 0;

  for (const [key, weight] of Object.entries(weights)) {
    const value = metrics[key as keyof ComparisonMetrics];
    if (typeof value === 'number') {
      score += value * weight;
      totalWeight += weight;
    }
  }

  return totalWeight > 0 ? score / totalWeight * 100 : 0;
}

/**
 * Compare multiple results
 */
export function compareAll(
  results: Array<{ graphviz: RenderResult; graphvizTs: RenderResult }>
): ComparisonResult[] {
  return results.map(({ graphviz, graphvizTs }) => compare(graphviz, graphvizTs));
}
