# AGENTS.md

本文件定义本仓库的协作与自动化代理规则，适用于 AI 协作者以及直接在本仓库中工作的维护者。

人类贡献者还应遵守 `CONTRIBUTING.md`（如存在）。若子目录存在更具体的 `AGENTS.md`，则同时遵守对应子目录的补充规则；发生冲突时，以作用范围更具体的规则为准。

## 分支与合并

### 分支职责

- `dev` 是日常开发与集成分支。
- `master` 是正式发布分支，对应生产环境。
- 正常功能、修复、文档和配置更新均应先进入 `dev`。
- `master` 原则上只接受来自 `dev` 的发布 Pull Request。

正常开发流程：

```text
feature / fix / docs branch
          ↓
         dev
          ↓
       master
```

不得绕过 `dev` 将普通功能、修复或内容更新直接交付到 `master`。

### 有仓库写入权限的协作者

开始任务前应先确认：

```bash
git status
git branch --show-current
git fetch origin
```

并检查本地工作区和远端分支状态。

- 从最新 `origin/dev` 创建任务分支，并立即在本地和 `origin` 创建同名分支；任务分支的远端跟踪分支必须是 `origin/<同名任务分支>`，不得指向 `origin/dev`。

#### 创建任务分支与设置上游

- 有仓库写入权限的维护者创建任务分支时，必须让同名分支同时存在于本地和 `origin`，并在开始提交前完成远端跟踪配置。
- 应从最新的 `origin/dev` 创建本地任务分支，并立即推送同名分支到 `origin`：

  ```bash
  git fetch origin
  git switch --no-track --create features/<topic> origin/dev
  git push --set-upstream origin HEAD
  ```

  `git push --set-upstream origin HEAD` 会在 `origin` 创建当前分支的同名分支，并将上游设置为 `origin/features/<topic>`。创建完成后必须核验：

  ```bash
  git branch --show-current
  git rev-parse --abbrev-ref --symbolic-full-name @{upstream}
  ```

  两条命令应分别输出 `features/<topic>` 和 `origin/features/<topic>`。

- 任务分支（包括 `features/**`）不得跟踪 `origin/dev`。禁止使用或保留 `git branch -u origin/dev`、`git branch --track features/<topic> origin/dev` 等会建立错误上游关系的配置；若误配置，必须在继续提交前修正：

  ```bash
  git branch --unset-upstream
  git push --set-upstream origin HEAD
  ```

- 推荐使用能够表达用途的分支名，例如：

  - `feat/<topic>`
  - `fix/<topic>`
  - `docs/<topic>`
  - `chore/<topic>`

- 不要在 `dev` 或 `master` 上直接完成普通开发工作。
- 完成修改后，通过 Pull Request 合并到 `dev`。
- 发布时，通过 `dev -> master` Pull Request 进行。
- feature、fix、docs 等任务分支不得直接合并到 `master`。

#### 任务结束后的分支清理

- 任务分支的工作完成且 Pull Request 已合并（或经维护者确认不再继续）后，分支所有者必须删除该任务分支的本地分支，以及 `origin` 上的同名远端分支。除非维护者明确要求保留，不得长期保留已完成或废弃的任务分支。
- 删除前应确认没有尚未交付的提交；不得删除 `dev`、`master` 或其他协作者的分支。可按以下顺序清理自己的任务分支：

  ```bash
  git switch dev
  git branch -d features/<topic>
  git push origin --delete features/<topic>
  git fetch origin --prune
  ```

### 无仓库写入权限的贡献者

- 不要尝试直接向 `dev` 或 `master` 推送。
- Fork 本仓库后，在自己的 Fork 中创建任务分支。
- Pull Request 的目标分支应为本仓库的 `dev`，而不是 `master`。

### 历史与冲突

- 未经维护者明确授权，不得改写 `dev` 或 `master` 等共享分支历史。
- 不得对共享分支执行 force push。
- 不得擅自删除其他协作者的远端分支。
- 不得覆盖、删除或重置与当前任务无关的本地修改。
- 合并或 rebase 发生冲突时必须逐项审阅。
- 禁止通过简单选择 `ours`、`theirs` 或类似方式静默丢弃另一侧的有效修改。

如果因为紧急生产修复等特殊原因产生了只存在于 `master` 的修改，必须尽快通过 Pull Request 或等价方式同步回 `dev`，避免两个长期分支产生实际内容漂移。

## Pull Request 与评审

- 一个 Pull Request 应尽量只解决一个逻辑主题。
- 尚未准备好合并的工作可以创建 Draft Pull Request。
- PR 可以在本地检查或 CI 尚未通过时创建和更新，但不得在必要检查失败时合并。
- PR 描述应说明：

  - 修改目的；
  - 主要变更；
  - 验证方式；
  - 已知限制或未完成事项。

- 涉及 UI、地图、导航或明显视觉变化时，应尽可能提供截图或 Preview 环境供评审。
- 合并到 `dev` 前原则上至少需要一名非作者协作者完成评审。
- `dev -> master` 的发布 Pull Request 应由维护者评审后合并。
- 不得为了通过评审而隐藏失败的测试、构建错误或已知问题。

