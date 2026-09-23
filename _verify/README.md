# _verify — 双脚本共存验证台

用真实 Chrome（走本机已装的 `channel='chrome'`，不下载 playwright 内核）在**仿真帖子页**里
同时加载两份脚本的真身，实测它们是否互相干扰。

## 跑法

```bash
D:\python\python.exe _verify\test.py          # 装了液态玻璃脚本（37 项断言）
D:\python\python.exe _verify\test_noglass.py  # 没装（17 项断言，验证零副作用）
```

脚本会自己起一个本地静态服务器（127.0.0.1:8899），跑完自动关掉。

## 文件

| 文件 | 作用 |
|---|---|
| `server.py` | 静态服务器。`/topic/<id>` → 仿真页；`/noglass/topic/<id>` → 不带玻璃脚本的仿真页；`/water.user.js` 直接读仓库根目录那份真身 |
| `harness.html` | 仿真帖子页：先跑玻璃脚本真身，再跑水贴专用真身。**不注入任何 GM_* 桩**——两个脚本都自带 localStorage 兜底，顺便也验证了那条兜底路径 |
| `harness_noglass.html` | 同上但不加载玻璃脚本，用于零副作用回归 |
| `glass.user.js` | 按版本钉住的液态玻璃脚本（v1.7.5，MIT，作者 Antigravity / Evander-8） |
| `test.py` | 主测试。含**反证**：把悬浮标挪回旧的 right/bottom:24px，用 `elementFromPoint` 证明确实会压住玻璃脚本的设置齿轮 |
| `test_noglass.py` | 无玻璃脚本回归 |

## 测量纪律（踩过的坑）

悬浮标 hover 上挂着 `transform: translateY(-2px) scale(1.04)`，而 `getBoundingClientRect()`
**包含 transform**。所以：

- 要断言坐标时，先 `page.mouse.move(5, 400)` 把鼠标挪开、等过渡结束再量（`settle()`）；
  否则会量到过渡中间的中间值，坐标断言莫名差 1~3px。
- 或者直接读内联 `left/top` + `offsetWidth/offsetHeight`——这两个不受 transform 影响，是真值。
- 断言"贴边间隙"这类量时也一样，别在 hover 态量。

## 覆盖的断言

- 双脚本都活着、`html.lsb-ready` 生效、`--lsb-*` 令牌可用
- 悬浮标玻璃皮肤（backdrop-filter / 胶囊圆角 / `--text` 跟随）
- 右下角不与玻璃设置齿轮重叠 + 反证原 bug + 齿轮可点
- `html.lsb-scrolling`（极速滚动保护层）期间悬浮标仍可命中
- 玻璃脚本全站按钮统一规范下，本脚本的语义配色是否保住
  （模式选中态 / 主按钮 / 「水它」底色 / 目标评论高亮）
- 站点切深色后悬浮标的底色与文字对比度
- 拖拽：跟手（无 transition 迟滞）、位移准确、不误触发点击、位置持久化
- 单击开关面板、面板跟随悬浮标且不压住它、面板在视口内
- 刷新后位置记住、右键复位、视口变小后钳回视口
- 无玻璃脚本时：外观与语义配色完全保持原设计，外框尺寸与装了玻璃脚本时一致（94×41）
