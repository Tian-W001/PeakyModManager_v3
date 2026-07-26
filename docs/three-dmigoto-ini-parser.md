# 3DMigoto / ZZMI INI 解析器设计

调研快照：2026-07-23。

## 结论

3DMigoto 的配置文件不能安全地当成普通 INI 读取。它在 INI 外壳中叠加了有序命令、重复键、控制流、表达式、
资源引用和阶段前缀。适合 Mod Manager 的模型应分成两层：

1. **无损语法树（CST）**：逐行保留 BOM、换行符、缩进、大小写、注释、重复键和未知语法，确保读写不破坏 Mod。
2. **派生语义树（AST）**：按 section 类型解释命令列表、条件表达式、资源复制语义和诊断。

当前原型实现了这两层的只读解析与原样打印，未知构造会保留并尽可能给出诊断。

## 从实现源码确认的词法规则

- 只有去除行首空白后以 `;` 开头的行才是注释；行内 `;` 属于值。
- 属性在第一个 `=` 处分隔，键和值两端的空格和 Tab 被忽略。
- section 名称从 `[` 读到第一个 `]`，名称及键的语义匹配不区分大小写。
- 第一个 section 前是 preamble，只接受 `namespace` 和 `condition`。
- 命令列表中的顺序与重复键有意义；普通 section 的重复属性通常应告警。
- `[Key...]` 的 `key`、`back` 和 `[Include...]` 的重复项是已知例外。

## Section 分类

命令列表包括以下前缀：

```text
TextureOverride*
CommandList*
ShaderOverride*
CustomShader*
ShaderRegex*
BuiltInCommandList*
BuiltInCustomShader*
```

还包括精确名称 `Constants`、`Present`、`ClearRenderTargetView`、`ClearDepthStencilView`、
`ClearUnorderedAccessViewUint`、`ClearUnorderedAccessViewFloat`。`ShaderRegex` 的
`.Pattern`、`.InsertDeclarations`、`.Replace` 子节是原始文本子语言，不应按命令列表解析。

普通家族至少包括 `Pool*`、`Resource*`、`Key*`、`Include*` 和 `Preset*`。未知家族需要保留，以兼容
未来的 XXMI 扩展。

## 命令列表语法

以下 EBNF 描述当前解析器覆盖的结构：

```ebnf
command-list = { trivia | property | if-statement | unknown-line } ;
if-statement = "if" expression, command-list,
               { ("elif" | "else if") expression, command-list },
               [ "else", command-list ],
               "endif" ;
property     = [ ("pre" | "post"), whitespace ], key, "=", value ;
trivia       = blank-line | comment-line ;
```

属性仍按有序列表存储，不能降成 `Record<string, string>`。`pre` 和 `post` 是执行阶段，不是键名的一部分。

## 表达式

XXMI 当前支持：

```text
一元：! ~ + -
幂：**
乘法：* / // %
加法：+ -
移位：<< >>
比较：< <= > >=
相等/同一性：== != === !==
位运算：& ^ |
逻辑：&& ||
```

优先级从上到下递减；`**` 右结合，其他二元运算符左结合。操作数除数值、布尔值、`null` 外，还可能是
全局/局部变量、纹理槽、资源、命名空间资源以及 Pool 成员。因此解析器将未知但合法形态的操作数建模为
`reference`，符号解析应在单独的项目级分析阶段完成。

## 最新 SlotFix 对设计的约束

2026-07-13 至 2026-07-15 的 ZZMI SlotFix 更新包含下列需要保真的形态：

```ini
[Pool.t]
pool_size = 19

[CommandListExample]
if $is_disable_glow === -1 && Resource\ZZMI\GlowMap !== null
  Pool.t[0] = ref ps-t0
  ps-t0 = ref Pool.t[0]
  ps-t8 = ref Resource\ZZMI\GlowMap unless_null
  Pool.t[0] = null
endif
```

由此得到几个直接要求：

- 必须识别 `Pool.t[n]` 作为资源目标/引用，不能把方括号误判成 section。
- 必须区分 `==`/`!=` 与资源同一性比较 `===`/`!==`。
- 必须保留 `ref`/`reference`、`copy` 和尾部 `unless_null`。
- 必须支持深层布尔条件与资源、`null` 的比较。
- SlotFix 的 `Matches.ini` 使用尺寸、格式、数组、mip、绑定标志和 `filter_index` 等匹配字段；这些属于
  普通 section 属性，而非表达式。

## TypeScript API

