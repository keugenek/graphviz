#!/usr/bin/env node
/**
 * graphviz-ts Evaluation CLI
 * Run evaluations, generate reports, and trigger fix pipelines
 */

import * as fs from 'fs';
import * as path from 'path';
import { generateTestCases } from './test-generator';
import { runAllTests, isGraphvizAvailable, getGraphvizVersion } from './runner';
import { compareAll } from './comparator';
import { generateReport, generateTextReport, saveReports } from './report-generator';
import { createInteractivePrompt, runFixPipeline, saveFixRequest } from './fix-pipeline';
import { TestCase, EvaluationReport } from './types';

const REPORTS_DIR = path.join(__dirname, '..', 'reports');

// CI Configuration
const CI_DEFAULTS = {
  passThreshold: 80, // Minimum pass rate % to succeed
  scoreThreshold: 60, // Minimum avg score to succeed
  failOnCritical: true, // Fail if any critical issues
};

/**
 * Parse command line arguments
 */
function parseArgs(args: string[]): {
  command: string;
  options: Record<string, string | boolean>;
} {
  const command = args[0] || 'run';
  const options: Record<string, string | boolean> = {};

  for (let i = 1; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const nextArg = args[i + 1];
      if (nextArg && !nextArg.startsWith('--')) {
        options[key] = nextArg;
        i++;
      } else {
        options[key] = true;
      }
    }
  }

  return { command, options };
}

/**
 * Print help message
 */
function printHelp(): void {
  console.log(`
graphviz-ts Evaluation Tool
============================

Usage: npx ts-node eval/src/cli.ts <command> [options]

Commands:
  run              Run full evaluation (default)
  quick            Run quick evaluation (basic tests only)
  fix              Generate fix prompts for failing tests
  report           Generate report from last evaluation
  list             List available test cases

Options:
  --category <cat>    Filter by category (e.g., simple-graphs, styling)
  --layout <eng>      Filter by layout engine (dot, neato, fdp, circo, twopi)
  --difficulty <d>    Filter by difficulty (basic, intermediate, advanced)
  --output <dir>      Output directory for reports (default: eval/reports)
  --json              Output JSON only
  --quiet             Minimal output
  --ci                CI mode: exit with code 1 if thresholds not met
  --pass-threshold    Minimum pass rate % for CI (default: ${CI_DEFAULTS.passThreshold})
  --score-threshold   Minimum avg score % for CI (default: ${CI_DEFAULTS.scoreThreshold})

Examples:
  npx ts-node eval/src/cli.ts run
  npx ts-node eval/src/cli.ts run --category simple-graphs
  npx ts-node eval/src/cli.ts run --ci --pass-threshold 90
  npx ts-node eval/src/cli.ts quick --ci
  npx ts-node eval/src/cli.ts fix

CI Mode:
  In CI mode, the tool exits with code 1 if:
  - Pass rate is below the threshold (default: ${CI_DEFAULTS.passThreshold}%)
  - Average score is below the threshold (default: ${CI_DEFAULTS.scoreThreshold}%)
  - Any critical issues are found

Environment:
  Graphviz: ${isGraphvizAvailable() ? `v${getGraphvizVersion()}` : 'NOT INSTALLED'}
`);
}

/**
 * Progress indicator for TTY
 */
function showProgress(completed: number, total: number, current: TestCase): void {
  const percent = Math.round((completed / total) * 100);
  const bar = '█'.repeat(Math.floor(percent / 5)) + '░'.repeat(20 - Math.floor(percent / 5));
  process.stdout.write(`\r[${bar}] ${percent}% - ${current.name.padEnd(30)}`);
}

/**
 * CI-friendly progress (no carriage returns)
 */
function showCiProgress(completed: number, total: number, current: TestCase): void {
  // Only show progress at intervals in CI
  const interval = Math.max(1, Math.floor(total / 10));
  if (completed % interval === 0 || completed === total - 1) {
    const percent = Math.round((completed / total) * 100);
    console.log(`[${percent}%] Running: ${current.name}`);
  }
}

/**
 * Check if running in CI environment
 */
function isCI(): boolean {
  return !!(
    process.env.CI ||
    process.env.GITHUB_ACTIONS ||
    process.env.GITLAB_CI ||
    process.env.CIRCLECI ||
    process.env.JENKINS_URL ||
    process.env.TRAVIS
  );
}

/**
 * Evaluate CI result and return exit code
 */
