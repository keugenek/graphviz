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
import { Graph } from '../core/types';
export interface ParseError {
    message: string;
    line: number;
    column: number;
}
export interface ParseResult {
    graph: Graph | null;
    errors: ParseError[];
}
export declare class Parser {
    private lexer;
    private currentToken;
    private errors;
    private graph;
    private subgraphCounter;
    private currentSubgraph;
    constructor(input: string);
    private error;
    private advance;
    private check;
    private match;
    private expect;
    private isAtEnd;
    /**
     * Parse the input and return a Graph
     */
    parse(): ParseResult;
    /**
     * graph ::= [strict] (graph | digraph) [ID] '{' stmt_list '}'
     */
    private parseGraph;
    /**
     * Check if current token can be an ID
     */
    private isId;
    /**
     * Parse an ID (identifier, string, or number)
     */
    private parseId;
    /**
     * stmt_list ::= [stmt [';'] stmt_list]
     */
    private parseStmtList;
    /**
     * stmt ::= node_stmt | edge_stmt | attr_stmt | subgraph | ID '=' ID
     */
    private parseStmt;
    /**
     * Parse the rest of a node_id after the initial ID
     */
    private parseNodeIdContinuation;
    /**
     * Check if string is a compass point
     */
    private isCompassPoint;
    /**
     * node_id ::= ID [port]
     */
    private parseNodeId;
    /**
     * edge_stmt ::= (node_id | subgraph) edgeRHS [attr_list]
     */
    private parseEdgeStmt;
    /**
     * Get nodes in a subgraph, or return node ID if not a subgraph
     */
    private getSubgraphNodes;
    /**
     * subgraph ::= [subgraph [ID]] '{' stmt_list '}'
     */
    private parseSubgraph;
    /**
     * Parse statements inside a subgraph
     */
    private parseSubgraphStmtList;
    /**
     * Parse a statement inside a subgraph
     */
    private parseSubgraphStmt;
    /**
     * Create a node with attributes
     */
    private createNode;
    /**
     * attr_list ::= '[' [a_list] ']' [attr_list]
     */
    private parseAttrList;
    /**
     * Convert string attribute value to appropriate type
     */
    private parseAttributeValue;
}
/**
 * Parse DOT language input into a Graph
 */
export declare function parse(input: string): ParseResult;
//# sourceMappingURL=parser.d.ts.map