```ts
import { parseThreeDMigotoExpression, parseThreeDMigotoIni, printThreeDMigotoIni } from "@shared/threeDMigoto";

const document = parseThreeDMigotoIni(source);
const unchanged = printThreeDMigotoIni(document);
const condition = parseThreeDMigotoExpression("$active && ps-t8 !== null");
```

面向 Mod Manager 的高级索引：

```ts
import { threeDMigotoParser } from "@shared/threeDMigoto";

// parse 接收文件内容；文件读取仍由 Electron main process 负责。
const modContext = threeDMigotoParser.parse(source);

console.log(modContext.toggleKeys.hair.type); // "cycle"
console.log(modContext.toggleKeys.face.key); // "VK_F2"
console.log(modContext.toggleKeys.shoes.variables[0].target); // "$shoes"

const body = modContext.textureOverrides.TextureOverrideSunnaBodyA;
console.log(body.hash);
console.log(body.resources[0].target, body.resources[0].source);

const hairState = modContext.getPersistentVariable("hair");
console.log(hairState?.rawValue); // global persist $hair 的默认值
```

查询层的命名规则：

- `keyBindings` 包含全部 `[Key*]` section，索引名为去掉 `Key` 前缀后的 lower-camel 名称。
- `toggleKeys` 是便捷子集：包含显式 `type = toggle/cycle`，或至少有一个多值 assignment 的 key binding。
- `variables` 只包含目标以 `$` 开头的 assignment；`assignments` 还包括 `run`、`x`、`convergence` 等目标。
- `textureOverrides` 使用完整 section 名作为索引。
- `resources`/`resourceBindings` 是同一个有序资源绑定列表，每项保留 `pre/post`、`ref/copy`、
  `unless_null` 和外层条件分支。
- `getKeyBinding()` 与 `getTextureOverride()` 提供不区分大小写的查询。
- 原始节点分别保存在 `.section`、`.line` 和 `modContext.document`，需要安全编辑时不必重新定位文本。
- `persistentVariables` 索引 `global persist` 声明，并区分 Mod 默认值与 `d3dx_user.ini` 中的运行时持久值。

无损编辑器按节点范围生成最小文本修改：

```ts
import { replaceThreeDMigotoPropertyValue, replaceThreeDMigotoSectionPropertyValues } from "@shared/threeDMigoto";

const changedState = replaceThreeDMigotoPropertyValue(document, variable.line, "-1");
const changedKeys = replaceThreeDMigotoSectionPropertyValues(document, keySection, "key", ["H", "VK_F2"]);
```

属性值编辑保留键名、缩进、`=` 周围空白、行尾空白和原换行符。重复属性编辑支持增加、减少和删除
`key`/`back` 行，调用方应在写盘前重新解析结果。

重要的数据不变量：

- `printThreeDMigotoIni(parseThreeDMigotoIni(source)) === source`
- `document.lines` 始终是源文件顺序
- `section.body` 和 `commandList.statements` 始终保序
- 诊断带绝对 offset、行、列，但错误不阻止其余文件解析
- `normalizedName`/`normalizedKey` 仅用于查找，原始拼写仍在节点中

## 下一阶段

这个原型故意没有假装实现完整的 3DMigoto 运行时。用于安全编辑前，还需要：

1. 解析 `[Include]` 并构建跨文件、命名空间感知的符号图。
2. 从 XXMI 的命令注册表扩展各 key/value 的专用语义与类型检查。
3. 增加节点级修改器和局部打印器，保持未编辑区域的字节级稳定。
4. 为 `ShaderRegex.*` 建立独立的原始块/正则子语言节点。
5. 以真实 ZZMI 包建立固定语料与版本差异测试，避免 SlotFix 升级造成回归。

## 一手资料

- ZZMI 当前入口配置：<https://github.com/leotorrez/ZZMI-Package/blob/main/ZZMI/d3dx.ini>
- ZZMI SlotFix：<https://github.com/leotorrez/ZZMI-Package/tree/main/ZZMI/Core/ZZMI/Libraries/SlotFix>
- XXMI INI 读取实现：<https://github.com/SpectrumQT/XXMI-Libs-Package/blob/master/DirectX11/IniHandler.cpp>
- XXMI 命令与表达式实现：<https://github.com/SpectrumQT/XXMI-Libs-Package/blob/master/DirectX11/CommandList.cpp>
- 3DMigoto Resource Copying：<https://github.com/bo3b/3Dmigoto/wiki/Resource-Copying>
