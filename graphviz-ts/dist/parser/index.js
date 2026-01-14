"use strict";
/**
 * Parser module - DOT language parsing
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.parse = exports.Parser = exports.TokenType = exports.Lexer = void 0;
var lexer_1 = require("./lexer");
Object.defineProperty(exports, "Lexer", { enumerable: true, get: function () { return lexer_1.Lexer; } });
Object.defineProperty(exports, "TokenType", { enumerable: true, get: function () { return lexer_1.TokenType; } });
var parser_1 = require("./parser");
Object.defineProperty(exports, "Parser", { enumerable: true, get: function () { return parser_1.Parser; } });
Object.defineProperty(exports, "parse", { enumerable: true, get: function () { return parser_1.parse; } });
//# sourceMappingURL=index.js.map