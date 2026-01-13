/**
 * DOT Language Parser
 *
 * A recursive descent parser for the DOT graph description language.
 *
 * Grammar (simplified):
 *   graph      ::= [strict] (graph | digraph) [ID] '{' stmt_list '}'
 *   stmt_list  ::= [stmt [';'] stmt_list]
 *   stmt       ::= node_stmt | edge_stmt | attr_stmt | subgraph | ID '=' ID
 *   attr_stmt  ::= (graph | node | edge) attr_list
 *   attr_list  ::= '[' [a_list] ']' [attr_list]
 *   a_list     ::= ID '=' ID [(';' | ',')] [a_list]
 *   edge_stmt  ::= (node_id | subgraph) edgeRHS [attr_list]
 *   edgeRHS    ::= edgeop (node_id | subgraph) [edgeRHS]
 *   node_stmt  ::= node_id [attr_list]
 *   node_id    ::= ID [port]
 *   port       ::= ':' ID [':' compass_pt] | ':' compass_pt
 *   subgraph   ::= [subgraph [ID]] '{' stmt_list '}'
 *   compass_pt ::= (n | ne | e | se | s | sw | w | nw | c | _)
 */

import { Lexer, Token, TokenType } from './lexer';
import {
  Graph,
  GraphType,
  NodeAttributes,
  EdgeAttributes,
} from '../core/types';
import { createGraph, addNode, addEdge, addSubgraph, addNodeToSubgraph } from '../core/graph';

export interface ParseError {
  message: string;
  line: number;
  column: number;
}

export interface ParseResult {
  graph: Graph | null;
  errors: ParseError[];
}

interface NodeRef {
  id: string;
  port?: string;
  compass?: string;
}

export class Parser {
  private lexer: Lexer;
  private currentToken!: Token;
  private errors: ParseError[] = [];
  private graph!: Graph;
  private subgraphCounter: number = 0;
  private currentSubgraph: string | null = null;

  constructor(input: string) {
    this.lexer = new Lexer(input);
  }

  private error(message: string): void {
    this.errors.push({
      message,
      line: this.currentToken.line,
      column: this.currentToken.column,
    });
  }

  private advance(): Token {
    const prev = this.currentToken;
    this.currentToken = this.lexer.nextToken();
    return prev;
  }

  private check(type: TokenType): boolean {
    return this.currentToken.type === type;
  }

  private match(...types: TokenType[]): boolean {
    for (const type of types) {
      if (this.check(type)) {
        this.advance();
        return true;
      }
    }
    return false;
  }

  private expect(type: TokenType, message: string): Token | null {
    if (this.check(type)) {
      return this.advance();
    }
    this.error(message);
    return null;
  }

  private isAtEnd(): boolean {
    return this.currentToken.type === TokenType.EOF;
  }

  /**
   * Parse the input and return a Graph
   */
  parse(): ParseResult {
    this.advance(); // Get first token

    try {
      const graph = this.parseGraph();
      return { graph, errors: this.errors };
    } catch {
      return { graph: null, errors: this.errors };
    }
  }

  /**
   * graph ::= [strict] (graph | digraph) [ID] '{' stmt_list '}'
   */
  private parseGraph(): Graph | null {
    let strict = false;
    let type: GraphType = 'graph';
    let id = 'G';

    // Check for strict
    if (this.check(TokenType.STRICT)) {
      strict = true;
      this.advance();
    }

    // Parse graph type
    if (this.check(TokenType.GRAPH)) {
      type = 'graph';
      this.advance();
    } else if (this.check(TokenType.DIGRAPH)) {
      type = 'digraph';
      this.advance();
    } else {
      this.error('Expected "graph" or "digraph"');
      return null;
    }

    // Set digraph mode in lexer for proper edge operator handling
    this.lexer.setIsDigraph(type === 'digraph');

    // Optional ID
    if (this.isId()) {
      id = this.parseId();
    }

    // Create the graph
    this.graph = createGraph(id, type, strict);

    // Parse body
    if (!this.expect(TokenType.LBRACE, 'Expected "{"')) {
      return null;
    }

    this.parseStmtList();

    this.expect(TokenType.RBRACE, 'Expected "}"');

    return this.graph;
  }

  /**
   * Check if current token can be an ID
   */
  private isId(): boolean {
    return (
      this.check(TokenType.ID) ||
      this.check(TokenType.STRING) ||
      this.check(TokenType.HTML_STRING) ||
      this.check(TokenType.NUMBER)
    );
  }

  /**
   * Parse an ID (identifier, string, or number)
   */
  private parseId(): string {
    const token = this.currentToken;
    if (this.isId()) {
      this.advance();
      return token.value;
    }
    this.error('Expected identifier');
    return '';
  }

  /**
   * stmt_list ::= [stmt [';'] stmt_list]
   */
  private parseStmtList(): void {
    while (!this.check(TokenType.RBRACE) && !this.isAtEnd()) {
      this.parseStmt();
      this.match(TokenType.SEMICOLON); // Optional semicolon
    }
  }

