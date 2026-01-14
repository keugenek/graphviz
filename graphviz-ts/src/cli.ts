#!/usr/bin/env node
/**
 * graphviz-ts CLI
 *
 * Command-line interface for graph visualization.
 *
 * Usage:
 *   graphviz-ts [options] <input.dot>
 *   cat graph.dot | graphviz-ts [options]
 *
 * Options:
 *   -K, --layout <engine>   Layout engine: dot, neato, fdp, circo, twopi (default: dot)
 *   -T, --format <format>   Output format: svg, json (default: svg)
 *   -o, --output <file>     Output file (default: stdout)
 *   -s, --scale <number>    Scale factor (default: 1)
 *   -h, --help              Show help
 *   -v, --version           Show version
 */

import * as fs from 'fs';
import { Graphviz, LayoutEngine, OutputFormat } from './index';

interface CliOptions {
  layout: LayoutEngine;
  format: OutputFormat;
  output: string | null;
  scale: number;
  help: boolean;
  version: boolean;
  input: string | null;
}

const VERSION = '1.0.0';

const HELP = `
graphviz-ts - Graph visualization in TypeScript

Usage:
  graphviz-ts [options] <input.dot>
  cat graph.dot | graphviz-ts [options]

Options:
  -K, --layout <engine>   Layout engine: dot, neato, fdp, circo, twopi
                          (default: dot for digraph, neato for graph)
  -T, --format <format>   Output format: svg, json (default: svg)
  -o, --output <file>     Output file (default: stdout)
  -s, --scale <number>    Scale factor (default: 1)
  -h, --help              Show this help message
  -v, --version           Show version

Layout Engines:
  dot     Hierarchical layout for directed graphs (Sugiyama algorithm)
  neato   Spring model / force-directed layout
  fdp     Force-directed placement (Fruchterman-Reingold)
  circo   Circular layout
  twopi   Radial layout

Examples:
  # Render a DOT file to SVG
  graphviz-ts input.dot > output.svg

  # Use force-directed layout
  graphviz-ts -K neato input.dot -o output.svg

  # Output JSON with layout information
  graphviz-ts -T json input.dot

  # Read from stdin
  echo "digraph { A -> B }" | graphviz-ts

  # Scale the output
  graphviz-ts -s 2 input.dot > large.svg
`;

function parseArgs(args: string[]): CliOptions {
  const options: CliOptions = {
    layout: 'dot',
    format: 'svg',
    output: null,
    scale: 1,
    help: false,
    version: false,
    input: null,
  };

  let i = 0;
  while (i < args.length) {
    const arg = args[i];

    switch (arg) {
      case '-K':
      case '--layout':
        i++;
        const layout = args[i] as LayoutEngine;
        if (!['dot', 'neato', 'fdp', 'circo', 'twopi'].includes(layout)) {
          console.error(`Error: Unknown layout engine: ${layout}`);
          process.exit(1);
        }
        options.layout = layout;
        break;

      case '-T':
      case '--format':
        i++;
        const format = args[i] as OutputFormat;
        if (!['svg', 'json'].includes(format)) {
          console.error(`Error: Unknown output format: ${format}`);
          process.exit(1);
        }
        options.format = format;
        break;

      case '-o':
      case '--output':
        i++;
        options.output = args[i];
        break;

      case '-s':
      case '--scale':
        i++;
        options.scale = parseFloat(args[i]);
        if (isNaN(options.scale) || options.scale <= 0) {
          console.error(`Error: Invalid scale value: ${args[i]}`);
          process.exit(1);
        }
        break;

      case '-h':
      case '--help':
        options.help = true;
        break;

      case '-v':
      case '--version':
        options.version = true;
        break;

      default:
        if (arg.startsWith('-')) {
          // Handle combined short options like -Tsvg or -Kdot
          if (arg.startsWith('-K') && arg.length > 2) {
            const layout = arg.slice(2) as LayoutEngine;
            if (!['dot', 'neato', 'fdp', 'circo', 'twopi'].includes(layout)) {
              console.error(`Error: Unknown layout engine: ${layout}`);
              process.exit(1);
            }
            options.layout = layout;
          } else if (arg.startsWith('-T') && arg.length > 2) {
            const format = arg.slice(2) as OutputFormat;
            if (!['svg', 'json'].includes(format)) {
              console.error(`Error: Unknown output format: ${format}`);
              process.exit(1);
            }
            options.format = format;
          } else if (arg.startsWith('-o') && arg.length > 2) {
            options.output = arg.slice(2);
          } else if (arg.startsWith('-s') && arg.length > 2) {
            options.scale = parseFloat(arg.slice(2));
          } else {
            console.error(`Error: Unknown option: ${arg}`);
            process.exit(1);
          }
        } else {
          // Input file
          options.input = arg;
        }
    }

    i++;
  }

  return options;
}

async function readStdin(): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = '';
    const stdin = process.stdin;

    stdin.setEncoding('utf8');

    stdin.on('readable', () => {
      let chunk;
      while ((chunk = stdin.read()) !== null) {
        data += chunk;
      }
    });

    stdin.on('end', () => {
      resolve(data);
    });

    stdin.on('error', reject);

    // If stdin is a TTY (no pipe), don't wait for input
    if (stdin.isTTY) {
      resolve('');
    }
  });
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const options = parseArgs(args);

  if (options.version) {
    console.log(`graphviz-ts version ${VERSION}`);
    process.exit(0);
  }

  if (options.help) {
    console.log(HELP);
    process.exit(0);
  }

  // Read input
  let dot: string;

  if (options.input) {
    // Read from file
    if (!fs.existsSync(options.input)) {
      console.error(`Error: File not found: ${options.input}`);
      process.exit(1);
    }
    dot = fs.readFileSync(options.input, 'utf8');
  } else {
    // Read from stdin
    dot = await readStdin();

    if (!dot.trim()) {
      console.error('Error: No input provided. Use -h for help.');
      process.exit(1);
    }
  }

  try {
    // Process the graph
    const gv = new Graphviz({
      engine: options.layout,
      format: options.format,
      scale: options.scale,
    });

    const output = gv.parse(dot).layout().render();

    // Write output
    if (options.output) {
      fs.writeFileSync(options.output, output);
      console.error(`Output written to ${options.output}`);
    } else {
      console.log(output);
    }
  } catch (error) {
    console.error(`Error: ${(error as Error).message}`);
    process.exit(1);
  }
}

// Run CLI
main().catch((error) => {
  console.error(`Error: ${error.message}`);
  process.exit(1);
});
