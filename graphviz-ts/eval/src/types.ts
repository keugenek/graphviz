/**
 * Types for the Graphviz-ts Evaluation Framework
 */

export interface TestCase {
  id: string;
  name: string;
  description: string;
  dot: string;
  category: TestCategory;
  layout: LayoutEngine;
  expectedFeatures?: string[];
  difficulty: 'basic' | 'intermediate' | 'advanced';
}

export type TestCategory =
  | 'simple-graphs'
  | 'complex-structure'
  | 'styling'
  | 'labels'
  | 'shapes'
  | 'clusters'
  | 'edge-routing'
  | 'rank-control'
  | 'special-chars'
  | 'large-graphs';

export type LayoutEngine = 'dot' | 'neato' | 'fdp' | 'circo' | 'twopi';

export interface RenderResult {
  testCase: TestCase;
  engine: 'graphviz' | 'graphviz-ts';
  svg: string;
  error?: string;
  renderTimeMs: number;
  metadata: {
    nodeCount: number;
    edgeCount: number;
    width: number;
    height: number;
    hasLabels: boolean;
    hasShapes: boolean;
  };
}

export interface ComparisonResult {
  testCase: TestCase;
  graphvizResult: RenderResult;
  graphvizTsResult: RenderResult;
  metrics: ComparisonMetrics;
  issues: Issue[];
  overallScore: number; // 0-100
  passed: boolean;
}

export interface ComparisonMetrics {
  // Structural metrics
  nodeCountMatch: boolean;
  edgeCountMatch: boolean;
  structuralSimilarity: number; // 0-1

  // Layout metrics
  layoutSimilarity: number; // 0-1
  aspectRatioSimilarity: number; // 0-1
  nodeOverlapScore: number; // 0-1 (1 = no overlaps)
  edgeCrossingScore: number; // 0-1 (1 = minimal crossings)

  // Visual metrics
  boundingBoxSimilarity: number; // 0-1
  labelPlacementScore: number; // 0-1

  // Performance
  renderTimeRatio: number; // graphviz-ts time / graphviz time
}

export interface Issue {
  id: string;
  severity: 'critical' | 'major' | 'minor' | 'info';
  category: IssueCategory;
  description: string;
  details: string;
  suggestedFix?: string;
  affectedFile?: string;
  affectedFunction?: string;
  reproducible: boolean;
}

export type IssueCategory =
  | 'parsing-error'
  | 'layout-error'
  | 'rendering-error'
  | 'missing-feature'
  | 'incorrect-output'
  | 'performance'
  | 'crash';

export interface EvaluationReport {
  timestamp: string;
  totalTests: number;
  passed: number;
  failed: number;
  passRate: number;
  results: ComparisonResult[];
  aggregateMetrics: AggregateMetrics;
  issuesSummary: IssueSummary;
  recommendations: string[];
}

export interface AggregateMetrics {
  avgStructuralSimilarity: number;
  avgLayoutSimilarity: number;
  avgOverallScore: number;
  avgRenderTimeRatio: number;
  byCategory: Record<TestCategory, CategoryMetrics>;
  byLayout: Record<LayoutEngine, CategoryMetrics>;
}

export interface CategoryMetrics {
  total: number;
  passed: number;
  avgScore: number;
}

export interface IssueSummary {
  total: number;
  bySeverity: Record<Issue['severity'], number>;
  byCategory: Record<IssueCategory, number>;
  topIssues: Issue[];
}

export interface FixRequest {
  issue: Issue;
  testCase: TestCase;
  graphvizSvg: string;
  graphvizTsSvg: string;
  context: string;
}

export interface FixResult {
  issue: Issue;
  success: boolean;
  changes: FileChange[];
  verificationResult?: ComparisonResult;
  error?: string;
}

export interface FileChange {
  file: string;
  diff: string;
  description: string;
}

export interface EvalConfig {
  testCasesDir: string;
  reportsDir: string;
  graphvizTsDir: string;
  timeout: number;
  parallelism: number;
  strictMode: boolean;
  passThreshold: number; // 0-100
  enableAutoFix: boolean;
  maxAutoFixAttempts: number;
}
