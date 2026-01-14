/**
 * Test Case Generator
 * Generates diverse DOT graphs for comprehensive testing
 */

import { TestCase, TestCategory, LayoutEngine } from './types';

let testIdCounter = 0;

function createTestCase(
  name: string,
  description: string,
  dot: string,
  category: TestCategory,
  layout: LayoutEngine = 'dot',
  difficulty: TestCase['difficulty'] = 'basic',
  expectedFeatures?: string[]
): TestCase {
  return {
    id: `test-${++testIdCounter}`,
    name,
    description,
    dot: dot.trim(),
    category,
    layout,
    difficulty,
    expectedFeatures,
  };
}

/**
 * Generate all test cases
 */
export function generateTestCases(): TestCase[] {
  testIdCounter = 0;
  return [
    ...generateSimpleGraphs(),
    ...generateComplexStructures(),
    ...generateStylingTests(),
    ...generateLabelTests(),
    ...generateShapeTests(),
    ...generateClusterTests(),
    ...generateEdgeRoutingTests(),
    ...generateRankControlTests(),
    ...generateSpecialCharTests(),
    ...generateLargeGraphs(),
    ...generateLayoutEngineTests(),
  ];
}

function generateSimpleGraphs(): TestCase[] {
  return [
    createTestCase(
      'single-node',
      'Graph with a single node',
      'digraph { A }',
      'simple-graphs',
      'dot',
      'basic',
      ['single node rendering']
    ),

    createTestCase(
      'two-nodes-edge',
      'Two nodes connected by an edge',
      'digraph { A -> B }',
      'simple-graphs',
      'dot',
      'basic',
      ['edge rendering', 'arrow heads']
    ),

    createTestCase(
      'linear-chain',
      'Linear chain of nodes',
      'digraph { A -> B -> C -> D -> E }',
      'simple-graphs',
      'dot',
      'basic',
      ['linear layout', 'consistent spacing']
    ),

    createTestCase(
      'simple-tree',
      'Simple binary tree',
      `digraph {
        root -> left
        root -> right
        left -> ll
        left -> lr
        right -> rl
        right -> rr
      }`,
      'simple-graphs',
      'dot',
      'basic',
      ['tree layout', 'hierarchical structure']
    ),

    createTestCase(
      'undirected-simple',
      'Simple undirected graph',
      `graph {
        A -- B
        B -- C
        C -- A
      }`,
      'simple-graphs',
      'dot',
      'basic',
      ['undirected edges', 'no arrow heads']
    ),

    createTestCase(
      'diamond',
      'Diamond shaped DAG',
      `digraph {
        A -> B
        A -> C
        B -> D
        C -> D
      }`,
      'simple-graphs',
      'dot',
      'basic',
      ['diamond layout', 'crossing minimization']
    ),

    createTestCase(
      'self-loop',
      'Node with self loop',
      'digraph { A -> A }',
      'simple-graphs',
      'dot',
      'intermediate',
      ['self loop rendering']
    ),

    createTestCase(
      'multiple-edges',
      'Multiple edges between same nodes',
      `digraph {
        A -> B
        A -> B
        B -> A
      }`,
      'simple-graphs',
      'dot',
      'intermediate',
      ['multiple edge handling']
    ),
  ];
}