function evaluateCiResult(
  report: EvaluationReport,
  options: Record<string, string | boolean>
): { passed: boolean; reasons: string[] } {
  const passThreshold = parseFloat(options['pass-threshold'] as string) || CI_DEFAULTS.passThreshold;
  const scoreThreshold = parseFloat(options['score-threshold'] as string) || CI_DEFAULTS.scoreThreshold;
  const reasons: string[] = [];

  // Check pass rate
  if (report.passRate < passThreshold) {
    reasons.push(`Pass rate ${report.passRate.toFixed(1)}% below threshold ${passThreshold}%`);
  }

  // Check average score
  if (report.aggregateMetrics.avgOverallScore < scoreThreshold) {
    reasons.push(`Avg score ${report.aggregateMetrics.avgOverallScore.toFixed(1)}% below threshold ${scoreThreshold}%`);
  }

  // Check for critical issues
  if (CI_DEFAULTS.failOnCritical && report.issuesSummary.bySeverity.critical > 0) {
    reasons.push(`Found ${report.issuesSummary.bySeverity.critical} critical issue(s)`);
  }

  return {
    passed: reasons.length === 0,
    reasons,
  };
}

/**
 * Run evaluation
 */
async function runEvaluation(options: Record<string, string | boolean>): Promise<EvaluationReport> {
  const isCiMode = options.ci || isCI();
  const isQuiet = options.quiet || (isCiMode && !options.verbose);

  if (!isQuiet) {
    console.log('\n🔍 graphviz-ts Evaluation\n');
  }

  // Check Graphviz availability
  if (!isGraphvizAvailable()) {
    console.error('❌ Error: Real Graphviz is not installed.');
    console.error('   Install with: apt-get install graphviz');
    process.exit(1);
  }

  if (!isQuiet) {
    console.log(`✓ Graphviz v${getGraphvizVersion()} detected\n`);
  }

  // Get test cases
  let testCases = generateTestCases();

  // Apply filters
  if (options.category) {
    testCases = testCases.filter((t) => t.category === options.category);
    if (!isQuiet) console.log(`Filtering by category: ${options.category}`);
  }

  if (options.layout) {
    testCases = testCases.filter((t) => t.layout === options.layout);
    if (!isQuiet) console.log(`Filtering by layout: ${options.layout}`);
  }

  if (options.difficulty) {
    testCases = testCases.filter((t) => t.difficulty === options.difficulty);
    if (!isQuiet) console.log(`Filtering by difficulty: ${options.difficulty}`);
  }

  if (!isQuiet) {
    console.log(`Running ${testCases.length} test cases...\n`);
  }

  // Determine progress callback
  let progressFn: ((completed: number, total: number, current: TestCase) => void) | undefined;
  if (!isQuiet) {
    progressFn = isCiMode ? showCiProgress : (process.stdout.isTTY ? showProgress : showCiProgress);
  }

  // Run tests
  const startTime = Date.now();
  const results = await runAllTests(testCases, 30000, progressFn);
  const duration = Date.now() - startTime;

  // Clear progress line for TTY
  if (!isQuiet && !isCiMode && process.stdout.isTTY) {
    process.stdout.write('\r' + ' '.repeat(70) + '\r');
  }

  // Compare results
  const comparisons = compareAll(results);

  // Generate report
  const report = generateReport(comparisons);

  // Output
  if (options.json) {
    console.log(JSON.stringify(report, null, 2));
  } else if (!isQuiet) {
    console.log(generateTextReport(report));
    console.log(`\n⏱  Completed in ${(duration / 1000).toFixed(1)}s`);
  }

  // Save reports
  const outputDir = (options.output as string) || REPORTS_DIR;
  saveReports(report, outputDir);

  if (!isQuiet) {
    console.log(`\n📊 Reports saved to ${outputDir}/`);
    console.log(`   - report.html (visual comparison)`);
    console.log(`   - report.json (full data)`);
    console.log(`   - report.txt (text summary)`);
  }

  // CI mode exit code handling
  if (isCiMode) {
    const ciResult = evaluateCiResult(report, options);

    if (!ciResult.passed) {
      console.log('\n❌ CI Check Failed:');
      for (const reason of ciResult.reasons) {
        console.log(`   - ${reason}`);
      }
      process.exit(1);
    } else {
      console.log(`\n✅ CI Check Passed (${report.passRate.toFixed(1)}% pass rate, ${report.aggregateMetrics.avgOverallScore.toFixed(1)}% avg score)`);
    }
  }

  return report;
}

/**
 * Run quick evaluation (basic tests only)
 */
