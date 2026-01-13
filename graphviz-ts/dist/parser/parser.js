"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.Parser = void 0;
exports.parse = parse;
const lexer_1 = require("./lexer");
const graph_1 = require("../core/graph");
class Parser {
    lexer;
    currentToken;
    errors = [];
    graph;
    subgraphCounter = 0;
    currentSubgraph = null;
    constructor(input) {
        this.lexer = new lexer_1.Lexer(input);
    }
    error(message) {
        this.errors.push({
            message,
            line: this.currentToken.line,
            column: this.currentToken.column,
        });
    }
    advance() {
        const prev = this.currentToken;
        this.currentToken = this.lexer.nextToken();
        return prev;
    }
    check(type) {
        return this.currentToken.type === type;
    }
    match(...types) {
        for (const type of types) {
            if (this.check(type)) {
                this.advance();
                return true;
            }
        }
        return false;
    }
    expect(type, message) {
        if (this.check(type)) {
            return this.advance();
        }
        this.error(message);
        return null;
    }
    isAtEnd() {
        return this.currentToken.type === lexer_1.TokenType.EOF;
    }
    /**
     * Parse the input and return a Graph
     */
    parse() {
        this.advance(); // Get first token
        try {
            const graph = this.parseGraph();
            return { graph, errors: this.errors };
        }
        catch {
            return { graph: null, errors: this.errors };
        }
    }
    /**
     * graph ::= [strict] (graph | digraph) [ID] '{' stmt_list '}'
     */
    parseGraph() {
        let strict = false;
        let type = 'graph';
        let id = 'G';
        // Check for strict
        if (this.check(lexer_1.TokenType.STRICT)) {
            strict = true;
            this.advance();
        }
        // Parse graph type
        if (this.check(lexer_1.TokenType.GRAPH)) {
            type = 'graph';
            this.advance();
        }
        else if (this.check(lexer_1.TokenType.DIGRAPH)) {
            type = 'digraph';
            this.advance();
        }
        else {
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
        this.graph = (0, graph_1.createGraph)(id, type, strict);
        // Parse body
        if (!this.expect(lexer_1.TokenType.LBRACE, 'Expected "{"')) {
            return null;
        }
        this.parseStmtList();
        this.expect(lexer_1.TokenType.RBRACE, 'Expected "}"');
        return this.graph;
    }
    /**
     * Check if current token can be an ID
     */
    isId() {
        return (this.check(lexer_1.TokenType.ID) ||
            this.check(lexer_1.TokenType.STRING) ||
            this.check(lexer_1.TokenType.HTML_STRING) ||
            this.check(lexer_1.TokenType.NUMBER));
    }
    /**
     * Parse an ID (identifier, string, or number)
     */
    parseId() {
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
    parseStmtList() {
        while (!this.check(lexer_1.TokenType.RBRACE) && !this.isAtEnd()) {
            this.parseStmt();
            this.match(lexer_1.TokenType.SEMICOLON); // Optional semicolon
        }
    }
    /**
     * stmt ::= node_stmt | edge_stmt | attr_stmt | subgraph | ID '=' ID
     */
    parseStmt() {
        // attr_stmt: graph | node | edge
        if (this.check(lexer_1.TokenType.GRAPH)) {
            this.advance();
            const attrs = this.parseAttrList();
            Object.assign(this.graph.attributes, attrs);
            return;
        }
        if (this.check(lexer_1.TokenType.NODE)) {
            this.advance();
            const attrs = this.parseAttrList();
            Object.assign(this.graph.nodeDefaults, attrs);
            return;
        }
        if (this.check(lexer_1.TokenType.EDGE)) {
            this.advance();
            const attrs = this.parseAttrList();
            Object.assign(this.graph.edgeDefaults, attrs);
            return;
        }
        // subgraph
        if (this.check(lexer_1.TokenType.SUBGRAPH) || this.check(lexer_1.TokenType.LBRACE)) {
            this.parseSubgraph();
            return;
        }
        // ID '=' ID (graph attribute)
        if (this.isId()) {
            const id = this.parseId();
            // Check if this is a graph attribute (ID = ID)
            if (this.check(lexer_1.TokenType.EQUALS)) {
                this.advance();
                const value = this.parseId();
                this.graph.attributes[id] = this.parseAttributeValue(value);
                return;
            }
            // Parse as node_id potentially followed by edge or attributes
            const nodeRef = this.parseNodeIdContinuation(id);
            // Check for edge
            if (this.check(lexer_1.TokenType.EDGE_OP)) {
                this.parseEdgeStmt(nodeRef);
                return;
            }
            // Otherwise it's a node statement
            const attrs = this.check(lexer_1.TokenType.LBRACKET) ? this.parseAttrList() : {};
            this.createNode(nodeRef.id, attrs);
        }
    }
    /**
     * Parse the rest of a node_id after the initial ID
     */
    parseNodeIdContinuation(id) {
        const nodeRef = { id };
        // Check for port
        if (this.check(lexer_1.TokenType.COLON)) {
            this.advance();
            // Could be port name or compass point
            if (this.isId()) {
                const portOrCompass = this.parseId();
                // Check if another colon follows (port:compass)
                if (this.check(lexer_1.TokenType.COLON)) {
                    this.advance();
                    nodeRef.port = portOrCompass;
                    if (this.isId()) {
                        nodeRef.compass = this.parseId();
                    }
                }
                else {
                    // Could be just port or just compass
                    if (this.isCompassPoint(portOrCompass)) {
                        nodeRef.compass = portOrCompass;
                    }
                    else {
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
    isCompassPoint(s) {
        return ['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw', 'c', '_'].includes(s.toLowerCase());
    }
    /**
     * node_id ::= ID [port]
     */
    parseNodeId() {
        const id = this.parseId();
        return this.parseNodeIdContinuation(id);
    }
    /**
     * edge_stmt ::= (node_id | subgraph) edgeRHS [attr_list]
     */
    parseEdgeStmt(firstNode) {
        const nodes = [firstNode];
        // Parse edge chain
        while (this.check(lexer_1.TokenType.EDGE_OP)) {
            const op = this.advance().value;
            // Validate edge operator for graph type
            if (this.graph.type === 'digraph' && op !== '->') {
                this.error('Directed graph must use "->" edge operator');
            }
            else if (this.graph.type === 'graph' && op !== '--') {
                this.error('Undirected graph must use "--" edge operator');
            }
            // Parse next node or subgraph
            if (this.check(lexer_1.TokenType.SUBGRAPH) || this.check(lexer_1.TokenType.LBRACE)) {
                const subgraphId = this.parseSubgraph();
                nodes.push(subgraphId);
            }
            else if (this.isId()) {
                nodes.push(this.parseNodeId());
            }
            else {
                this.error('Expected node or subgraph after edge operator');
                return;
            }
        }
        // Parse optional attributes
        const attrs = this.check(lexer_1.TokenType.LBRACKET) ? this.parseAttrList() : {};
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
                    const edgeAttrs = { ...attrs };
                    // Add port info if present
                    if (typeof sourceRef !== 'string' && sourceRef.port) {
                        edgeAttrs.tailport = sourceRef.port;
                    }
                    if (typeof targetRef !== 'string' && targetRef.port) {
                        edgeAttrs.headport = targetRef.port;
                    }
                    (0, graph_1.addEdge)(this.graph, s, t, edgeAttrs);
                }
            }
        }
    }
    /**
     * Get nodes in a subgraph, or return node ID if not a subgraph
     */
    getSubgraphNodes(id) {
        const subgraph = this.graph.subgraphs.get(id);
        if (subgraph && subgraph.nodes.length > 0) {
            return subgraph.nodes;
        }
        return [id];
    }
    /**
     * subgraph ::= [subgraph [ID]] '{' stmt_list '}'
     */
    parseSubgraph() {
        let id;
        if (this.check(lexer_1.TokenType.SUBGRAPH)) {
            this.advance();
            if (this.isId()) {
                id = this.parseId();
            }
            else {
                id = `_subgraph_${this.subgraphCounter++}`;
            }
        }
        else {
            id = `_subgraph_${this.subgraphCounter++}`;
        }
        // Create subgraph
        const subgraph = (0, graph_1.addSubgraph)(this.graph, id);
        const previousSubgraph = this.currentSubgraph;
        this.currentSubgraph = id;
        // Parse body
        if (this.expect(lexer_1.TokenType.LBRACE, 'Expected "{"')) {
            // Parse attributes if present at start
            if (this.check(lexer_1.TokenType.GRAPH)) {
                this.advance();
                const attrs = this.parseAttrList();
                Object.assign(subgraph.attributes, attrs);
            }
            this.parseSubgraphStmtList(id);
            this.expect(lexer_1.TokenType.RBRACE, 'Expected "}"');
        }
        this.currentSubgraph = previousSubgraph;
        return id;
    }
    /**
     * Parse statements inside a subgraph
     */
    parseSubgraphStmtList(subgraphId) {
        while (!this.check(lexer_1.TokenType.RBRACE) && !this.isAtEnd()) {
            this.parseSubgraphStmt(subgraphId);
            this.match(lexer_1.TokenType.SEMICOLON);
        }
    }
    /**
     * Parse a statement inside a subgraph
     */
    parseSubgraphStmt(subgraphId) {
        const subgraph = this.graph.subgraphs.get(subgraphId);
        if (this.check(lexer_1.TokenType.GRAPH)) {
            this.advance();
            const attrs = this.parseAttrList();
            Object.assign(subgraph.attributes, attrs);
            return;
        }
        if (this.check(lexer_1.TokenType.NODE)) {
            this.advance();
            this.parseAttrList(); // Node defaults for subgraph (not fully implemented)
            return;
        }
        if (this.check(lexer_1.TokenType.EDGE)) {
            this.advance();
            this.parseAttrList(); // Edge defaults for subgraph (not fully implemented)
            return;
        }
        if (this.check(lexer_1.TokenType.SUBGRAPH) || this.check(lexer_1.TokenType.LBRACE)) {
            const nestedId = this.parseSubgraph();
            subgraph.subgraphs.push(nestedId);
            return;
        }
        if (this.isId()) {
            const id = this.parseId();
            // Check for attribute assignment
            if (this.check(lexer_1.TokenType.EQUALS)) {
                this.advance();
                const value = this.parseId();
                subgraph.attributes[id] = this.parseAttributeValue(value);
                return;
            }
            const nodeRef = this.parseNodeIdContinuation(id);
            // Check for edge
            if (this.check(lexer_1.TokenType.EDGE_OP)) {
                this.parseEdgeStmt(nodeRef);
                return;
            }
            // Node statement
            const attrs = this.check(lexer_1.TokenType.LBRACKET) ? this.parseAttrList() : {};
            this.createNode(nodeRef.id, attrs);
            (0, graph_1.addNodeToSubgraph)(this.graph, subgraphId, nodeRef.id);
        }
    }
    /**
     * Create a node with attributes
     */
    createNode(id, attrs) {
        (0, graph_1.addNode)(this.graph, id, attrs);
        // Add to current subgraph if any
        if (this.currentSubgraph) {
            (0, graph_1.addNodeToSubgraph)(this.graph, this.currentSubgraph, id);
        }
    }
    /**
     * attr_list ::= '[' [a_list] ']' [attr_list]
     */
    parseAttrList() {
        const attrs = {};
        while (this.check(lexer_1.TokenType.LBRACKET)) {
            this.advance();
            while (!this.check(lexer_1.TokenType.RBRACKET) && !this.isAtEnd()) {
                if (this.isId()) {
                    const key = this.parseId();
                    if (this.check(lexer_1.TokenType.EQUALS)) {
                        this.advance();
                        const value = this.parseId();
                        attrs[key] = this.parseAttributeValue(value);
                    }
                    else {
                        // Attribute without value defaults to true
                        attrs[key] = true;
                    }
                    // Optional separator
                    this.match(lexer_1.TokenType.SEMICOLON, lexer_1.TokenType.COMMA);
                }
                else {
                    break;
                }
            }
            this.expect(lexer_1.TokenType.RBRACKET, 'Expected "]"');
        }
        return attrs;
    }
    /**
     * Convert string attribute value to appropriate type
     */
    parseAttributeValue(value) {
        // Try to parse as number
        const num = parseFloat(value);
        if (!isNaN(num) && isFinite(num)) {
            return num;
        }
        // Boolean values
        if (value.toLowerCase() === 'true')
            return true;
        if (value.toLowerCase() === 'false')
            return false;
        // Return as string
        return value;
    }
}
exports.Parser = Parser;
/**
 * Parse DOT language input into a Graph
 */
function parse(input) {
    const parser = new Parser(input);
    return parser.parse();
}
//# sourceMappingURL=parser.js.map