function generateComplexStructures(): TestCase[] {
  return [
    createTestCase(
      'wide-tree',
      'Wide tree with many children',
      `digraph {
        root -> a1 -> a2 -> a3
        root -> b1 -> b2 -> b3
        root -> c1 -> c2 -> c3
        root -> d1 -> d2 -> d3
        root -> e1 -> e2 -> e3
      }`,
      'complex-structure',
      'dot',
      'intermediate'
    ),

    createTestCase(
      'deep-tree',
      'Deep tree with many levels',
      `digraph {
        l1 -> l2 -> l3 -> l4 -> l5 -> l6 -> l7 -> l8 -> l9 -> l10
      }`,
      'complex-structure',
      'dot',
      'intermediate'
    ),

    createTestCase(
      'complete-graph-4',
      'Complete graph K4',
      `digraph {
        A -> B -> C -> D -> A
        A -> C
        B -> D
      }`,
      'complex-structure',
      'dot',
      'intermediate'
    ),

    createTestCase(
      'bipartite',
      'Bipartite graph',
      `digraph {
        { rank=same; a1; a2; a3 }
        { rank=same; b1; b2; b3 }
        a1 -> b1
        a1 -> b2
        a2 -> b2
        a2 -> b3
        a3 -> b1
        a3 -> b3
      }`,
      'complex-structure',
      'dot',
      'advanced'
    ),

    createTestCase(
      'dag-complex',
      'Complex DAG with multiple paths',
      `digraph {
        start -> a -> b -> end
        start -> c -> d -> end
        a -> d
        c -> b
        start -> e -> end
      }`,
      'complex-structure',
      'dot',
      'advanced'
    ),

    createTestCase(
      'cycle-detection',
      'Graph with cycles',
      `digraph {
        A -> B -> C -> A
        C -> D -> E -> C
      }`,
      'complex-structure',
      'dot',
      'advanced'
    ),
  ];
}

function generateStylingTests(): TestCase[] {
  return [
    createTestCase(
      'node-colors',
      'Nodes with different colors',
      `digraph {
        red [color=red]
        blue [color=blue]
        green [color=green]
        red -> blue -> green
      }`,
      'styling',
      'dot',
      'basic',
      ['color support']
    ),

    createTestCase(
      'fill-colors',
      'Nodes with fill colors',
      `digraph {
        node [style=filled]
        a [fillcolor=lightblue]
        b [fillcolor=lightgreen]
        c [fillcolor=lightyellow]
        a -> b -> c
      }`,
      'styling',
      'dot',
      'basic',
      ['fill color support', 'style attribute']
    ),

    createTestCase(
      'edge-colors',
      'Edges with different colors',
      `digraph {
        A -> B [color=red]
        B -> C [color=blue]
        C -> D [color=green]
      }`,
      'styling',
      'dot',
      'basic',
      ['edge color support']
    ),

    createTestCase(
      'line-styles',
      'Different line styles',
      `digraph {
        A -> B [style=dashed]
        B -> C [style=dotted]
        C -> D [style=bold]
      }`,
      'styling',
      'dot',
      'intermediate',
      ['dashed lines', 'dotted lines', 'bold lines']
    ),

    createTestCase(
      'pen-width',
      'Different pen widths',
      `digraph {
        A [penwidth=1]
        B [penwidth=2]
        C [penwidth=3]
        A -> B [penwidth=2]
        B -> C [penwidth=4]
      }`,
      'styling',
      'dot',
      'intermediate',
      ['pen width support']
    ),

    createTestCase(
      'font-styling',
      'Font name and size',
      `digraph {
        a [fontname="Arial" fontsize=14]
        b [fontname="Times" fontsize=18]
        c [fontname="Courier" fontsize=12]
        a -> b -> c
      }`,
      'styling',
      'dot',
      'intermediate',
      ['font customization']
    ),
  ];
}

function generateLabelTests(): TestCase[] {
  return [
    createTestCase(
      'node-labels',
      'Custom node labels',
      `digraph {
        a [label="Node A"]
        b [label="Node B"]
        c [label="Node C"]
        a -> b -> c
      }`,
      'labels',
      'dot',
      'basic',
      ['custom labels']
    ),

    createTestCase(
      'edge-labels',
      'Edge labels',
      `digraph {
        A -> B [label="connects to"]
        B -> C [label="leads to"]
      }`,
      'labels',
      'dot',
      'intermediate',
      ['edge labels']
    ),

    createTestCase(
      'multiline-labels',
      'Multi-line labels',
      `digraph {
        a [label="Line 1\\nLine 2\\nLine 3"]
        b [label="Another\\nMultiline"]
        a -> b
      }`,
      'labels',
      'dot',
      'intermediate',
      ['multiline labels', 'newline handling']
    ),

    createTestCase(
      'html-labels',
      'HTML-like labels',
      `digraph {
        a [label=<Hello<BR/>World>]
        b [label=<<B>Bold</B>>]
        a -> b
      }`,
      'labels',
      'dot',
      'advanced',
      ['HTML labels']
    ),

    createTestCase(
      'xlabel',
      'External labels',
      `digraph {
        a [xlabel="external"]
        b [xlabel="label"]
        a -> b [xlabel="edge xlabel"]
      }`,
      'labels',
      'dot',
      'advanced',
      ['external labels']
    ),

    createTestCase(
      'graph-label',
      'Graph title/label',
      `digraph {
        label="My Graph Title"
        labelloc="t"
        A -> B -> C
      }`,
      'labels',
      'dot',
      'basic',
      ['graph labels']
    ),
  ];
}

