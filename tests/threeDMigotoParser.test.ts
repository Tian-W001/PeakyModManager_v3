import { describe, expect, it } from "vitest";
import {
  BinaryOperator,
  CommandStatement,
  ExpressionNode,
  parseThreeDMigotoExpression,
  parseThreeDMigotoIni,
  printThreeDMigotoIni,
  replaceThreeDMigotoPropertyValue,
  replaceThreeDMigotoSectionPropertyValues,
  threeDMigotoParser,
} from "../src/shared/threeDMigoto";

const collectBinaryOperators = (expression: ExpressionNode | undefined): BinaryOperator[] => {
  if (!expression) return [];
  if (expression.kind === "binary") {
    return [
      expression.operator,
      ...collectBinaryOperators(expression.left),
      ...collectBinaryOperators(expression.right),
    ];
  }
  if (expression.kind === "unary") return collectBinaryOperators(expression.operand);
  if (expression.kind === "group") return collectBinaryOperators(expression.expression);
  return [];
};

const commandStatements = (statements: CommandStatement[]): Extract<CommandStatement, { kind: "command" }>[] =>
  statements.flatMap((statement) => {
    if (statement.kind === "command") return [statement];
    if (statement.kind === "if") {
      return statement.branches.flatMap((branch) => commandStatements(branch.statements));
    }
    return [];
  });

