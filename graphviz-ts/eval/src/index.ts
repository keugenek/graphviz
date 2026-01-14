/**
 * graphviz-ts Evaluation Framework
 *
 * Agentic evaluation system that compares graphviz-ts output against real Graphviz
 * and provides automated fix pipelines for Claude Code integration.
 */

export * from './types';
export * from './test-generator';
export * from './runner';
export * from './comparator';
export * from './report-generator';
export * from './fix-pipeline';

// Re-export key functions for easy access
import { generateTestCases } from './test-generator';
import { runAllTests, runBoth, isGraphvizAvailable, getGraphvizVersion } from './runner';
import { compare, compareAll } from './comparator';
import { generateReport, generateHtmlReport, generateTextReport, saveReports } from './report-generator';
import { generateFixPrompt, generateBatchFixPrompt, createInteractivePrompt, runFixPipeline } from './fix-pipeline';

/**
 * Run a complete evaluation
 */
export async function evaluate(options?: {
  category?: string;
  layout?: string;
  difficulty?: string;
  outputDir?: string;
}) {
  // Generate test cases
  let testCases = generateTestCases();

  // Apply filters
  if (options?.category) {
    testCases = testCases.filter((t) => t.category === options.category);
  }
  if (options?.layout) {
    testCases = testCases.filter((t) => t.layout === options.layout);
  }
  if (options?.difficulty) {
    testCases = testCases.filter((t) => t.difficulty === options.difficulty);
  }

  // Run tests
  const results = await runAllTests(testCases);

  // Compare
  const comparisons = compareAll(results);

  // Generate report
  const report = generateReport(comparisons);

  // Save if output dir specified
  if (options?.outputDir) {
    saveReports(report, options.outputDir);
  }

  return report;
}

/**
 * Quick evaluation for CI/CD
 */
export async function quickEvaluate() {
  return evaluate({ difficulty: 'basic' });
}

/**
 * Get system info
 */
export function getSystemInfo() {
  return {
    graphvizAvailable: isGraphvizAvailable(),
    graphvizVersion: getGraphvizVersion(),
    testCaseCount: generateTestCases().length,
  };
}
