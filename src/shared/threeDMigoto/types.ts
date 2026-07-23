export interface SourcePosition {
  offset: number;
  line: number;
  column: number;
}

export interface SourceRange {
  start: SourcePosition;
  end: SourcePosition;
}

export type DiagnosticSeverity = "error" | "warning";

export interface IniDiagnostic {
  code: string;
  message: string;
  severity: DiagnosticSeverity;
  range: SourceRange;
}

interface BaseLineNode {
  id: number;
  line: number;
  raw: string;
  eol: string;
  range: SourceRange;
}

export interface BlankLineNode extends BaseLineNode {
  kind: "blank";
}

export interface CommentLineNode extends BaseLineNode {
  kind: "comment";
  indent: string;
  text: string;
}

export interface SectionHeaderLineNode extends BaseLineNode {
  kind: "section-header";
  name: string;
  normalizedName: string;
  closed: boolean;
}

export interface PropertyLineNode extends BaseLineNode {
  kind: "property";
  indent: string;
  key: string;
  normalizedKey: string;
  value: string;
  delimiterOffset: number;
}

export interface BareLineNode extends BaseLineNode {
  kind: "bare";
  text: string;
}

export type IniLineNode = BlankLineNode | CommentLineNode | SectionHeaderLineNode | PropertyLineNode | BareLineNode;

export type SectionFamily = "command-list" | "pool" | "resource" | "key" | "include" | "preset" | "regular" | "unknown";

export interface IniSectionNode {
  kind: "section";
  name: string;
  normalizedName: string;
  family: SectionFamily;
  header: SectionHeaderLineNode;
  body: IniLineNode[];
  commandList?: CommandListAst;
  range: SourceRange;
}

export interface IniDocument {
  kind: "document";
  source: string;
  bom: boolean;
  dominantEol: "\r\n" | "\n" | "\r" | "";
  lines: IniLineNode[];
  preamble: IniLineNode[];
  namespace?: string;
  sections: IniSectionNode[];
  diagnostics: IniDiagnostic[];
}

export type UnaryOperator = "!" | "~" | "+" | "-";

export type BinaryOperator =
  | "**"
  | "*"
  | "/"
  | "//"
  | "%"
  | "+"
  | "-"
  | "<<"
  | ">>"
  | "<"
  | "<="
  | ">"
  | ">="
  | "=="
  | "!="
  | "==="
  | "!=="
  | "&"
  | "^"
  | "|"
  | "&&"
  | "||";

interface BaseExpressionNode {
  range: SourceRange;
  raw: string;
}

export interface NumberExpressionNode extends BaseExpressionNode {
  kind: "number";
  value: number;
}

export interface BooleanExpressionNode extends BaseExpressionNode {
  kind: "boolean";
  value: boolean;
}

export interface NullExpressionNode extends BaseExpressionNode {
  kind: "null";
}

export interface ReferenceExpressionNode extends BaseExpressionNode {
  kind: "reference";
  name: string;
}

export interface UnaryExpressionNode extends BaseExpressionNode {
  kind: "unary";
  operator: UnaryOperator;
  operand: ExpressionNode;
}

export interface BinaryExpressionNode extends BaseExpressionNode {
  kind: "binary";
  operator: BinaryOperator;
  left: ExpressionNode;
  right: ExpressionNode;
}

export interface GroupExpressionNode extends BaseExpressionNode {
  kind: "group";
  expression: ExpressionNode;
}

export type ExpressionNode =
  | NumberExpressionNode
  | BooleanExpressionNode
  | NullExpressionNode
  | ReferenceExpressionNode
  | UnaryExpressionNode
  | BinaryExpressionNode
  | GroupExpressionNode;

export interface ExpressionParseResult {
  expression?: ExpressionNode;
  diagnostics: IniDiagnostic[];
}

export interface ResourceValue {
  kind: "resource-value";
  mode: "auto" | "copy" | "reference";
  source: string;
  unlessNull: boolean;
  raw: string;
}

export interface CommandTriviaStatement {
  kind: "trivia";
  line: BlankLineNode | CommentLineNode;
}

export interface CommandPropertyStatement {
  kind: "command";
  line: PropertyLineNode;
  phase?: "pre" | "post";
  key: string;
  normalizedKey: string;
  expression?: ExpressionNode;
  resourceValue?: ResourceValue;
}

export interface CommandUnknownStatement {
  kind: "unknown";
  line: BareLineNode;
}

export interface CommandIfBranch {
  keyword: "if" | "elif" | "else if" | "else";
  line: BareLineNode;
  condition?: ExpressionNode;
  statements: CommandStatement[];
}

export interface CommandIfStatement {
  kind: "if";
  branches: CommandIfBranch[];
  endLine?: BareLineNode;
  range: SourceRange;
}

export type CommandStatement =
  | CommandTriviaStatement
  | CommandPropertyStatement
  | CommandUnknownStatement
  | CommandIfStatement;

export interface CommandListAst {
  kind: "command-list";
  sectionName: string;
  statements: CommandStatement[];
  diagnostics: IniDiagnostic[];
  range: SourceRange;
}