  /**
   * stmt ::= node_stmt | edge_stmt | attr_stmt | subgraph | ID '=' ID
   */
  private parseStmt(): void {
    // attr_stmt: graph | node | edge
    if (this.check(TokenType.GRAPH)) {
      this.advance();
      const attrs = this.parseAttrList();
      Object.assign(this.graph.attributes, attrs);
      return;
    }

    if (this.check(TokenType.NODE)) {
      this.advance();
      const attrs = this.parseAttrList();
      Object.assign(this.graph.nodeDefaults, attrs);
      return;
    }

    if (this.check(TokenType.EDGE)) {
      this.advance();
      const attrs = this.parseAttrList();
      Object.assign(this.graph.edgeDefaults, attrs);
      return;
    }

    // subgraph
    if (this.check(TokenType.SUBGRAPH) || this.check(TokenType.LBRACE)) {
      this.parseSubgraph();
      return;
    }

    // ID '=' ID (graph attribute)
    if (this.isId()) {
      const id = this.parseId();

      // Check if this is a graph attribute (ID = ID)
      if (this.check(TokenType.EQUALS)) {
        this.advance();
        const value = this.parseId();
        this.graph.attributes[id] = this.parseAttributeValue(value);
        return;
      }

      // Parse as node_id potentially followed by edge or attributes
      const nodeRef = this.parseNodeIdContinuation(id);

      // Check for edge
      if (this.check(TokenType.EDGE_OP)) {
        this.parseEdgeStmt(nodeRef);
        return;
      }

      // Otherwise it's a node statement
      const attrs = this.check(TokenType.LBRACKET) ? this.parseAttrList() : {};
      this.createNode(nodeRef.id, attrs);
    }
  }

  /**
   * Parse the rest of a node_id after the initial ID
   */
  private parseNodeIdContinuation(id: string): NodeRef {
    const nodeRef: NodeRef = { id };

    // Check for port
    if (this.check(TokenType.COLON)) {
      this.advance();

      // Could be port name or compass point
      if (this.isId()) {
        const portOrCompass = this.parseId();

        // Check if another colon follows (port:compass)
        if (this.check(TokenType.COLON)) {
          this.advance();
          nodeRef.port = portOrCompass;
          if (this.isId()) {
            nodeRef.compass = this.parseId();
          }
        } else {
          // Could be just port or just compass
          if (this.isCompassPoint(portOrCompass)) {
            nodeRef.compass = portOrCompass;
          } else {
            nodeRef.port = portOrCompass;
          }
        }
      }
    }

    return nodeRef;
  }

  /**
   * Check if string is a compass point
   */
  private isCompassPoint(s: string): boolean {
    return ['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw', 'c', '_'].includes(s.toLowerCase());
  }

  /**
   * node_id ::= ID [port]
   */
  private parseNodeId(): NodeRef {
    const id = this.parseId();
    return this.parseNodeIdContinuation(id);
  }

  /**
   * edge_stmt ::= (node_id | subgraph) edgeRHS [attr_list]
   */
  private parseEdgeStmt(firstNode: NodeRef | string): void {
    const nodes: (NodeRef | string)[] = [firstNode];

    // Parse edge chain
    while (this.check(TokenType.EDGE_OP)) {
      const op = this.advance().value;

      // Validate edge operator for graph type
      if (this.graph.type === 'digraph' && op !== '->') {
        this.error('Directed graph must use "->" edge operator');
      } else if (this.graph.type === 'graph' && op !== '--') {
        this.error('Undirected graph must use "--" edge operator');
      }

      // Parse next node or subgraph
      if (this.check(TokenType.SUBGRAPH) || this.check(TokenType.LBRACE)) {
        const subgraphId = this.parseSubgraph();
        nodes.push(subgraphId);
      } else if (this.isId()) {
        nodes.push(this.parseNodeId());
      } else {
        this.error('Expected node or subgraph after edge operator');
        return;
      }
    }

    // Parse optional attributes
    const attrs = this.check(TokenType.LBRACKET) ? this.parseAttrList() : {};

    // Create edges between consecutive nodes
    for (let i = 0; i < nodes.length - 1; i++) {
      const sourceRef = nodes[i];
      const targetRef = nodes[i + 1];

      const source = typeof sourceRef === 'string' ? sourceRef : sourceRef.id;
      const target = typeof targetRef === 'string' ? targetRef : targetRef.id;

      // Handle subgraph nodes
      const sourceNodes = this.getSubgraphNodes(source);
      const targetNodes = this.getSubgraphNodes(target);

      // Create edges
      for (const s of sourceNodes) {
        for (const t of targetNodes) {
          const edgeAttrs: EdgeAttributes = { ...attrs };

          // Add port info if present
          if (typeof sourceRef !== 'string' && sourceRef.port) {
            edgeAttrs.tailport = sourceRef.port;
          }
          if (typeof targetRef !== 'string' && targetRef.port) {
            edgeAttrs.headport = targetRef.port;
          }

          addEdge(this.graph, s, t, edgeAttrs);
        }
      }
    }
  }

