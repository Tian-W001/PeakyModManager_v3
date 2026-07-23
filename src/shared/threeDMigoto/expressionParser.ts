import {
  BinaryOperator,
  ExpressionNode,
  ExpressionParseResult,
  IniDiagnostic,
  SourcePosition,
  SourceRange,
  UnaryOperator,
} from "./types";

interface ExpressionParseOptions {
  offset?: number;
  line?: number;
  column?: number;
}

type TokenKind = "number" | "identifier" | "operator" | "left-paren" | "right-paren" | "eof";

interface Token {
  kind: TokenKind;
  text: string;
  start: number;
  end: number;
}

const OPERATORS = [
  "===",
  "!==",
  "<<",
  ">>",
  "==",
  "!=",
  "//",
  "<=",
  ">=",
  "&&",
  "||",
  "**",
  "!",
  "~",
  "&",
  "|",
  "^",
  "*",
  "/",
  "%",
  "+",
  "-",
  "<",
  ">",
] as const;

const UNARY_OPERATORS = new Set<UnaryOperator>(["!", "~", "+", "-"]);

const BINARY_PRECEDENCE: Record<BinaryOperator, number> = {
  "||": 1,
  "&&": 2,
  "|": 3,
  "^": 4,
  "&": 5,
  "==": 6,
  "!=": 6,
  "===": 6,
  "!==": 6,
  "<": 7,
  "<=": 7,
  ">": 7,
  ">=": 7,
  "<<": 8,
  ">>": 8,
  "+": 9,
  "-": 9,
  "*": 10,
  "/": 10,
  "//": 10,
  "%": 10,
  "**": 11,
};

const isBinaryOperator = (value: string): value is BinaryOperator => value in BINARY_PRECEDENCE;

class ExpressionParser {
  private readonly tokens: Token[];
  private readonly diagnostics: IniDiagnostic[] = [];
  private index = 0;

  constructor(
    private readonly source: string,
    private readonly baseOffset: number,
    private readonly baseLine: number,
    private readonly baseColumn: number
  ) {
    this.tokens = this.tokenize();
  }

  parse(): ExpressionParseResult {
    const expression = this.parseBinary(1);
    const trailing = this.peek();

    if (expression && trailing.kind !== "eof") {
      this.addDiagnostic(
        "3dmigoto-expression-unexpected-token",
        `Unexpected token "${trailing.text}"`,
        trailing.start,
        trailing.end
      );
    }

    return { expression, diagnostics: this.diagnostics };
  }