describe("3DMigoto parser", () => {
  it("round-trips a SlotFix-shaped file and builds command semantics", () => {
    const source =
      "\uFEFFnamespace = ZZMI\r\n" +
      "\r\n" +
      "[Pool.t]\r\n" +
      "pool_size = 19\r\n" +
      "\r\n" +
      "[CommandListSlotFixProbe]\r\n" +
      "if $is_disable_glow === -1 && " +
      "(Resource\\ZZMI\\GlowMap === null || @Resource\\ZZMI\\GlowMap !== @Resource\\ZZMI\\Empty)\r\n" +
      "  Pool.t[0] = ref ps-t0\r\n" +
      "  ps-t8 = ref Resource\\ZZMI\\GlowMap unless_null\r\n" +
      "elif DRAW_TYPE == 4\r\n" +
      "  post run = CommandList.After\r\n" +
      "else if #Pool.t > 0\r\n" +
      "  Pool.t[0] = null\r\n" +
      "else\r\n" +
      "  handling = skip;not-comment\r\n" +
      "endif\r\n";

    const document = parseThreeDMigotoIni(source);
    const pool = document.sections.find((section) => section.name === "Pool.t");
    const commandList = document.sections.find((section) => section.name === "CommandListSlotFixProbe")?.commandList;

    expect(document.namespace).toBe("ZZMI");
    expect(document.bom).toBe(true);
    expect(document.dominantEol).toBe("\r\n");
    expect(pool?.family).toBe("pool");
    expect(printThreeDMigotoIni(document)).toBe(source);
    expect(document.diagnostics).toEqual([]);
    expect(commandList?.statements[0].kind).toBe("if");

    const conditional = commandList?.statements[0];
    if (!conditional || conditional.kind !== "if") throw new Error("Expected an if statement");

    expect(conditional.branches.map((branch) => branch.keyword)).toEqual(["if", "elif", "else if", "else"]);
    expect(collectBinaryOperators(conditional.branches[0].condition)).toEqual(
      expect.arrayContaining(["&&", "===", "||", "!=="])
    );

    const commands = commandStatements(commandList.statements);
    expect(commands.find((command) => command.key === "ps-t8")?.resourceValue).toMatchObject({
      mode: "reference",
      source: "Resource\\ZZMI\\GlowMap",
      unlessNull: true,
    });
    expect(commands.find((command) => command.key === "run")?.phase).toBe("post");
    expect(commands.find((command) => command.key === "Pool.t[0]")?.resourceValue).toMatchObject({
      mode: "reference",
      source: "ps-t0",
    });
    expect(commands.find((command) => command.line.value === "skip;not-comment")?.line.value).toBe("skip;not-comment");
  });

  it("uses the operator precedence and right-associative exponentiation from XXMI", () => {
    const result = parseThreeDMigotoExpression("!$enabled || 4 ** -2 + 8 // 3 << 1 === 6 && ps-t8 != null");

    expect(result.diagnostics).toEqual([]);
    expect(result.expression?.kind).toBe("binary");
    if (!result.expression || result.expression.kind !== "binary") {
      throw new Error("Expected a binary expression");
    }

    expect(result.expression.operator).toBe("||");
    expect(collectBinaryOperators(result.expression)).toEqual(
      expect.arrayContaining(["||", "**", "+", "//", "<<", "===", "&&", "!="])
    );

    const exponent = parseThreeDMigotoExpression("2 ** 3 ** 2").expression;
    expect(exponent?.kind).toBe("binary");
    if (!exponent || exponent.kind !== "binary") throw new Error("Expected exponentiation");
    expect(exponent.right.kind).toBe("binary");
    expect(exponent.right.kind === "binary" ? exponent.right.operator : undefined).toBe("**");
  });

  it("preserves duplicate command keys and applies regular-section duplicate rules", () => {
    const source =
      "; leading comment\n" +
      "[CommandListRepeated]\n" +
      "run = CommandList.One\n" +
      "run = CommandList.Two\n" +
      "handling = skip;inline-semicolon\n" +
      "[ResourceBuffer]\n" +
      "type = Buffer\n" +
      "type = StructuredBuffer\n" +
      "[KeyCycle]\n" +
      "key = VK_F1\n" +
      "key = VK_F2\n";

    const document = parseThreeDMigotoIni(source);
    const repeated = document.sections[0].commandList;
    const commandLines = repeated?.statements.filter((statement) => statement.kind === "command");

    expect(commandLines).toHaveLength(3);
    expect(commandLines?.[2].kind === "command" ? commandLines[2].line.value : undefined).toBe("skip;inline-semicolon");
    expect(document.diagnostics.filter((diagnostic) => diagnostic.code === "3dmigoto-property-duplicate")).toHaveLength(
      1
    );
  });

  it("reports malformed flow and expression input without throwing", () => {
    const source = "[\n[CommandListBroken]\nelse\nif $x ==\nrun = CommandListX\n";
    const document = parseThreeDMigotoIni(source);
    const codes = document.diagnostics.map((diagnostic) => diagnostic.code);

    expect(codes).toEqual(
      expect.arrayContaining([
        "3dmigoto-section-unclosed",
        "3dmigoto-section-empty",
        "3dmigoto-command-orphan-flow",
        "3dmigoto-expression-missing-operand",
        "3dmigoto-command-missing-endif",
      ])
    );
    expect(printThreeDMigotoIni(document)).toBe(source);
  });

  it("builds ergonomic key binding and texture override indexes", () => {
    const source =
      "namespace = Sunna\n" +
      "\n" +
      "[Constants]\n" +
      "global persist $hair = 0\n" +
      "global persist $face = 1\n" +
      "\n" +
      "[KeyHair]\n" +
      "key = H\n" +
      "back = SHIFT H\n" +
      "type = cycle\n" +
      "condition = $face !== 0\n" +
      "$hair = 0, 1, 2\n" +
      "\n" +
      "[KeyFace]\n" +
      "key = VK_F2\n" +
      "type = toggle\n" +
      "$face = 0\n" +
      "\n" +
      "[KeyShoes]\n" +
      "key = S\n" +
      "$shoes = 0, 1\n" +
      "\n" +
      "[KeyReload]\n" +
      "key = VK_F10\n" +
      "run = CommandListReload\n" +
      "\n" +
      "[TextureOverrideSunnaBodyA]\n" +
      "hash = deadbeef\n" +
      "match_first_index = 0\n" +
      "if $hair == 1\n" +
      "  ps-t0 = ResourceSunnaBodyADiffuse\n" +
      "  post vb0 = ref ResourceSunnaBodyPosition unless_null\n" +
      "endif\n";

    const modContext = threeDMigotoParser.parse(source);
    const hair = modContext.toggleKeys.hair;
    const face = modContext.toggleKeys.face;
    const shoes = modContext.toggleKeys.shoes;
    const textureOverride = modContext.textureOverrides.TextureOverrideSunnaBodyA;

    expect(hair.type).toBe("cycle");
    expect(hair.key).toBe("H");
    expect(hair.keys).toEqual(["H"]);
    expect(hair.backKey).toBe("SHIFT H");
    expect(hair.variables[0]).toMatchObject({
      target: "$hair",
      values: ["0", "1", "2"],
    });
    expect(hair.condition?.kind).toBe("binary");
    expect(face.key).toBe("VK_F2");
    expect(shoes.variables[0].target).toBe("$shoes");
    expect(modContext.toggleKeys.reload).toBeUndefined();
    expect(modContext.keyBindings.reload.assignments[0].target).toBe("run");
    expect(modContext.getKeyBinding("KEYHAIR")).toBe(hair);

    expect(textureOverride.hash).toBe("deadbeef");
    expect(textureOverride.properties.match_first_index).toEqual(["0"]);
    expect(textureOverride.resources).toHaveLength(2);
    expect(textureOverride.resources[0]).toMatchObject({
      target: "ps-t0",
      source: "ResourceSunnaBodyADiffuse",
      mode: "auto",
    });
    expect(textureOverride.resources[1]).toMatchObject({
      target: "vb0",
      source: "ResourceSunnaBodyPosition",
      mode: "reference",
      unlessNull: true,
      phase: "post",
    });
    expect(textureOverride.resources[0].guards[0].condition?.kind).toBe("binary");
    expect(modContext.getTextureOverride("textureoverridesunnabodya")).toBe(textureOverride);
  });

  it("indexes persistent variables and edits values and repeated key properties losslessly", () => {
    const source =
      "\uFEFF[Constants]\r\n" +
      "  Global Persist $Hair  =  1.0  \r\n" +
      "\r\n" +
      "[KeyHair]\r\n" +
      "  key  = H  \r\n" +
      "  key = J\r\n" +
      "  back = K\r\n" +
      "; keep this comment\r\n" +
      "$Hair = 0, 1\r\n";
    const context = threeDMigotoParser.parse(source);
    const variable = context.getPersistentVariable("hair");

    expect(variable).toMatchObject({
      id: "Hair",
      name: "$Hair",
      rawValue: "1.0",
    });
    expect(context.persistentVariables.Hair).toBe(variable);

    const stateChanged = replaceThreeDMigotoPropertyValue(context.document, variable!.line, "-1.5");
    expect(stateChanged).toContain("  Global Persist $Hair  =  -1.5  \r\n");

    const stateContext = threeDMigotoParser.parse(stateChanged);
    const keySection = stateContext.document.sections.find((section) => section.name === "KeyHair")!;
    const keysChanged = replaceThreeDMigotoSectionPropertyValues(stateContext.document, keySection, "key", [
      "VK_F1",
      "VK_F2",
      "VK_F3",
    ]);
    const keysContext = threeDMigotoParser.parse(keysChanged);
    const updatedSection = keysContext.document.sections.find((section) => section.name === "KeyHair")!;
    const backRemoved = replaceThreeDMigotoSectionPropertyValues(keysContext.document, updatedSection, "back", []);
    const updated = threeDMigotoParser.parse(backRemoved);

    expect(updated.getKeyBinding("hair")?.keys).toEqual(["VK_F1", "VK_F2", "VK_F3"]);
    expect(updated.getKeyBinding("hair")?.backKeys).toEqual([]);
    expect(backRemoved).toContain("; keep this comment\r\n");
    expect(backRemoved).toContain("  key  = VK_F3  \r\n");
    expect(updated.diagnostics).toEqual([]);
  });
});