  /**
   * Get nodes in a subgraph, or return node ID if not a subgraph
   */
  private getSubgraphNodes(id: string): string[] {
    const subgraph = this.graph.subgraphs.get(id);
    if (subgraph && subgraph.nodes.length > 0) {
      return subgraph.nodes;
    }
    return [id];
  }

  /**
   * subgraph ::= [subgraph [ID]] '{' stmt_list '}'
   */
  private parseSubgraph(): string {
    let id: string;

    if (this.check(TokenType.SUBGRAPH)) {
      this.advance();
      if (this.isId()) {
        id = this.parseId();
      } else {
        id = `_subgraph_${this.subgraphCounter++}`;
      }
    } else {
      id = `_subgraph_${this.subgraphCounter++}`;
    }

    // Create subgraph
    const subgraph = addSubgraph(this.graph, id);
    const previousSubgraph = this.currentSubgraph;
    this.currentSubgraph = id;

    // Parse body
    if (this.expect(TokenType.LBRACE, 'Expected "{"')) {
      // Parse attributes if present at start
      if (this.check(TokenType.GRAPH)) {
        this.advance();
        const attrs = this.parseAttrList();
        Object.assign(subgraph.attributes, attrs);
      }

      this.parseSubgraphStmtList(id);
      this.expect(TokenType.RBRACE, 'Expected "}"');
    }

    this.currentSubgraph = previousSubgraph;
    return id;
  }

  /**
   * Parse statements inside a subgraph
   */
  private parseSubgraphStmtList(subgraphId: string): void {
    while (!this.check(TokenType.RBRACE) && !this.isAtEnd()) {
      this.parseSubgraphStmt(subgraphId);
      this.match(TokenType.SEMICOLON);
    }
  }

  /**
   * Parse a statement inside a subgraph
   */
  private parseSubgraphStmt(subgraphId: string): void {
    const subgraph = this.graph.subgraphs.get(subgraphId)!;

    if (this.check(TokenType.GRAPH)) {
      this.advance();
      const attrs = this.parseAttrList();
      Object.assign(subgraph.attributes, attrs);
      return;
    }

    if (this.check(TokenType.NODE)) {
      this.advance();
      this.parseAttrList(); // Node defaults for subgraph (not fully implemented)
      return;
    }

    if (this.check(TokenType.EDGE)) {
      this.advance();
      this.parseAttrList(); // Edge defaults for subgraph (not fully implemented)
      return;
    }

    if (this.check(TokenType.SUBGRAPH) || this.check(TokenType.LBRACE)) {
      const nestedId = this.parseSubgraph();
      subgraph.subgraphs.push(nestedId);
      return;
    }

    if (this.isId()) {
      const id = this.parseId();

      // Check for attribute assignment
      if (this.check(TokenType.EQUALS)) {
        this.advance();
        const value = this.parseId();
        subgraph.attributes[id] = this.parseAttributeValue(value);
        return;
      }

      const nodeRef = this.parseNodeIdContinuation(id);

      // Check for edge
      if (this.check(TokenType.EDGE_OP)) {
        this.parseEdgeStmt(nodeRef);
        return;
      }

      // Node statement
      const attrs = this.check(TokenType.LBRACKET) ? this.parseAttrList() : {};
      this.createNode(nodeRef.id, attrs);
      addNodeToSubgraph(this.graph, subgraphId, nodeRef.id);
    }
  }

  /**
   * Create a node with attributes
   */
  private createNode(id: string, attrs: NodeAttributes): void {
    addNode(this.graph, id, attrs);

    // Add to current subgraph if any
    if (this.currentSubgraph) {
      addNodeToSubgraph(this.graph, this.currentSubgraph, id);
    }
  }

  /**
   * attr_list ::= '[' [a_list] ']' [attr_list]
   */
  private parseAttrList(): Record<string, unknown> {
    const attrs: Record<string, unknown> = {};

    while (this.check(TokenType.LBRACKET)) {
      this.advance();

      while (!this.check(TokenType.RBRACKET) && !this.isAtEnd()) {
        if (this.isId()) {
          const key = this.parseId();

          if (this.check(TokenType.EQUALS)) {
            this.advance();
            const value = this.parseId();
            attrs[key] = this.parseAttributeValue(value);
          } else {
            // Attribute without value defaults to true
            attrs[key] = true;
          }

          // Optional separator
          this.match(TokenType.SEMICOLON, TokenType.COMMA);
        } else {
          break;
        }
      }

      this.expect(TokenType.RBRACKET, 'Expected "]"');
    }

    return attrs;
  }

  /**
   * Convert string attribute value to appropriate type
   */
  private parseAttributeValue(value: string): unknown {
    // Try to parse as number
    const num = parseFloat(value);
    if (!isNaN(num) && isFinite(num)) {
      return num;
    }

    // Boolean values
    if (value.toLowerCase() === 'true') return true;
    if (value.toLowerCase() === 'false') return false;

    // Return as string
    return value;
  }
}

/**
 * Parse DOT language input into a Graph
 */
export function parse(input: string): ParseResult {
  const parser = new Parser(input);
  return parser.parse();
}