function generateShapeTests(): TestCase[] {
  return [
    createTestCase(
      'basic-shapes',
      'Basic node shapes',
      `digraph {
        box [shape=box]
        ellipse [shape=ellipse]
        circle [shape=circle]
        diamond [shape=diamond]
        box -> ellipse -> circle -> diamond
      }`,
      'shapes',
      'dot',
      'basic',
      ['box shape', 'ellipse shape', 'circle shape', 'diamond shape']
    ),

    createTestCase(
      'polygon-shapes',
      'Polygon shapes',
      `digraph {
        triangle [shape=triangle]
        pentagon [shape=pentagon]
        hexagon [shape=hexagon]
        octagon [shape=octagon]
        triangle -> pentagon -> hexagon -> octagon
      }`,
      'shapes',
      'dot',
      'intermediate',
      ['polygon shapes']
    ),

    createTestCase(
      'record-shape',
      'Record shapes',
      `digraph {
        struct [shape=record label="{a|b|c}"]
        struct2 [shape=record label="{{a|b}|{c|d}}"]
        struct -> struct2
      }`,
      'shapes',
      'dot',
      'advanced',
      ['record shapes', 'field separators']
    ),

    createTestCase(
      'special-shapes',
      'Special shapes',
      `digraph {
        none [shape=none]
        plain [shape=plain]
        point [shape=point]
        none -> plain -> point
      }`,
      'shapes',
      'dot',
      'intermediate',
      ['none shape', 'plain shape', 'point shape']
    ),

    createTestCase(
      'node-size',
      'Node sizing',
      `digraph {
        small [width=0.5 height=0.5]
        medium [width=1 height=1]
        large [width=2 height=2]
        small -> medium -> large
      }`,
      'shapes',
      'dot',
      'intermediate',
      ['node sizing']
    ),
  ];
}

function generateClusterTests(): TestCase[] {
  return [
    createTestCase(
      'simple-cluster',
      'Simple subgraph cluster',
      `digraph {
        subgraph cluster_0 {
          label="Cluster 0"
          a -> b
        }
        c -> a
      }`,
      'clusters',
      'dot',
      'intermediate',
      ['cluster support', 'cluster labels']
    ),

    createTestCase(
      'multiple-clusters',
      'Multiple clusters',
      `digraph {
        subgraph cluster_0 {
          label="First"
          a1 -> a2
        }
        subgraph cluster_1 {
          label="Second"
          b1 -> b2
        }
        a2 -> b1
      }`,
      'clusters',
      'dot',
      'intermediate',
      ['multiple clusters']
    ),

    createTestCase(
      'nested-clusters',
      'Nested clusters',
      `digraph {
        subgraph cluster_outer {
          label="Outer"
          subgraph cluster_inner {
            label="Inner"
            a -> b
          }
          c -> a
        }
        d -> c
      }`,
      'clusters',
      'dot',
      'advanced',
      ['nested clusters']
    ),

    createTestCase(
      'cluster-styling',
      'Styled clusters',
      `digraph {
        subgraph cluster_0 {
          style=filled
          color=lightblue
          label="Styled"
          a -> b
        }
        c -> a
      }`,
      'clusters',
      'dot',
      'advanced',
      ['cluster styling']
    ),
  ];
}

