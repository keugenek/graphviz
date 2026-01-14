/**
 * Report Generator
 * Creates HTML and text reports from evaluation results
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  EvaluationReport,
  ComparisonResult,
  AggregateMetrics,
  IssueSummary,
  TestCategory,
  LayoutEngine,
  Issue,
} from './types';

/**
 * Generate aggregate metrics from comparison results
 */
export function calculateAggregateMetrics(
  results: ComparisonResult[]
): AggregateMetrics {
  const byCategory: Record<TestCategory, { total: number; passed: number; scores: number[] }> = {} as any;
  const byLayout: Record<LayoutEngine, { total: number; passed: number; scores: number[] }> = {} as any;

  let totalStructural = 0;
  let totalLayout = 0;
  let totalScore = 0;
  let totalTimeRatio = 0;
  let count = 0;

  for (const result of results) {
    const category = result.testCase.category;
    const layout = result.testCase.layout;

    // Initialize category tracking
    if (!byCategory[category]) {
      byCategory[category] = { total: 0, passed: 0, scores: [] };
    }
    byCategory[category].total++;
    if (result.passed) byCategory[category].passed++;
    byCategory[category].scores.push(result.overallScore);

    // Initialize layout tracking
    if (!byLayout[layout]) {
      byLayout[layout] = { total: 0, passed: 0, scores: [] };
    }
    byLayout[layout].total++;
    if (result.passed) byLayout[layout].passed++;
    byLayout[layout].scores.push(result.overallScore);

    // Accumulate totals
    totalStructural += result.metrics.structuralSimilarity;
    totalLayout += result.metrics.layoutSimilarity;
    totalScore += result.overallScore;
    totalTimeRatio += result.metrics.renderTimeRatio;
    count++;
  }

  // Convert to final format
  const categoryMetrics: Record<TestCategory, { total: number; passed: number; avgScore: number }> = {} as any;
  for (const [cat, data] of Object.entries(byCategory)) {
    categoryMetrics[cat as TestCategory] = {
      total: data.total,
      passed: data.passed,
      avgScore: data.scores.length > 0 ? data.scores.reduce((a, b) => a + b, 0) / data.scores.length : 0,
    };
  }

  const layoutMetrics: Record<LayoutEngine, { total: number; passed: number; avgScore: number }> = {} as any;
  for (const [lay, data] of Object.entries(byLayout)) {
    layoutMetrics[lay as LayoutEngine] = {
      total: data.total,
      passed: data.passed,
      avgScore: data.scores.length > 0 ? data.scores.reduce((a, b) => a + b, 0) / data.scores.length : 0,
    };
  }

  return {
    avgStructuralSimilarity: count > 0 ? totalStructural / count : 0,
    avgLayoutSimilarity: count > 0 ? totalLayout / count : 0,
    avgOverallScore: count > 0 ? totalScore / count : 0,
    avgRenderTimeRatio: count > 0 ? totalTimeRatio / count : 0,
    byCategory: categoryMetrics,
    byLayout: layoutMetrics,
  };
}

/**
 * Generate issue summary
 */
export function calculateIssueSummary(results: ComparisonResult[]): IssueSummary {
  const allIssues: Issue[] = [];
  const bySeverity: Record<Issue['severity'], number> = {
    critical: 0,
    major: 0,
    minor: 0,
    info: 0,
  };
  const byCategory: Record<string, number> = {};

  for (const result of results) {
    for (const issue of result.issues) {
      allIssues.push(issue);
      bySeverity[issue.severity]++;
      byCategory[issue.category] = (byCategory[issue.category] || 0) + 1;
    }
  }

  // Get top issues (unique by description, sorted by severity)
  const severityOrder: Record<Issue['severity'], number> = {
    critical: 0,
    major: 1,
    minor: 2,
    info: 3,
  };

  const uniqueIssues = new Map<string, Issue>();
  for (const issue of allIssues) {
    const key = issue.description;
    if (!uniqueIssues.has(key) || severityOrder[issue.severity] < severityOrder[uniqueIssues.get(key)!.severity]) {
      uniqueIssues.set(key, issue);
    }
  }

  const topIssues = Array.from(uniqueIssues.values())
    .sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity])
    .slice(0, 10);

  return {
    total: allIssues.length,
    bySeverity,
    byCategory: byCategory as any,
    topIssues,
  };
}

