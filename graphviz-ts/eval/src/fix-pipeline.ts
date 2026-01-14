/**
 * Automated Fix Pipeline
 * Generates fix requests for Claude Code to process
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync, spawn } from 'child_process';
import {
  Issue,
  ComparisonResult,
  FixRequest,
  FixResult,
  EvaluationReport,
  TestCase,
} from './types';

const GRAPHVIZ_TS_ROOT = path.join(__dirname, '..', '..');

/**
 * Generate a detailed fix prompt for Claude Code
 */
export function generateFixPrompt(
  issue: Issue,
  comparison: ComparisonResult
): string {
  const testCase = comparison.testCase;

  let prompt = `# Fix Request for graphviz-ts

## Issue
**ID**: ${issue.id}
**Severity**: ${issue.severity}
**Category**: ${issue.category}
**Description**: ${issue.description}

## Details
${issue.details}

## Test Case
**Name**: ${testCase.name}
**Category**: ${testCase.category}
**Layout Engine**: ${testCase.layout}
**Difficulty**: ${testCase.difficulty}

### DOT Input
\`\`\`dot
${testCase.dot}
\`\`\`

## Comparison Metrics
- Structural Similarity: ${(comparison.metrics.structuralSimilarity * 100).toFixed(1)}%
- Layout Similarity: ${(comparison.metrics.layoutSimilarity * 100).toFixed(1)}%
- Node Overlap Score: ${(comparison.metrics.nodeOverlapScore * 100).toFixed(1)}%
- Overall Score: ${comparison.overallScore.toFixed(1)}%

## Expected vs Actual
- Expected nodes: ${comparison.graphvizResult.metadata.nodeCount}
- Actual nodes: ${comparison.graphvizTsResult.metadata.nodeCount}
- Expected edges: ${comparison.graphvizResult.metadata.edgeCount}
- Actual edges: ${comparison.graphvizTsResult.metadata.edgeCount}

`;

  if (issue.affectedFile) {
    prompt += `## Affected File
\`${issue.affectedFile}\`
`;
    if (issue.affectedFunction) {
      prompt += `**Function**: \`${issue.affectedFunction}\`\n`;
    }
  }

  if (issue.suggestedFix) {
    prompt += `
## Suggested Fix Approach
${issue.suggestedFix}
`;
  }

  prompt += `
## Instructions
1. Analyze the issue and understand why graphviz-ts is producing different output than real Graphviz
2. Locate the relevant code in the graphviz-ts source (in ${GRAPHVIZ_TS_ROOT}/src)
3. Implement a fix that addresses the issue
4. The fix should make graphviz-ts produce output more similar to real Graphviz for this test case
5. After fixing, the test should pass with an overall score >= 60%

## Important
- Do not break existing functionality
- Keep changes minimal and focused
- Add comments explaining the fix if the logic is complex
`;

  return prompt;
}

/**
 * Generate a batch fix prompt for multiple issues
 */
export function generateBatchFixPrompt(
  comparisons: ComparisonResult[],
  maxIssues: number = 5
): string {
  // Collect all issues with their context
  const allIssues: Array<{ issue: Issue; comparison: ComparisonResult }> = [];

  for (const comparison of comparisons) {
    for (const issue of comparison.issues) {
      allIssues.push({ issue, comparison });
    }
  }

  // Sort by severity (critical first)
  const severityOrder: Record<Issue['severity'], number> = {
    critical: 0,
    major: 1,
    minor: 2,
    info: 3,
  };

  allIssues.sort((a, b) => severityOrder[a.issue.severity] - severityOrder[b.issue.severity]);

  // Take top issues
  const topIssues = allIssues.slice(0, maxIssues);

  // Group issues by affected file
  const byFile: Map<string, Array<{ issue: Issue; comparison: ComparisonResult }>> = new Map();

  for (const item of topIssues) {
    const file = item.issue.affectedFile || 'unknown';
    if (!byFile.has(file)) {
      byFile.set(file, []);
    }
    byFile.get(file)!.push(item);
  }

  let prompt = `# Batch Fix Request for graphviz-ts

## Summary
Total failing tests: ${comparisons.filter((c) => !c.passed).length}
Total issues to fix: ${topIssues.length}

## Issues by File

`;

  for (const [file, items] of byFile) {
    prompt += `### ${file}\n\n`;

    for (const { issue, comparison } of items) {
      prompt += `#### ${issue.id}: ${issue.description}
- **Severity**: ${issue.severity}
- **Category**: ${issue.category}
- **Test**: ${comparison.testCase.name}
- **Details**: ${issue.details}
`;
      if (issue.suggestedFix) {
        prompt += `- **Suggested Fix**: ${issue.suggestedFix}\n`;
      }
      prompt += '\n';
    }
  }

  prompt += `## Failing Test Cases

`;

  const failingTests = comparisons.filter((c) => !c.passed).slice(0, 10);
  for (const comparison of failingTests) {
    prompt += `### ${comparison.testCase.name}
\`\`\`dot
${comparison.testCase.dot}
\`\`\`
Score: ${comparison.overallScore.toFixed(1)}%

`;
  }

  prompt += `## Instructions
1. Fix the issues in order of severity (critical first)
2. After each fix, the affected tests should show improvement
3. Run the evaluator after fixes to verify: \`npm run eval\`
4. Target: All tests should pass with score >= 60%
`;

  return prompt;
}

/**
 * Save fix request to file for Claude Code to process
 */
export function saveFixRequest(
  prompt: string,
  filename: string = 'fix-request.md'
): string {
  const outputPath = path.join(__dirname, '..', 'reports', filename);
  fs.writeFileSync(outputPath, prompt, 'utf-8');
  return outputPath;
}

/**
 * Generate fix requests for all failing tests
 */
