/**
 * DOT Language Lexer (Tokenizer)
 *
 * Tokenizes DOT language input into a stream of tokens.
 */

export enum TokenType {
  // Keywords
  GRAPH = 'GRAPH',
  DIGRAPH = 'DIGRAPH',
  SUBGRAPH = 'SUBGRAPH',
  NODE = 'NODE',
  EDGE = 'EDGE',
  STRICT = 'STRICT',

  // Identifiers and literals
  ID = 'ID',
  STRING = 'STRING',
  HTML_STRING = 'HTML_STRING',
  NUMBER = 'NUMBER',

  // Operators
  EDGE_OP = 'EDGE_OP',         // -> or --
  EQUALS = 'EQUALS',           // =
  COLON = 'COLON',             // :
  SEMICOLON = 'SEMICOLON',     // ;
  COMMA = 'COMMA',             // ,

  // Brackets
  LBRACE = 'LBRACE',           // {
  RBRACE = 'RBRACE',           // }
  LBRACKET = 'LBRACKET',       // [
  RBRACKET = 'RBRACKET',       // ]
  LPAREN = 'LPAREN',           // (
  RPAREN = 'RPAREN',           // )

  // Special
  EOF = 'EOF',
  ERROR = 'ERROR',
}

export interface Token {
  type: TokenType;
  value: string;
  line: number;
  column: number;
}

const KEYWORDS: Record<string, TokenType> = {
  'graph': TokenType.GRAPH,
  'digraph': TokenType.DIGRAPH,
  'subgraph': TokenType.SUBGRAPH,
  'node': TokenType.NODE,
  'edge': TokenType.EDGE,
  'strict': TokenType.STRICT,
};

export class Lexer {
  private input: string;
  private pos: number = 0;
  private line: number = 1;
  private column: number = 1;

  constructor(input: string) {
    this.input = input;
  }

  setIsDigraph(_value: boolean): void {
    // Reserved for future use (different edge operator validation)
  }

  private peek(offset: number = 0): string {
    return this.input[this.pos + offset] || '';
  }

  private advance(): string {
    const char = this.input[this.pos++];
    if (char === '\n') {
      this.line++;
      this.column = 1;
    } else {
      this.column++;
    }
    return char;
  }

  private skipWhitespace(): void {
    while (this.pos < this.input.length) {
      const char = this.peek();

      // Skip whitespace
      if (/\s/.test(char)) {
        this.advance();
        continue;
      }

      // Skip single-line comments (// or #)
      if ((char === '/' && this.peek(1) === '/') || char === '#') {
        while (this.pos < this.input.length && this.peek() !== '\n') {
          this.advance();
        }
        continue;
      }

      // Skip multi-line comments /* */
      if (char === '/' && this.peek(1) === '*') {
        this.advance(); // /
        this.advance(); // *
        while (this.pos < this.input.length) {
          if (this.peek() === '*' && this.peek(1) === '/') {
            this.advance(); // *
            this.advance(); // /
            break;
          }
          this.advance();
        }
        continue;
      }

      break;
    }
  }

  private readString(): Token {
    const startLine = this.line;
    const startColumn = this.column;
    const quote = this.advance(); // consume opening quote
    let value = '';
    let escaped = false;

    while (this.pos < this.input.length) {
      const char = this.peek();

      if (escaped) {
        // Handle escape sequences
        switch (char) {
          case 'n': value += '\n'; break;
          case 't': value += '\t'; break;
          case 'r': value += '\r'; break;
          case '\\': value += '\\'; break;
          case '"': value += '"'; break;
          case "'": value += "'"; break;
          default: value += char;
        }
        this.advance();
        escaped = false;
        continue;
      }

      if (char === '\\') {
        escaped = true;
        this.advance();
        continue;
      }

      if (char === quote) {
        this.advance(); // consume closing quote
        return { type: TokenType.STRING, value, line: startLine, column: startColumn };
      }

      value += this.advance();
    }

    return { type: TokenType.ERROR, value: 'Unterminated string', line: startLine, column: startColumn };
  }

  private readHtmlString(): Token {
    const startLine = this.line;
    const startColumn = this.column;
    this.advance(); // consume <
    let value = '';
    let depth = 1;

    while (this.pos < this.input.length && depth > 0) {
      const char = this.peek();

      if (char === '<') {
        depth++;
      } else if (char === '>') {
        depth--;
        if (depth === 0) {
          this.advance();
          break;
        }
      }

      value += this.advance();
    }

    if (depth !== 0) {
      return { type: TokenType.ERROR, value: 'Unterminated HTML string', line: startLine, column: startColumn };
    }

    return { type: TokenType.HTML_STRING, value, line: startLine, column: startColumn };
  }