/**
 * Generate recommendations based on results
 */
export function generateRecommendations(
  results: ComparisonResult[],
  aggregateMetrics: AggregateMetrics,
  issueSummary: IssueSummary
): string[] {
  const recommendations: string[] = [];

  // Check for critical issues
  if (issueSummary.bySeverity.critical > 0) {
    recommendations.push(
      `CRITICAL: ${issueSummary.bySeverity.critical} critical issue(s) found. These must be fixed first.`
    );
  }

  // Check pass rate
  const passRate = results.filter((r) => r.passed).length / results.length;
  if (passRate < 0.5) {
    recommendations.push(
      `Low pass rate (${(passRate * 100).toFixed(1)}%). Focus on fixing fundamental parsing and rendering issues.`
    );
  }

  // Check by category
  for (const [category, metrics] of Object.entries(aggregateMetrics.byCategory)) {
    if (metrics.avgScore < 50) {
      recommendations.push(
        `Category "${category}" has low average score (${metrics.avgScore.toFixed(1)}%). Review tests in this category.`
      );
    }
  }

  // Check by layout engine
  for (const [layout, metrics] of Object.entries(aggregateMetrics.byLayout)) {
    if (metrics.avgScore < 50) {
      recommendations.push(
        `Layout engine "${layout}" needs improvement (avg score: ${metrics.avgScore.toFixed(1)}%).`
      );
    }
  }

  // Check common issue categories
  if (issueSummary.byCategory['parsing-error'] > 3) {
    recommendations.push(
      'Multiple parsing errors detected. Review parser implementation for edge cases.'
    );
  }

  if (issueSummary.byCategory['layout-error'] > 3) {
    recommendations.push(
      'Multiple layout errors detected. Review layout algorithm parameters.'
    );
  }

  // Performance
  if (aggregateMetrics.avgRenderTimeRatio > 3) {
    recommendations.push(
      `Performance: graphviz-ts is ${aggregateMetrics.avgRenderTimeRatio.toFixed(1)}x slower on average. Consider optimization.`
    );
  }

  return recommendations;
}

/**
 * Generate full evaluation report
 */
export function generateReport(results: ComparisonResult[]): EvaluationReport {
  const aggregateMetrics = calculateAggregateMetrics(results);
  const issueSummary = calculateIssueSummary(results);
  const recommendations = generateRecommendations(results, aggregateMetrics, issueSummary);

  const passed = results.filter((r) => r.passed).length;
  const failed = results.length - passed;

  return {
    timestamp: new Date().toISOString(),
    totalTests: results.length,
    passed,
    failed,
    passRate: results.length > 0 ? (passed / results.length) * 100 : 0,
    results,
    aggregateMetrics,
    issuesSummary: issueSummary,
    recommendations,
  };
}

/**
 * Generate HTML report
 */