export function generateAllFixRequests(
  report: EvaluationReport
): Array<{ file: string; prompt: string }> {
  const requests: Array<{ file: string; prompt: string }> = [];

  // Generate batch prompt
  const failingResults = report.results.filter((r) => !r.passed);
  if (failingResults.length > 0) {
    const batchPrompt = generateBatchFixPrompt(failingResults);
    const batchFile = saveFixRequest(batchPrompt, 'fix-batch.md');
    requests.push({ file: batchFile, prompt: batchPrompt });
  }

  // Generate individual prompts for critical/major issues
  const criticalResults = failingResults.filter((r) =>
    r.issues.some((i) => i.severity === 'critical' || i.severity === 'major')
  );

  for (let i = 0; i < Math.min(criticalResults.length, 5); i++) {
    const comparison = criticalResults[i];
    const criticalIssue = comparison.issues.find(
      (i) => i.severity === 'critical' || i.severity === 'major'
    );

    if (criticalIssue) {
      const prompt = generateFixPrompt(criticalIssue, comparison);
      const filename = `fix-${comparison.testCase.id}.md`;
      const file = saveFixRequest(prompt, filename);
      requests.push({ file, prompt });
    }
  }

  return requests;
}

/**
 * Create a shell script to run Claude Code with fix prompt
 */
export function createClaudeCodeScript(promptFile: string): string {
  const scriptContent = `#!/bin/bash
# Auto-generated fix script for graphviz-ts
# Run this with: bash fix-script.sh

set -e

cd "${GRAPHVIZ_TS_ROOT}"

echo "Starting Claude Code fix session..."
echo "Prompt file: ${promptFile}"
echo ""

# Run Claude Code with the fix prompt
# The user should run: claude code --prompt-file "${promptFile}"

cat << 'INSTRUCTIONS'
To run the automated fix:

1. Open Claude Code in this directory:
   cd ${GRAPHVIZ_TS_ROOT}

2. Run with the fix prompt:
   claude --print "${promptFile}"

   Or paste the contents of ${promptFile} into Claude Code

3. After fixes are applied, verify with:
   npm run eval

INSTRUCTIONS
`;

  const scriptPath = path.join(__dirname, '..', 'reports', 'fix-script.sh');
  fs.writeFileSync(scriptPath, scriptContent, 'utf-8');
  fs.chmodSync(scriptPath, '755');

  return scriptPath;
}

/**
 * Run the full fix pipeline
 */
export async function runFixPipeline(
  report: EvaluationReport
): Promise<{ requests: Array<{ file: string; prompt: string }>; script: string }> {
  // Generate fix requests
  const requests = generateAllFixRequests(report);

  // Create convenience script
  const script = createClaudeCodeScript(
    requests.length > 0 ? requests[0].file : ''
  );

  return { requests, script };
}

/**
 * Format the Claude Code command for a specific issue
 */
export function getClaudeCodeCommand(issue: Issue, testCase: TestCase): string {
  const prompt = `Fix this graphviz-ts issue:
Issue: ${issue.description}
File: ${issue.affectedFile || 'unknown'}
Test DOT: ${testCase.dot}
Details: ${issue.details}
${issue.suggestedFix ? `Suggested approach: ${issue.suggestedFix}` : ''}`;

  // Escape for shell
  const escaped = prompt.replace(/'/g, "'\\''");

  return `claude '${escaped}'`;
}

/**
 * Create interactive fix session prompt
 */
export function createInteractivePrompt(report: EvaluationReport): string {
  const failingTests = report.results.filter((r) => !r.passed);

  let prompt = `# graphviz-ts Evaluation Results

## Summary
- **Total Tests**: ${report.totalTests}
- **Passed**: ${report.passed} (${report.passRate.toFixed(1)}%)
- **Failed**: ${report.failed}
- **Average Score**: ${report.aggregateMetrics.avgOverallScore.toFixed(1)}%

## Top Issues to Fix

`;

  // Get unique critical/major issues
  const seenIssues = new Set<string>();
  const topIssues: Array<{ issue: Issue; testCase: TestCase }> = [];

  for (const result of failingTests) {
    for (const issue of result.issues) {
      const key = `${issue.category}:${issue.description}`;
      if (!seenIssues.has(key) && (issue.severity === 'critical' || issue.severity === 'major')) {
        seenIssues.add(key);
        topIssues.push({ issue, testCase: result.testCase });
      }
    }
  }

  for (let i = 0; i < Math.min(topIssues.length, 10); i++) {
    const { issue, testCase } = topIssues[i];
    prompt += `### ${i + 1}. ${issue.description}
- **Severity**: ${issue.severity}
- **Category**: ${issue.category}
- **Test**: ${testCase.name}
- **File**: ${issue.affectedFile || 'unknown'}
${issue.suggestedFix ? `- **Fix**: ${issue.suggestedFix}` : ''}

\`\`\`dot
${testCase.dot}
\`\`\`

`;
  }

  prompt += `## Instructions for Fixing

1. Start with critical issues first
2. For each issue:
   - Read the affected source file
   - Understand the expected behavior from real Graphviz
   - Implement a fix
   - Run \`npm run eval\` to verify

3. Common fix patterns:
   - **Parsing errors**: Check \`src/parser/parser.ts\` and \`src/parser/lexer.ts\`
   - **Layout errors**: Check \`src/layout/hierarchical.ts\` or \`src/layout/force-directed.ts\`
   - **Rendering errors**: Check \`src/render/svg.ts\`
   - **Missing features**: Add support in the appropriate module

4. After all fixes, run full evaluation:
   \`\`\`bash
   cd ${GRAPHVIZ_TS_ROOT}
   npm run eval
   \`\`\`
`;

  return prompt;
}