function generateEdgeRoutingTests(): TestCase[] {
  return [
    createTestCase(
      'splines-ortho',
      'Orthogonal edge routing',
      `digraph {
        splines=ortho
        A -> B -> C
        A -> C
      }`,
      'edge-routing',
      'dot',
      'advanced',
      ['orthogonal edges']
    ),

    createTestCase(
      'splines-polyline',
      'Polyline edge routing',
      `digraph {
        splines=polyline
        A -> B -> C
        A -> C
      }`,
      'edge-routing',
      'dot',
      'intermediate',
      ['polyline edges']
    ),

    createTestCase(
      'arrow-styles',
      'Different arrow styles',
      `digraph {
        A -> B [arrowhead=normal]
        B -> C [arrowhead=dot]
        C -> D [arrowhead=odot]
        D -> E [arrowhead=none]
        E -> F [arrowhead=vee]
      }`,
      'edge-routing',
      'dot',
      'intermediate',
      ['arrow head styles']
    ),

    createTestCase(
      'bidirectional',
      'Bidirectional edges',
      `digraph {
        A -> B [dir=both]
        B -> C [dir=back]
        C -> D [dir=none]
      }`,
      'edge-routing',
      'dot',
      'intermediate',
      ['edge direction']
    ),

    createTestCase(
      'edge-constraints',
      'Edge constraints',
      `digraph {
        A -> B [constraint=false]
        B -> C
        A -> C
      }`,
      'edge-routing',
      'dot',
      'advanced',
      ['edge constraints']
    ),
  ];
}

function generateRankControlTests(): TestCase[] {
  return [
    createTestCase(
      'rankdir-lr',
      'Left to right layout',
      `digraph {
        rankdir=LR
        A -> B -> C -> D
      }`,
      'rank-control',
      'dot',
      'basic',
      ['rankdir LR']
    ),

    createTestCase(
      'rankdir-rl',
      'Right to left layout',
      `digraph {
        rankdir=RL
        A -> B -> C -> D
      }`,
      'rank-control',
      'dot',
      'basic',
      ['rankdir RL']
    ),

    createTestCase(
      'rankdir-bt',
      'Bottom to top layout',
      `digraph {
        rankdir=BT
        A -> B -> C -> D
      }`,
      'rank-control',
      'dot',
      'basic',
      ['rankdir BT']
    ),

    createTestCase(
      'rank-same',
      'Same rank constraint',
      `digraph {
        { rank=same; B; C; D }
        A -> B
        A -> C
        A -> D
        B -> E
        C -> E
        D -> E
      }`,
      'rank-control',
      'dot',
      'intermediate',
      ['rank=same constraint']
    ),

    createTestCase(
      'rank-min-max',
      'Min/max rank',
      `digraph {
        { rank=min; start }
        { rank=max; end }
        start -> a -> end
        start -> b -> end
      }`,
      'rank-control',
      'dot',
      'advanced',
      ['rank min/max']
    ),

    createTestCase(
      'spacing-control',
      'Node and rank separation',
      `digraph {
        nodesep=1
        ranksep=1.5
        A -> B -> C
        A -> D -> C
      }`,
      'rank-control',
      'dot',
      'intermediate',
      ['nodesep', 'ranksep']
    ),
  ];
}

function generateSpecialCharTests(): TestCase[] {
  return [
    createTestCase(
      'quoted-ids',
      'Quoted identifiers',
      `digraph {
        "Node A" -> "Node B"
        "has spaces" -> "also spaces"
      }`,
      'special-chars',
      'dot',
      'basic',
      ['quoted IDs']
    ),

    createTestCase(
      'special-chars-labels',
      'Special characters in labels',
      `digraph {
        a [label="Hello, World!"]
        b [label="Test: 1+2=3"]
        c [label="<>&\\""]
        a -> b -> c
      }`,
      'special-chars',
      'dot',
      'intermediate',
      ['special character escaping']
    ),

    createTestCase(
      'unicode',
      'Unicode characters',
      `digraph {
        a [label="Hello 世界"]
        b [label="Привет мир"]
        c [label="🎉 emoji"]
        a -> b -> c
      }`,
      'special-chars',
      'dot',
      'advanced',
      ['unicode support']
    ),

    createTestCase(
      'numeric-ids',
      'Numeric node IDs',
      `digraph {
        1 -> 2 -> 3
        1 -> 3
      }`,
      'special-chars',
      'dot',
      'basic',
      ['numeric IDs']
    ),
  ];
}