GitHub Branch Protection / Ruleset 与 CI 是最终合并门禁；本文件中的文字规则不能替代仓库侧的实际保护配置。

## 构建与格式验证

本项目使用 Pixi 管理开发环境和构建任务。

标准构建命令：

```bash
pixi run --locked build
```

该命令执行 `pixi.toml` 中定义的 `build` 任务。

涉及 TypeScript、JavaScript、Vue、JSON 或受格式化器管理的文件时，还应运行：

```bash
pixi run --locked fmt-check
```

### 验证要求

在 Pull Request 合并到 `dev` 前：

- 必须通过 `pixi run --locked build`；
- 涉及格式化器覆盖范围内的文件时必须通过 `pixi run --locked fmt-check`；
- GitHub Actions 中配置为 required 的检查必须全部成功。

不要求每个中间 commit 都完成完整构建。允许为了保存工作进度、协作或修复 CI 创建中间提交。

但不得在未验证的情况下声称：

- “构建通过”；
- “格式检查通过”；
- “测试通过”；
- “CI 正常”。

AI 必须以实际执行的命令、退出状态或 CI 结果为依据。

如果因为网络、依赖源、平台环境或其他外部因素无法完成验证，应在 PR 或交付说明中明确记录：

- 未完成的检查；
- 失败原因；
- 已实际完成的验证。

未经维护者明确判断，不得把无法验证的修改合并到 `dev` 或 `master`。

## 依赖、锁文件与生成物

修改依赖配置时保持声明文件和锁文件一致。

- 修改 `package.json` 后检查并提交对应的 `pnpm-lock.yaml`。
- 修改影响 Pixi 环境解析的 `pixi.toml` 后检查并提交对应的 `pixi.lock`。
- 不要手工伪造或编辑锁文件来绕过依赖解析问题。
- 构建、安装和检查优先使用仓库提供的 Pixi 任务。
- 验证时优先使用 `--locked`，防止锁文件发生未预期漂移。

除非任务明确要求，不要提交：

```text
node_modules/
.pixi/
docs/.vuepress/dist/
docs/.vuepress/.cache/
docs/.vuepress/.temp/
.vercel/
```

以及其他缓存、临时文件、本地 IDE 状态和构建生成物。

依赖升级必须说明升级原因、影响范围和验证结果。

发现依赖来源异常、锁文件异常变化、疑似供应链风险或未知安装脚本时，应停止交付并向维护者报告，不得自行忽略。

## 内容质量

本仓库是校园信息手册，事实准确性优先于内容数量。

涉及以下信息时，应优先引用学校、政府、运营机构或服务提供方的官方来源：

- 电话；
- 地址；
- 办事流程；
- 价格；
- 开放时间；
- 校历和时间表；
- 交通信息；
- 地图和设施位置；
- 官方系统入口；
- 政策和规章。

此类内容应尽可能记录适用范围和最近核验日期，日期推荐使用：

```text
YYYY-MM-DD
```

无法从权威来源确认的信息，应明确标注其不确定性，不得把推测包装成已核实事实。

## 文档与链接

站内链接应使用：

- 以 `./` 开头的当前目录相对路径；或
- 以 `/` 开头的站点绝对路径。

禁止使用 `../` 访问父级页面；需要引用父级或其他栏目时使用站点绝对路径。

修改页面路径、导航、侧边栏、公共组件或路由时，应同时检查受影响的内部链接。

## 前端与交互组件

修改公共组件、主题、导航、地图或其他交互功能时，应检查：

- 桌面端基本表现；
- 移动端基本表现；
- 深色模式；
- 页面链接和导航；
- Docusaurus 静态构建。

对于依赖 JavaScript 的地图、搜索或复杂交互，在合理可行的情况下提供基本的可读降级内容；不要求所有交互能力在禁用 JavaScript 后完整运行。

## 变更范围

保持修改最小、明确并且可回滚。

不要在功能修改中混入：

- 无关代码重构；
- 全仓库格式化；
- 大规模文件移动；
- 无关重命名；
- 与任务无关的依赖升级。

如果确实需要进行大范围重构，应单独建立 Pull Request。

提交信息应简洁描述实际结果，一个提交尽量只包含一个逻辑主题。

## 推荐工作流程

1. 检查工作区、当前分支和远端状态。
2. 获取最新 `origin/dev`。
3. 从 `origin/dev` 创建独立任务分支，并在本地和 `origin` 同步创建同名分支；确认上游为 `origin/<任务分支>`，而不是 `origin/dev`。
4. 完成尽量小且聚焦的修改。
5. 根据修改范围运行格式检查和构建。
6. 提交并推送到当前任务分支对应的同名远端分支。
7. 创建或更新目标为 `dev` 的 Pull Request。
8. 处理 CI 和 Review 意见。
9. Required Checks 和评审通过后合并到 `dev`。
10. 在 `dev` Preview 中完成集成验证。
11. 发布时由维护者创建 `dev -> master` Pull Request。
12. `master` 发布完成后确认生产部署状态。