  private tokenize(): Token[] {
    const tokens: Token[] = [];
    let cursor = 0;

    while (cursor < this.source.length) {
      if (this.source[cursor] === " " || this.source[cursor] === "\t") {
        cursor += 1;
        continue;
      }

      const start = cursor;
      if (this.source[cursor] === "(") {
        tokens.push({ kind: "left-paren", text: "(", start, end: ++cursor });
        continue;
      }
      if (this.source[cursor] === ")") {
        tokens.push({ kind: "right-paren", text: ")", start, end: ++cursor });
        continue;
      }

      const operator = OPERATORS.find((candidate) => this.source.startsWith(candidate, cursor));
      if (operator) {
        cursor += operator.length;
        tokens.push({ kind: "operator", text: operator, start, end: cursor });
        continue;
      }

      const remainder = this.source.slice(cursor);
      const slotMatch = remainder.match(/^(?:[vhdgpc]s-(?:t|s|u|cb)\d+|(?:vb|so)\d+|ib|o[dD]|o\d+|this)\b/i);
      if (slotMatch) {
        cursor += slotMatch[0].length;
        tokens.push({ kind: "identifier", text: slotMatch[0], start, end: cursor });
        continue;
      }

      if (this.isExtendedReferenceStart(remainder)) {
        const end = this.scanExtendedReference(cursor);
        if (end > cursor) {
          tokens.push({
            kind: "identifier",
            text: this.source.slice(cursor, end),
            start,
            end,
          });
          cursor = end;
          continue;
        }
      }

      const numberMatch = remainder.match(/^(?:0x[0-9a-f]+|(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?)/i);
      if (numberMatch) {
        cursor += numberMatch[0].length;
        tokens.push({ kind: "number", text: numberMatch[0], start, end: cursor });
        continue;
      }

      const identifierMatch = remainder.match(/^[A-Za-z_\u0080-\uFFFF][A-Za-z0-9_$.\u0080-\uFFFF]*/);
      if (identifierMatch) {
        cursor += identifierMatch[0].length;
        tokens.push({ kind: "identifier", text: identifierMatch[0], start, end: cursor });
        continue;
      }

      this.addDiagnostic(
        "3dmigoto-expression-invalid-character",
        `Invalid expression character "${this.source[cursor]}"`,
        cursor,
        cursor + 1
      );
      cursor += 1;
    }

    tokens.push({
      kind: "eof",
      text: "",
      start: this.source.length,
      end: this.source.length,
    });
    return tokens;
  }

  private isExtendedReferenceStart(remainder: string): boolean {
    return /^(?:[$@#]|resource(?:\\|\.)|pool(?:\\|\.|\[)|\$pool\[)/i.test(remainder);
  }

  private scanExtendedReference(start: number): number {
    let cursor = start;
    const closing: string[] = [];

    while (cursor < this.source.length) {
      const character = this.source[cursor];

      if (closing.length > 0) {
        if (character === "(") closing.push(")");
        else if (character === "[") closing.push("]");
        else if (character === closing[closing.length - 1]) closing.pop();
        cursor += 1;
        continue;
      }

      if (character === "(") {
        closing.push(")");
        cursor += 1;
        continue;
      }
      if (character === "[") {
        closing.push("]");
        cursor += 1;
        continue;
      }
      if (character === "-" && this.source[cursor + 1] === ">") {
        cursor += 2;
        continue;
      }
      if (
        character === " " ||
        character === "\t" ||
        character === ")" ||
        character === "=" ||
        character === "!" ||
        character === "<" ||
        character === ">" ||
        character === "&" ||
        character === "|" ||
        character === "^" ||
        character === "*" ||
        character === "/" ||
        character === "%" ||
        character === "+" ||
        character === "-"
      ) {
        break;
      }
      cursor += 1;
    }

    if (closing.length > 0) {
      this.addDiagnostic(
        "3dmigoto-expression-unclosed-reference",
        "Unterminated bracket expression in resource reference",
        start,
        cursor
      );
    }

    return cursor;
  }

  private parseBinary(minimumPrecedence: number): ExpressionNode | undefined {
    let left = this.parsePrefix();
    if (!left) return undefined;

    while (true) {
      const token = this.peek();
      if (token.kind !== "operator" || !isBinaryOperator(token.text)) break;

      const precedence = BINARY_PRECEDENCE[token.text];
      if (precedence < minimumPrecedence) break;

      this.consume();
      const right = this.parseBinary(token.text === "**" ? precedence : precedence + 1);
      if (!right) {
        this.addDiagnostic(
          "3dmigoto-expression-missing-operand",
          `Operator "${token.text}" is missing its right operand`,
          token.start,
          token.end
        );
        return left;
      }

      const start = left.range.start.offset - this.baseOffset;
      const end = right.range.end.offset - this.baseOffset;
      left = {
        kind: "binary",
        operator: token.text,
        left,
        right,
        raw: this.source.slice(start, end),
        range: this.range(start, end),
      };
    }

    return left;
  }

  private parsePrefix(): ExpressionNode | undefined {
    const token = this.peek();
    if (token.kind === "operator" && UNARY_OPERATORS.has(token.text as UnaryOperator)) {
      this.consume();
      const operand = this.parseBinary(12);
      if (!operand) {
        this.addDiagnostic(
          "3dmigoto-expression-missing-operand",
          `Unary operator "${token.text}" is missing its operand`,
          token.start,
          token.end
        );
        return undefined;
      }
      const end = operand.range.end.offset - this.baseOffset;
      return {
        kind: "unary",
        operator: token.text as UnaryOperator,
        operand,
        raw: this.source.slice(token.start, end),
        range: this.range(token.start, end),
      };
    }

    return this.parsePrimary();
  }

  private parsePrimary(): ExpressionNode | undefined {
    const token = this.consume();

    if (token.kind === "number") {
      const value = /^0x/i.test(token.text) ? Number.parseInt(token.text.slice(2), 16) : Number(token.text);
      return {
        kind: "number",
        value,
        raw: token.text,
        range: this.range(token.start, token.end),
      };
    }

    if (token.kind === "identifier") {
      const normalized = token.text.toLowerCase();
      if (normalized === "true" || normalized === "false") {
        return {
          kind: "boolean",
          value: normalized === "true",
          raw: token.text,
          range: this.range(token.start, token.end),
        };
      }
      if (normalized === "null") {
        return {
          kind: "null",
          raw: token.text,
          range: this.range(token.start, token.end),
        };
      }
      if (normalized === "nan" || normalized === "inf" || normalized === "infinity") {
        return {
          kind: "number",
          value: normalized === "nan" ? Number.NaN : Number.POSITIVE_INFINITY,
          raw: token.text,
          range: this.range(token.start, token.end),
        };
      }
      return {
        kind: "reference",
        name: token.text,
        raw: token.text,
        range: this.range(token.start, token.end),
      };
    }

    if (token.kind === "left-paren") {
      const expression = this.parseBinary(1);
      const closing = this.peek();
      if (closing.kind !== "right-paren") {
        this.addDiagnostic(
          "3dmigoto-expression-unclosed-group",
          "Expression group is missing a closing parenthesis",
          token.start,
          expression ? expression.range.end.offset - this.baseOffset : token.end
        );
        return expression;
      }
      this.consume();
      if (!expression) return undefined;
      return {
        kind: "group",
        expression,
        raw: this.source.slice(token.start, closing.end),
        range: this.range(token.start, closing.end),
      };
    }

    if (token.kind !== "eof") {
      this.addDiagnostic(
        "3dmigoto-expression-unexpected-token",
        `Expected an expression but found "${token.text}"`,
        token.start,
        token.end
      );
    } else {
      this.addDiagnostic("3dmigoto-expression-empty", "Expected an expression", token.start, token.end);
    }
    return undefined;
  }

  private peek(): Token {
    return this.tokens[this.index] ?? this.tokens[this.tokens.length - 1];
  }

  private consume(): Token {
    const token = this.peek();
    this.index += 1;
    return token;
  }

  private position(relativeOffset: number): SourcePosition {
    return {
      offset: this.baseOffset + relativeOffset,
      line: this.baseLine,
      column: this.baseColumn + relativeOffset,
    };
  }

  private range(start: number, end: number): SourceRange {
    return { start: this.position(start), end: this.position(end) };
  }

  private addDiagnostic(code: string, message: string, start: number, end: number): void {
    this.diagnostics.push({
      code,
      message,
      severity: "error",
      range: this.range(start, end),
    });
  }
}

export const parseThreeDMigotoExpression = (
  source: string,
  options: ExpressionParseOptions = {}
): ExpressionParseResult => {
  const parser = new ExpressionParser(source, options.offset ?? 0, options.line ?? 1, options.column ?? 1);
  return parser.parse();
};
