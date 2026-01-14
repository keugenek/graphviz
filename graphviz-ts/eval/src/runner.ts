/**
 * Graph Renderer Runner
 * Executes both real Graphviz and graphviz-ts on test cases
 */

import { execSync, spawn } from 'child_process';
import { TestCase, RenderResult, LayoutEngine } from './types';
import * as path from 'path';

// Import graphviz-ts dynamically to avoid compilation issues
let GraphvizTs: typeof import('../../src/index').Graphviz | null = null;

async function loadGraphvizTs() {
  if (!GraphvizTs) {
    const module = await import('../../src/index');
    GraphvizTs = module.Graphviz;
  }
  return GraphvizTs;
}

/**
 * Parse SVG to extract metadata
 */
function extractSvgMetadata(svg: string): RenderResult['metadata'] {
  const nodeCount = (svg.match(/<(ellipse|rect|polygon|circle)/g) || []).length;
  const edgeCount = (svg.match(/<path[^>]*class="edge"/g) || []).length ||
                   (svg.match(/<path[^>]*stroke/g) || []).length / 2;

  // Extract dimensions
  const widthMatch = svg.match(/width="([\d.]+)/);
  const heightMatch = svg.match(/height="([\d.]+)/);
  const viewBoxMatch = svg.match(/viewBox="[\d.-]+\s+[\d.-]+\s+([\d.]+)\s+([\d.]+)"/);

  let width = 0, height = 0;
  if (widthMatch) width = parseFloat(widthMatch[1]);
  else if (viewBoxMatch) width = parseFloat(viewBoxMatch[1]);

  if (heightMatch) height = parseFloat(heightMatch[1]);
  else if (viewBoxMatch) height = parseFloat(viewBoxMatch[2]);

  const hasLabels = /<text/.test(svg);
  const hasShapes = /<(rect|polygon|circle)/.test(svg);

  return {
    nodeCount: Math.max(1, nodeCount),
    edgeCount: Math.max(0, Math.floor(edgeCount)),
    width,
    height,
    hasLabels,
    hasShapes,
  };
}

/**
 * Run real Graphviz on a test case
 */
export async function runGraphviz(
  testCase: TestCase,
  timeout: number = 30000
): Promise<RenderResult> {
  const startTime = Date.now();

  try {
    // Map layout engine to command
    const cmd = testCase.layout;

    // Run graphviz with dot input
    const result = execSync(`${cmd} -Tsvg`, {
      input: testCase.dot,
      encoding: 'utf-8',
      timeout,
      maxBuffer: 10 * 1024 * 1024, // 10MB
    });

    const renderTime = Date.now() - startTime;

    return {
      testCase,
      engine: 'graphviz',
      svg: result,
      renderTimeMs: renderTime,
      metadata: extractSvgMetadata(result),
    };
  } catch (error) {
    const renderTime = Date.now() - startTime;
    const err = error as Error & { stderr?: string };

    return {
      testCase,
      engine: 'graphviz',
      svg: '',
      error: err.message || err.stderr || 'Unknown error',
      renderTimeMs: renderTime,
      metadata: {
        nodeCount: 0,
        edgeCount: 0,
        width: 0,
        height: 0,
        hasLabels: false,
        hasShapes: false,
      },
    };
  }
}

/**
 * Run graphviz-ts on a test case
 */
export async function runGraphvizTs(
  testCase: TestCase,
  timeout: number = 30000
): Promise<RenderResult> {
  const startTime = Date.now();

  try {
    const Gviz = await loadGraphvizTs();
    if (!Gviz) {
      throw new Error('Failed to load graphviz-ts');
    }

    let svg: string;

    // Use appropriate layout based on test case
    switch (testCase.layout) {
      case 'dot':
        svg = Gviz.dot(testCase.dot);
        break;
      case 'neato':
        svg = Gviz.neato(testCase.dot);
        break;
      case 'fdp':
        svg = Gviz.fdp(testCase.dot);
        break;
      case 'circo':
        svg = Gviz.circo(testCase.dot);
        break;
      case 'twopi':
        svg = Gviz.twopi(testCase.dot);
        break;
      default:
        svg = Gviz.dot(testCase.dot);
    }

    const renderTime = Date.now() - startTime;

    return {
      testCase,
      engine: 'graphviz-ts',
      svg,
      renderTimeMs: renderTime,
      metadata: extractSvgMetadata(svg),
    };
  } catch (error) {
    const renderTime = Date.now() - startTime;
    const err = error as Error;

    return {
      testCase,
      engine: 'graphviz-ts',
      svg: '',
      error: err.message || 'Unknown error',
      renderTimeMs: renderTime,
      metadata: {
        nodeCount: 0,
        edgeCount: 0,
        width: 0,
        height: 0,
        hasLabels: false,
        hasShapes: false,
      },
    };
  }
}

/**
 * Run both engines on a test case
 */
export async function runBoth(
  testCase: TestCase,
  timeout: number = 30000
): Promise<{ graphviz: RenderResult; graphvizTs: RenderResult }> {
  const [graphviz, graphvizTs] = await Promise.all([
    runGraphviz(testCase, timeout),
    runGraphvizTs(testCase, timeout),
  ]);

  return { graphviz, graphvizTs };
}

/**
 * Run all test cases through both engines
 */
export async function runAllTests(
  testCases: TestCase[],
  timeout: number = 30000,
  onProgress?: (completed: number, total: number, current: TestCase) => void
): Promise<Array<{ graphviz: RenderResult; graphvizTs: RenderResult }>> {
  const results: Array<{ graphviz: RenderResult; graphvizTs: RenderResult }> = [];

  for (let i = 0; i < testCases.length; i++) {
    const testCase = testCases[i];

    if (onProgress) {
      onProgress(i, testCases.length, testCase);
    }

    const result = await runBoth(testCase, timeout);
    results.push(result);
  }

  return results;
}

/**
 * Check if real Graphviz is available
 */
export function isGraphvizAvailable(): boolean {
  try {
    execSync('dot -V', { encoding: 'utf-8', stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Get Graphviz version
 */
export function getGraphvizVersion(): string {
  try {
    const result = execSync('dot -V 2>&1', { encoding: 'utf-8' });
    const match = result.match(/graphviz version ([\d.]+)/);
    return match ? match[1] : 'unknown';
  } catch {
    return 'not installed';
  }
}