  private readNumber(): Token {
    const startLine = this.line;
    const startColumn = this.column;
    let value = '';

    // Handle negative numbers
    if (this.peek() === '-') {
      value += this.advance();
    }

    // Read integer part
    while (/[0-9]/.test(this.peek())) {
      value += this.advance();
    }

    // Read decimal part
    if (this.peek() === '.' && /[0-9]/.test(this.peek(1))) {
      value += this.advance(); // .
      while (/[0-9]/.test(this.peek())) {
        value += this.advance();
      }
    }

    // Read exponent
    if (/[eE]/.test(this.peek())) {
      value += this.advance();
      if (/[+-]/.test(this.peek())) {
        value += this.advance();
      }
      while (/[0-9]/.test(this.peek())) {
        value += this.advance();
      }
    }

    return { type: TokenType.NUMBER, value, line: startLine, column: startColumn };
  }

  private readIdentifier(): Token {
    const startLine = this.line;
    const startColumn = this.column;
    let value = '';

    // Read identifier characters
    while (/[a-zA-Z0-9_]/.test(this.peek())) {
      value += this.advance();
    }

    // Check for keywords (case-insensitive)
    const keyword = KEYWORDS[value.toLowerCase()];
    if (keyword) {
      return { type: keyword, value, line: startLine, column: startColumn };
    }

    return { type: TokenType.ID, value, line: startLine, column: startColumn };
  }

  nextToken(): Token {
    this.skipWhitespace();

    if (this.pos >= this.input.length) {
      return { type: TokenType.EOF, value: '', line: this.line, column: this.column };
    }

    const startLine = this.line;
    const startColumn = this.column;
    const char = this.peek();

    // String literals
    if (char === '"' || char === "'") {
      return this.readString();
    }

    // HTML-like strings
    if (char === '<') {
      return this.readHtmlString();
    }

    // Numbers (including negative)
    if (/[0-9]/.test(char) || (char === '-' && /[0-9]/.test(this.peek(1)))) {
      return this.readNumber();
    }

    // Identifiers and keywords
    if (/[a-zA-Z_]/.test(char)) {
      return this.readIdentifier();
    }

    // Single character tokens
    this.advance();
    switch (char) {
      case '{':
        return { type: TokenType.LBRACE, value: char, line: startLine, column: startColumn };
      case '}':
        return { type: TokenType.RBRACE, value: char, line: startLine, column: startColumn };
      case '[':
        return { type: TokenType.LBRACKET, value: char, line: startLine, column: startColumn };
      case ']':
        return { type: TokenType.RBRACKET, value: char, line: startLine, column: startColumn };
      case '(':
        return { type: TokenType.LPAREN, value: char, line: startLine, column: startColumn };
      case ')':
        return { type: TokenType.RPAREN, value: char, line: startLine, column: startColumn };
      case '=':
        return { type: TokenType.EQUALS, value: char, line: startLine, column: startColumn };
      case ':':
        return { type: TokenType.COLON, value: char, line: startLine, column: startColumn };
      case ';':
        return { type: TokenType.SEMICOLON, value: char, line: startLine, column: startColumn };
      case ',':
        return { type: TokenType.COMMA, value: char, line: startLine, column: startColumn };
      case '-':
        // Edge operators
        if (this.peek() === '>') {
          this.advance();
          return { type: TokenType.EDGE_OP, value: '->', line: startLine, column: startColumn };
        }
        if (this.peek() === '-') {
          this.advance();
          return { type: TokenType.EDGE_OP, value: '--', line: startLine, column: startColumn };
        }
        return { type: TokenType.ERROR, value: `Unexpected character: ${char}`, line: startLine, column: startColumn };
    }

    return { type: TokenType.ERROR, value: `Unexpected character: ${char}`, line: startLine, column: startColumn };
  }

  /**
   * Peek at the next token without consuming it
   */
  peekToken(): Token {
    const savedPos = this.pos;
    const savedLine = this.line;
    const savedColumn = this.column;

    const token = this.nextToken();

    this.pos = savedPos;
    this.line = savedLine;
    this.column = savedColumn;

    return token;
  }

  /**
   * Tokenize the entire input
   */
  tokenize(): Token[] {
    const tokens: Token[] = [];
    let token: Token;

    do {
      token = this.nextToken();
      tokens.push(token);
    } while (token.type !== TokenType.EOF && token.type !== TokenType.ERROR);

    return tokens;
  }
}
