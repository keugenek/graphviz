/**
 * DOT Language Lexer (Tokenizer)
 *
 * Tokenizes DOT language input into a stream of tokens.
 */
export declare enum TokenType {
    GRAPH = "GRAPH",
    DIGRAPH = "DIGRAPH",
    SUBGRAPH = "SUBGRAPH",
    NODE = "NODE",
    EDGE = "EDGE",
    STRICT = "STRICT",
    ID = "ID",
    STRING = "STRING",
    HTML_STRING = "HTML_STRING",
    NUMBER = "NUMBER",
    EDGE_OP = "EDGE_OP",// -> or --
    EQUALS = "EQUALS",// =
    COLON = "COLON",// :
    SEMICOLON = "SEMICOLON",// ;
    COMMA = "COMMA",// ,
    LBRACE = "LBRACE",// {
    RBRACE = "RBRACE",// }
    LBRACKET = "LBRACKET",// [
    RBRACKET = "RBRACKET",// ]
    LPAREN = "LPAREN",// (
    RPAREN = "RPAREN",// )
    EOF = "EOF",
    ERROR = "ERROR"
}
export interface Token {
    type: TokenType;
    value: string;
    line: number;
    column: number;
}
export declare class Lexer {
    private input;
    private pos;
    private line;
    private column;
    constructor(input: string);
    setIsDigraph(_value: boolean): void;
    private peek;
    private advance;
    private skipWhitespace;
    private readString;
    private readHtmlString;
    private readNumber;
    private readIdentifier;
    nextToken(): Token;
    /**
     * Peek at the next token without consuming it
     */
    peekToken(): Token;
    /**
     * Tokenize the entire input
     */
    tokenize(): Token[];
}
//# sourceMappingURL=lexer.d.ts.map