async function runQuickEvaluation(options: Record<string, string | boolean>): Promise<EvaluationReport> {
  options.difficulty = 'basic';
  return runEvaluation(options);
}

/**
 * Generate fix prompts
 */
async function generateFixes(options: Record<string, string | boolean>): Promise<void> {
  console.log('\n🔧 Generating Fix Prompts\n');

  // Load last report or run evaluation
  const outputDir = (options.output as string) || REPORTS_DIR;
  const reportPath = path.join(outputDir, 'report.json');

  if (!fs.existsSync(reportPath)) {
    console.log('No evaluation report found. Running evaluation first...\n');
    await runEvaluation(options);
  }

  const report: EvaluationReport = JSON.parse(fs.readFileSync(reportPath, 'utf-8'));

  if (report.failed === 0) {
    console.log('✅ All tests passing! No fixes needed.\n');
    return;
  }

  console.log(`Found ${report.failed} failing test(s)\n`);

  // Generate fix pipeline
  const { requests } = await runFixPipeline(report);

  console.log(`Generated ${requests.length} fix request(s):\n`);
  for (const req of requests) {
    console.log(`  - ${path.basename(req.file)}`);
  }

  // Generate interactive prompt
  const interactivePrompt = createInteractivePrompt(report);
  const interactivePath = saveFixRequest(interactivePrompt, 'fix-interactive.md');

  console.log(`\n📝 Fix files saved to ${outputDir}/`);
  console.log(`
To fix issues with Claude Code:

1. Run Claude Code in the graphviz-ts directory
2. Paste the contents of one of these files:
   - fix-batch.md (all issues)
   - fix-interactive.md (step-by-step guide)

Or run: cat ${interactivePath}

After making fixes, re-run evaluation:
  npx ts-node eval/src/cli.ts run
`);
}

/**
 * List test cases
 */
function listTestCases(options: Record<string, string | boolean>): void {
  let testCases = generateTestCases();

  if (options.category) {
    testCases = testCases.filter((t) => t.category === options.category);
  }
  if (options.layout) {
    testCases = testCases.filter((t) => t.layout === options.layout);
  }
  if (options.difficulty) {
    testCases = testCases.filter((t) => t.difficulty === options.difficulty);
  }

  if (options.json) {
    console.log(JSON.stringify(testCases, null, 2));
    return;
  }

  console.log(`\nAvailable Test Cases (${testCases.length}):\n`);

  // Group by category
  const byCategory: Map<string, TestCase[]> = new Map();
  for (const test of testCases) {
    if (!byCategory.has(test.category)) {
      byCategory.set(test.category, []);
    }
    byCategory.get(test.category)!.push(test);
  }

  for (const [category, tests] of byCategory) {
    console.log(`\n${category.toUpperCase()} (${tests.length})`);
    console.log('─'.repeat(50));
    for (const test of tests) {
      console.log(`  ${test.id.padEnd(12)} ${test.name.padEnd(25)} [${test.layout}] ${test.difficulty}`);
    }
  }

  console.log(`\nCategories: ${Array.from(byCategory.keys()).join(', ')}`);
  console.log(`Layouts: dot, neato, fdp, circo, twopi`);
  console.log(`Difficulties: basic, intermediate, advanced\n`);
}

/**
 * Main entry point
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const { command, options } = parseArgs(args);

  if (options.help || command === 'help') {
    printHelp();
    return;
  }

  try {
    switch (command) {
      case 'run':
        await runEvaluation(options);
        break;

      case 'quick':
        await runQuickEvaluation(options);
        break;

      case 'fix':
        await generateFixes(options);
        break;

      case 'list':
        listTestCases(options);
        break;

      case 'report': {
        const outputDir = (options.output as string) || REPORTS_DIR;
        const reportPath = path.join(outputDir, 'report.json');
        if (fs.existsSync(reportPath)) {
          const report = JSON.parse(fs.readFileSync(reportPath, 'utf-8'));
          if (options.json) {
            console.log(JSON.stringify(report, null, 2));
          } else {
            console.log(generateTextReport(report));
          }
        } else {
          console.log('No report found. Run evaluation first: npx ts-node eval/src/cli.ts run');
          process.exit(1);
        }
        break;
      }

      default:
        console.log(`Unknown command: ${command}`);
        printHelp();
        process.exit(1);
    }
  } catch (error) {
    console.error('\n❌ Error:', (error as Error).message);
    if (options.verbose) {
      console.error((error as Error).stack);
    }
    process.exit(1);
  }
}

// Run
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