export function generateHtmlReport(report: EvaluationReport): string {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>graphviz-ts Evaluation Report</title>
  <style>
    :root {
      --bg: #1a1a2e;
      --card: #16213e;
      --text: #eee;
      --text-secondary: #999;
      --success: #4ade80;
      --error: #f87171;
      --warning: #fbbf24;
      --info: #60a5fa;
      --border: #333;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: var(--bg);
      color: var(--text);
      line-height: 1.6;
      padding: 2rem;
    }
    .container { max-width: 1400px; margin: 0 auto; }
    h1, h2, h3 { margin-bottom: 1rem; }
    h1 { font-size: 2rem; border-bottom: 2px solid var(--border); padding-bottom: 1rem; }
    h2 { font-size: 1.5rem; margin-top: 2rem; }
    h3 { font-size: 1.2rem; color: var(--text-secondary); }

    .summary-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
      margin: 1rem 0 2rem;
    }
    .stat-card {
      background: var(--card);
      border-radius: 8px;
      padding: 1.5rem;
      text-align: center;
    }
    .stat-value {
      font-size: 2.5rem;
      font-weight: bold;
    }
    .stat-label {
      color: var(--text-secondary);
      font-size: 0.9rem;
    }
    .stat-success { color: var(--success); }
    .stat-error { color: var(--error); }
    .stat-warning { color: var(--warning); }

    .progress-bar {
      height: 8px;
      background: var(--border);
      border-radius: 4px;
      overflow: hidden;
      margin-top: 0.5rem;
    }
    .progress-fill {
      height: 100%;
      transition: width 0.3s;
    }
    .progress-success { background: var(--success); }
    .progress-warning { background: var(--warning); }
    .progress-error { background: var(--error); }

    table {
      width: 100%;
      border-collapse: collapse;
      margin: 1rem 0;
    }
    th, td {
      padding: 0.75rem;
      text-align: left;
      border-bottom: 1px solid var(--border);
    }
    th { background: var(--card); font-weight: 600; }
    tr:hover { background: rgba(255,255,255,0.05); }

    .badge {
      display: inline-block;
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      font-size: 0.8rem;
      font-weight: 500;
    }
    .badge-success { background: rgba(74, 222, 128, 0.2); color: var(--success); }
    .badge-error { background: rgba(248, 113, 113, 0.2); color: var(--error); }
    .badge-warning { background: rgba(251, 191, 36, 0.2); color: var(--warning); }
    .badge-info { background: rgba(96, 165, 250, 0.2); color: var(--info); }

    .issue-list { margin: 1rem 0; }
    .issue-item {
      background: var(--card);
      border-radius: 8px;
      padding: 1rem;
      margin-bottom: 0.5rem;
      border-left: 4px solid var(--border);
    }
    .issue-critical { border-left-color: var(--error); }
    .issue-major { border-left-color: var(--warning); }
    .issue-minor { border-left-color: var(--info); }

    .recommendations {
      background: var(--card);
      border-radius: 8px;
      padding: 1.5rem;
      margin: 1rem 0;
    }
    .recommendations li {
      margin-bottom: 0.5rem;
      padding-left: 1.5rem;
      position: relative;
    }
    .recommendations li:before {
      content: "→";
      position: absolute;
      left: 0;
      color: var(--info);
    }

    .test-result {
      background: var(--card);
      border-radius: 8px;
      margin-bottom: 1rem;
      overflow: hidden;
    }
    .test-header {
      padding: 1rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      cursor: pointer;
      border-bottom: 1px solid var(--border);
    }
    .test-header:hover { background: rgba(255,255,255,0.05); }
    .test-body {
      padding: 1rem;
      display: none;
    }
    .test-body.open { display: block; }
    .test-dot {
      background: #0d1117;
      padding: 1rem;
      border-radius: 4px;
      font-family: monospace;
      font-size: 0.9rem;
      overflow-x: auto;
      white-space: pre;
    }
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 0.5rem;
      margin-top: 1rem;
    }
    .metric-item {
      background: rgba(0,0,0,0.2);
      padding: 0.5rem;
      border-radius: 4px;
      text-align: center;
    }
    .metric-value { font-size: 1.2rem; font-weight: bold; }
    .metric-label { font-size: 0.8rem; color: var(--text-secondary); }

    .svg-compare {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
      margin-top: 1rem;
    }
    .svg-panel {
      background: white;
      border-radius: 4px;
      padding: 1rem;
      min-height: 200px;
      overflow: auto;
    }
    .svg-panel h4 {
      color: #333;
      margin-bottom: 0.5rem;
      font-size: 0.9rem;
    }

    .timestamp {
      color: var(--text-secondary);
      font-size: 0.9rem;
      margin-top: 2rem;
    }

    @media (max-width: 768px) {
      .svg-compare { grid-template-columns: 1fr; }
      body { padding: 1rem; }
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>graphviz-ts Evaluation Report</h1>

    <div class="summary-grid">
      <div class="stat-card">
        <div class="stat-value">${report.totalTests}</div>
        <div class="stat-label">Total Tests</div>
      </div>
      <div class="stat-card">
        <div class="stat-value stat-success">${report.passed}</div>
        <div class="stat-label">Passed</div>
      </div>
      <div class="stat-card">
        <div class="stat-value stat-error">${report.failed}</div>
        <div class="stat-label">Failed</div>
      </div>
      <div class="stat-card">
        <div class="stat-value ${report.passRate >= 70 ? 'stat-success' : report.passRate >= 50 ? 'stat-warning' : 'stat-error'}">${report.passRate.toFixed(1)}%</div>
        <div class="stat-label">Pass Rate</div>
        <div class="progress-bar">
          <div class="progress-fill ${report.passRate >= 70 ? 'progress-success' : report.passRate >= 50 ? 'progress-warning' : 'progress-error'}" style="width: ${report.passRate}%"></div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${report.aggregateMetrics.avgOverallScore.toFixed(1)}%</div>
        <div class="stat-label">Avg Score</div>
      </div>
    </div>

    <h2>Results by Category</h2>
    <table>
      <thead>
        <tr>
          <th>Category</th>
          <th>Total</th>
          <th>Passed</th>
          <th>Pass Rate</th>
          <th>Avg Score</th>
        </tr>
      </thead>
      <tbody>
        ${Object.entries(report.aggregateMetrics.byCategory)
          .map(([cat, m]) => `
            <tr>
              <td>${cat}</td>
              <td>${m.total}</td>
              <td>${m.passed}</td>
              <td>
                <span class="badge ${m.passed / m.total >= 0.7 ? 'badge-success' : m.passed / m.total >= 0.5 ? 'badge-warning' : 'badge-error'}">
                  ${((m.passed / m.total) * 100).toFixed(0)}%
                </span>
              </td>
              <td>${m.avgScore.toFixed(1)}%</td>
            </tr>
          `).join('')}
      </tbody>
    </table>

    <h2>Results by Layout Engine</h2>
    <table>
      <thead>
        <tr>
          <th>Layout</th>
          <th>Total</th>
          <th>Passed</th>
          <th>Pass Rate</th>
          <th>Avg Score</th>
        </tr>
      </thead>
      <tbody>
        ${Object.entries(report.aggregateMetrics.byLayout)
          .map(([lay, m]) => `
            <tr>
              <td>${lay}</td>
              <td>${m.total}</td>
              <td>${m.passed}</td>
              <td>
                <span class="badge ${m.passed / m.total >= 0.7 ? 'badge-success' : m.passed / m.total >= 0.5 ? 'badge-warning' : 'badge-error'}">
                  ${((m.passed / m.total) * 100).toFixed(0)}%
                </span>
              </td>
              <td>${m.avgScore.toFixed(1)}%</td>
            </tr>
          `).join('')}
      </tbody>
    </table>

    <h2>Issues Summary</h2>
    <div class="summary-grid">
      <div class="stat-card">
        <div class="stat-value stat-error">${report.issuesSummary.bySeverity.critical}</div>
        <div class="stat-label">Critical</div>
      </div>
      <div class="stat-card">
        <div class="stat-value stat-warning">${report.issuesSummary.bySeverity.major}</div>
        <div class="stat-label">Major</div>
      </div>
      <div class="stat-card">
        <div class="stat-value stat-info">${report.issuesSummary.bySeverity.minor}</div>
        <div class="stat-label">Minor</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${report.issuesSummary.bySeverity.info}</div>
        <div class="stat-label">Info</div>
      </div>
    </div>

    <h3>Top Issues</h3>
    <div class="issue-list">
      ${report.issuesSummary.topIssues.map((issue) => `
        <div class="issue-item issue-${issue.severity}">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <strong>${issue.description}</strong>
            <span class="badge badge-${issue.severity === 'critical' ? 'error' : issue.severity === 'major' ? 'warning' : 'info'}">${issue.severity}</span>
          </div>
          <div style="color: var(--text-secondary); margin-top: 0.5rem; font-size: 0.9rem;">
            ${issue.details}
          </div>
          ${issue.suggestedFix ? `<div style="color: var(--success); margin-top: 0.5rem; font-size: 0.9rem;"><strong>Fix:</strong> ${issue.suggestedFix}</div>` : ''}
          ${issue.affectedFile ? `<div style="color: var(--text-secondary); margin-top: 0.25rem; font-size: 0.85rem;"><code>${issue.affectedFile}</code></div>` : ''}
        </div>
      `).join('')}
    </div>

    <h2>Recommendations</h2>
    <div class="recommendations">
      <ul>
        ${report.recommendations.map((rec) => `<li>${rec}</li>`).join('')}
      </ul>
    </div>

    <h2>Test Results</h2>
    ${report.results.map((result, idx) => `
      <div class="test-result">
        <div class="test-header" onclick="toggleTest(${idx})">
          <div>
            <span class="badge ${result.passed ? 'badge-success' : 'badge-error'}">${result.passed ? 'PASS' : 'FAIL'}</span>
            <strong style="margin-left: 0.5rem;">${result.testCase.name}</strong>
            <span style="color: var(--text-secondary); margin-left: 0.5rem;">${result.testCase.category} | ${result.testCase.layout}</span>
          </div>
          <div>
            <span class="${result.overallScore >= 70 ? 'stat-success' : result.overallScore >= 50 ? 'stat-warning' : 'stat-error'}">${result.overallScore.toFixed(1)}%</span>
          </div>
        </div>
        <div class="test-body" id="test-${idx}">
          <h4>DOT Input</h4>
          <div class="test-dot">${escapeHtml(result.testCase.dot)}</div>

          <div class="metrics-grid">
            <div class="metric-item">
              <div class="metric-value">${(result.metrics.structuralSimilarity * 100).toFixed(0)}%</div>
              <div class="metric-label">Structural</div>
            </div>
            <div class="metric-item">
              <div class="metric-value">${(result.metrics.layoutSimilarity * 100).toFixed(0)}%</div>
              <div class="metric-label">Layout</div>
            </div>
            <div class="metric-item">
              <div class="metric-value">${(result.metrics.nodeOverlapScore * 100).toFixed(0)}%</div>
              <div class="metric-label">No Overlap</div>
            </div>
            <div class="metric-item">
              <div class="metric-value">${result.metrics.renderTimeRatio.toFixed(2)}x</div>
              <div class="metric-label">Time Ratio</div>
            </div>
          </div>

          ${result.issues.length > 0 ? `
            <h4 style="margin-top: 1rem;">Issues (${result.issues.length})</h4>
            <ul style="margin-left: 1.5rem; color: var(--text-secondary);">
              ${result.issues.map((i) => `<li><span class="badge badge-${i.severity === 'critical' ? 'error' : i.severity === 'major' ? 'warning' : 'info'}">${i.severity}</span> ${i.description}</li>`).join('')}
            </ul>
          ` : ''}

          <h4 style="margin-top: 1rem;">Visual Comparison</h4>
          <div class="svg-compare">
            <div class="svg-panel">
              <h4>Real Graphviz</h4>
              ${result.graphvizResult.error ? `<div style="color: red;">Error: ${escapeHtml(result.graphvizResult.error)}</div>` : result.graphvizResult.svg}
            </div>
            <div class="svg-panel">
              <h4>graphviz-ts</h4>
              ${result.graphvizTsResult.error ? `<div style="color: red;">Error: ${escapeHtml(result.graphvizTsResult.error)}</div>` : result.graphvizTsResult.svg}
            </div>
          </div>
        </div>
      </div>
    `).join('')}

    <p class="timestamp">Generated: ${report.timestamp}</p>
  </div>

  <script>
    function toggleTest(idx) {
      const body = document.getElementById('test-' + idx);
      body.classList.toggle('open');
    }
    // Open failed tests by default
    document.querySelectorAll('.test-result').forEach((el, idx) => {
      const badge = el.querySelector('.badge');
      if (badge && badge.classList.contains('badge-error')) {
        document.getElementById('test-' + idx).classList.add('open');
      }
    });
  </script>
</body>
</html>`;

  return html;
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Generate text report for CLI
 */
export function generateTextReport(report: EvaluationReport): string {
  let text = `
╔══════════════════════════════════════════════════════════════════╗
║              graphviz-ts Evaluation Report                       ║
╚══════════════════════════════════════════════════════════════════╝

Summary
────────────────────────────────────────────────────────────────────
Total Tests:  ${report.totalTests}
Passed:       ${report.passed} (${report.passRate.toFixed(1)}%)
Failed:       ${report.failed}
Avg Score:    ${report.aggregateMetrics.avgOverallScore.toFixed(1)}%

Issues Summary
────────────────────────────────────────────────────────────────────
Critical: ${report.issuesSummary.bySeverity.critical}
Major:    ${report.issuesSummary.bySeverity.major}
Minor:    ${report.issuesSummary.bySeverity.minor}
Info:     ${report.issuesSummary.bySeverity.info}

Results by Category
────────────────────────────────────────────────────────────────────
`;

  for (const [cat, m] of Object.entries(report.aggregateMetrics.byCategory)) {
    const passRate = m.total > 0 ? ((m.passed / m.total) * 100).toFixed(0) : '0';
    text += `${cat.padEnd(20)} ${m.passed}/${m.total} (${passRate}%) avg: ${m.avgScore.toFixed(1)}%\n`;
  }

  text += `
Results by Layout
────────────────────────────────────────────────────────────────────
`;

  for (const [lay, m] of Object.entries(report.aggregateMetrics.byLayout)) {
    const passRate = m.total > 0 ? ((m.passed / m.total) * 100).toFixed(0) : '0';
    text += `${lay.padEnd(20)} ${m.passed}/${m.total} (${passRate}%) avg: ${m.avgScore.toFixed(1)}%\n`;
  }

  if (report.issuesSummary.topIssues.length > 0) {
    text += `
Top Issues
────────────────────────────────────────────────────────────────────
`;
    for (const issue of report.issuesSummary.topIssues.slice(0, 5)) {
      text += `[${issue.severity.toUpperCase()}] ${issue.description}\n`;
      if (issue.suggestedFix) {
        text += `  → ${issue.suggestedFix}\n`;
      }
    }
  }

  if (report.recommendations.length > 0) {
    text += `
Recommendations
────────────────────────────────────────────────────────────────────
`;
    for (const rec of report.recommendations) {
      text += `• ${rec}\n`;
    }
  }

  text += `
────────────────────────────────────────────────────────────────────
Generated: ${report.timestamp}
`;

  return text;
}

/**
 * Save reports to files
 */
export function saveReports(report: EvaluationReport, outputDir: string): void {
  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Save HTML report
  const htmlPath = path.join(outputDir, 'report.html');
  fs.writeFileSync(htmlPath, generateHtmlReport(report), 'utf-8');

  // Save JSON report
  const jsonPath = path.join(outputDir, 'report.json');
  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2), 'utf-8');

  // Save text report
  const textPath = path.join(outputDir, 'report.txt');
  fs.writeFileSync(textPath, generateTextReport(report), 'utf-8');

  console.log(`Reports saved to ${outputDir}/`);
}