function generateLargeGraphs(): TestCase[] {
  // Generate a graph with 50 nodes
  let largeGraphDot = 'digraph {\n';
  for (let i = 0; i < 50; i++) {
    if (i < 49) {
      largeGraphDot += `  n${i} -> n${i + 1}\n`;
    }
    if (i % 5 === 0 && i + 5 < 50) {
      largeGraphDot += `  n${i} -> n${i + 5}\n`;
    }
  }
  largeGraphDot += '}';

  // Generate a wide graph
  let wideGraphDot = 'digraph {\n  root\n';
  for (let i = 0; i < 20; i++) {
    wideGraphDot += `  root -> child${i}\n`;
  }
  wideGraphDot += '}';

  // Grid graph
  let gridGraphDot = 'digraph {\n';
  const gridSize = 5;
  for (let i = 0; i < gridSize; i++) {
    for (let j = 0; j < gridSize; j++) {
      if (j < gridSize - 1) {
        gridGraphDot += `  n${i}_${j} -> n${i}_${j + 1}\n`;
      }
      if (i < gridSize - 1) {
        gridGraphDot += `  n${i}_${j} -> n${i + 1}_${j}\n`;
      }
    }
  }
  gridGraphDot += '}';

  return [
    createTestCase(
      'large-linear',
      'Large linear graph (50 nodes)',
      largeGraphDot,
      'large-graphs',
      'dot',
      'advanced',
      ['scalability', 'large graph handling']
    ),

    createTestCase(
      'wide-graph',
      'Wide graph (20 children)',
      wideGraphDot,
      'large-graphs',
      'dot',
      'intermediate',
      ['wide layout']
    ),

    createTestCase(
      'grid-graph',
      'Grid-like graph (5x5)',
      gridGraphDot,
      'large-graphs',
      'dot',
      'advanced',
      ['grid layout', 'crossing minimization']
    ),
  ];
}

function generateLayoutEngineTests(): TestCase[] {
  const testGraph = `digraph {
    center -> n1
    center -> n2
    center -> n3
    center -> n4
    n1 -> n2
    n3 -> n4
  }`;

  return [
    createTestCase(
      'neato-basic',
      'Force-directed layout (neato)',
      testGraph,
      'simple-graphs',
      'neato',
      'basic',
      ['force-directed layout']
    ),

    createTestCase(
      'fdp-basic',
      'Force-directed placement (fdp)',
      testGraph,
      'simple-graphs',
      'fdp',
      'basic',
      ['fdp layout']
    ),

    createTestCase(
      'circo-basic',
      'Circular layout',
      testGraph,
      'simple-graphs',
      'circo',
      'basic',
      ['circular layout']
    ),

    createTestCase(
      'twopi-basic',
      'Radial layout',
      testGraph,
      'simple-graphs',
      'twopi',
      'basic',
      ['radial layout']
    ),
  ];
}

/**
 * Get test cases by category
 */
export function getTestsByCategory(category: TestCategory): TestCase[] {
  return generateTestCases().filter((t) => t.category === category);
}

/**
 * Get test cases by layout engine
 */
export function getTestsByLayout(layout: LayoutEngine): TestCase[] {
  return generateTestCases().filter((t) => t.layout === layout);
}

/**
 * Get test cases by difficulty
 */
export function getTestsByDifficulty(
  difficulty: TestCase['difficulty']
): TestCase[] {
  return generateTestCases().filter((t) => t.difficulty === difficulty);
}
