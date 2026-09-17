# PeakyModManager v3

[English](README.md) | [简体中文](README.zh-CN.md)

一款轻量级的《**绝区零**》Mod 管理器。

## 功能

- **Mod 管理**
  轻松导入、启用和禁用 Mod。
- **预设**
  保存多套 Mod 配置，并在不同配置之间快速切换。
- **可视化界面**
  简洁的《**绝区零**》风格界面。
- **备份与恢复**
  备份和恢复预设配置。
- **3DMigoto Toggle 编辑**
  直接查看和编辑受支持的 Mod INI 文件中的持久化开关状态与按键绑定。

## 快速开始

### 初始设置

使用 PeakyModManager 前，需要配置以下路径：

1. 点击底部栏的**设置**按钮。
2. **模组库路径（Library Path）**
   选择用于存放 Mod 的文件夹，作为 Mod 的源目录。
3. **目标路径（Target Path）**
   选择游戏加载 Mod 的文件夹。
   - **ZZMI 用户**应选择 `ZZMI/ZZMI/Mods`。
4. **d3dx_user.ini 路径**（可选）
   如果需要使用**同步 Toggle（Sync Toggles）**，请选择 ZZMI 的 `d3dx_user.ini` 文件。
   编辑 Mod 自身的 Toggle 状态或按键绑定不需要配置此路径。

---

### 导入 Mod

- **拖放导入**

  将 Mod 文件夹直接拖入应用窗口，即可导入模组库。
  新导入的 Mod 默认显示在**未知（Unknown）**分类中。

- **使用 [PMM-Mod-Importer](https://github.com/Tian-W001/PMM_Mod_Importer)**

  使用此 Chrome 扩展导入 Mod，扩展会打开应用并开始下载 Mod。

- **手动导入须知**

  如果通过文件管理器直接向模组库添加 Mod 文件夹：
  - 点击**刷新**以识别新增的 Mod。
  - 这些 Mod 默认也会归入**未知（Unknown）**分类。

---

### 启用与禁用 Mod

1. 点击 Mod 卡片切换状态：
   - **黄色实线边框** → Mod **已启用**
   - **黑色实线边框** → Mod **已禁用**
   - **黄色虚线边框** → Mod **待启用**
   - **红色虚线边框** → Mod **待禁用**
2. 底部栏的**应用**按钮会显示待处理的变更数量。
3. 点击**应用**提交变更。
   此操作会在目标路径中创建或移除**符号链接**。

---

### 编辑 Mod

1. **右键点击** Mod 卡片，打开编辑窗口。
2. 可以编辑以下信息：
   - 描述
   - Mod 类型
   - 角色（仅角色类型的 Mod）
   - 来源链接
3. **删除**
   会从磁盘中删除 **Mod 的实际文件**。
4. **自动填充**会执行以下操作：
   - 自动设置预览图：
     - 优先使用名为 `Preview` 的图片。
     - 若未找到，则使用其他可用图片。
   - 自动设置描述：
     - 如果存在名为 `readme` 的文件，则读取其内容。
   - 尝试根据 Mod 标题匹配角色名称：
     - 将 Mod 类型设为**角色（Character）**。
     - 设置为匹配到的角色。
5. 点击**保存**应用修改。

---

### 编辑 3DMigoto Toggle

当 Mod 包含 `global persist` 常量时，编辑窗口中会显示 **Toggles** 一栏：

- 左列显示持久化常量，例如 `$hair`。
- 点击当前按键绑定，再按下新的按键组合即可替换。按 `Esc` 可取消按键录入。
- 在右列编辑数值状态。状态和按键绑定的修改会立即保存到 Mod 的 INI 文件。
- 如果清空状态值，会恢复为之前保存的值；非数值内容不会写入文件。

这些编辑只会修改 Mod 内部的文件，不会修改 `d3dx_user.ini`。

**同步 Toggle（Sync Toggles）**是独立的单向操作：它读取已配置的 `d3dx_user.ini` 中记录的运行时持久化值，
并将匹配的值写回 Mod 的 INI 文件。如果某个常量不存在于 `d3dx_user.ini` 中，同步时不会修改该常量。

---

## 使用预设

1. 预设可以保存不同的 Mod 组合，方便随时切换。
2. 使用**右下角**的按钮切换当前预设。
3. ⚠️ **注意**
   加载预设只会将变更加入**待应用**列表。
   必须点击底部栏的**应用**按钮，变更才会实际生效。
4. 管理预设：
   - 点击 **+** 按钮打开预设管理。
   - 将鼠标悬停在预设卡片上，可显示**删除**按钮。

---

## 备份与恢复

在**设置**中使用：

- **备份**
  - 将预设配置保存到模组库文件夹中的 `Presets_Backup.json`。
  - ⚠️ 此操作会**覆盖**已有的备份文件。

- **恢复**
  - 从 `Presets_Backup.json` 加载数据。
  - ⚠️ 此操作会**覆盖**当前的预设配置。
  - 恢复后，需要将待应用列表中的变更**重新应用到当前预设**，才能使变更生效。

## 自动更新

- 启动应用后稍等片刻。当新版本下载完成时，系统会弹出通知，提示更新将在退出应用后安装。

## 3DMigoto / ZZMI INI 工具

项目中的共享 TypeScript 解析器会保留 INI 文件的原始布局，同时提供对持久化常量、按键绑定、纹理覆盖、
命令列表、表达式以及当前 ZZMI SlotFix 语法的语义查询。

通过命令行检查一个或多个 INI 文件：

```bash
npx tsx scripts/inspectThreeDMigoto.ts <file.ini> [more.ini...]
npx tsx scripts/inspectThreeDMigoto.ts --json <file.ini>
```

支持的语法、TypeScript API 和当前限制，请参阅 [3DMigoto / ZZMI INI 解析器设计文档（英文）](docs/three-dmigoto-ini-parser.md)。

## 界面预览

![主界面](images/README/screenshot_main.png)
![应用变更](images/README/screenshot_apply.png)
![Mod 详情](images/README/screenshot_detailmodal.png)
![预设管理](images/README/screenshot_presetsmodal.png)
![设置](images/README/screenshot_settings.png)
