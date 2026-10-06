# GPX 转一生足迹

本工具使用 **OpenAI Codex 辅助开发**，在 [steplife-universal-importer](https://github.com/hygao1024/steplife-universal-importer) 的转换思路与参数设计基础上改写、扩展为网页工具，主要用于**方便地将奥维互动地图导出的 GPX 轨迹转换为「一生足迹」可导入的 CSV**。

通过网页选择 GPX 文件，设置开始时间、结束时间和点间隔，即可导出 CSV。下载后打开即可使用，无需安装程序或配置服务器。

## 特别感谢：steplife-universal-importer

**首先感谢 [hygao1024](https://github.com/hygao1024) 开源的 [steplife-universal-importer（一生足迹数据导入器）](https://github.com/hygao1024/steplife-universal-importer)。**

原项目提供了将第三方轨迹转换为一生足迹 CSV 的工具，支持 GPX、KML 和奥维 JSON，并提供路径开始时间和轨迹插点等配置。它为本工具明确转换方向、理解导入流程和设计时间参数提供了重要参考。

本工具由 OpenAI Codex 辅助完成代码编写与调整，围绕“奥维地图导出 GPX → 设置时间 → 导入一生足迹”的使用流程，在原项目思路基础上增加了本地 HTML 界面、起止时间与点间隔联动、轨迹预览及平均速度展示。代码采用独立的浏览器 JavaScript 实现，并非直接修改原仓库的 Go 源码，不依赖原项目的可执行程序，也不是原项目的官方网页版。

**感谢原作者分享代码与实现思路。如果这个工具对你有帮助，也欢迎访问原项目，给原作者一个 Star：**

**[前往 steplife-universal-importer →](https://github.com/hygao1024/steplife-universal-importer)**

同时感谢 [1ifebytes/footprint-to-fog](https://github.com/1ifebytes/footprint-to-fog) 提供的一生足迹 CSV 示例，帮助核对字段结构。该项目的转换方向是 CSV → GPX；本工具的输出格式还结合一生足迹原生导出样本进行了比对。

本工具与上述项目保持独立，也不是「一生足迹」官方产品。

## 使用方法

1. 下载仓库 ZIP 并解压，使用 Edge 或 Chrome 打开 `index.html`。
2. 选择 GPX 文件，可用仓库中的 `测试.gpx` 体验。
3. 设置开始和结束时间，统一按北京时间（UTC+8）解释。
4. 调整间隔或导出名称，点击「导出一生足迹 CSV」。
5. 将下载的 CSV 传到手机，在一生足迹中导入。

网页及转换逻辑不使用外部依赖、不上传所选文件、不发送轨迹数据。也可部署到 GitHub Pages，通过浏览器在线打开；转换仍在本地完成。

## 可以做什么

- 读取 GPX 轨迹点；没有轨迹点时支持路线点。
- 保留原始经纬度、点顺序及点数，不插点、不转换坐标。
- 预览轨迹形状、点数、计算里程、总时长和平均速度。
- 默认开始时间：**2019-11-30 08:00:00**。
- 默认结束时间：**2019-11-30 18:00:00**。
- 修改开始或结束时间，自动计算间隔：`总秒数 ÷（点数 − 1）`。
- 手动输入间隔仅接受正整数秒，并自动更新结束时间。
- 自动间隔可为小数；箭头从 `2.58374` 向上调整到 `3`、`4`，向下调整到 `2`、`1`。
- 自定义导出名称，自动补全 `.csv`。

## 时间与速度如何处理

工具用设定的起止时间重建逐点时间，会替换 GPX 中原有的时间，不能将生成时间视为原始 GPS 记录。

CSV 使用整数秒 Unix 时间戳，每点按 `开始时间 + round(点序号 × 间隔)` 写入，避免小数间隔逐点累加导致时间漂移。按起止时间计算时，最后一个点落在设定的结束时间。

如果自动间隔小于 1 秒，部分点会有相同时间戳，界面会提醒，App 可能合并这些点。仅有一个点时，结束时间等于开始时间。

界面平均速度 = 总里程（km）÷ 总时长（h），只作参考。CSV 的 `speed` 沿用已测试的固定值 `10`，并非计算所得速度；App 可能自行计算显示速度。

## 导出格式

输出编码为 UTF-8 BOM，表头和顺序如下：

```csv
dataTime,locType,longitude,latitude,heading,accuracy,speed,distance,isBackForeground,stepType,altitude
```

| 字段 | 输出规则 |
| --- | --- |
| dataTime | 重建的秒级 Unix 时间戳 |
| locType | 固定为 1 |
| longitude / latitude | 保留 GPX 原始坐标文本精度 |
| heading | 固定为 0 |
| accuracy | 固定为 10，占位值 |
| speed | 固定为 10 |
| distance | 分段内与上一点的球面距离（米），每段首点为 0 |
| isBackForeground | 固定为 1 |
| stepType | 固定为 0 |
| altitude | 保留 GPX 海拔，缺失时填 0 |

字段名称及顺序已与一生足迹原生导出 CSV 比对。导入速度、点过滤和统计显示由 App 决定，不保证所有版本行为相同。

## GitHub Pages 部署

1. 将本文件夹中的文件上传到 GitHub 仓库根目录，确保 `index.html` 在根目录。
2. 打开仓库 **Settings → Pages**。
3. 在 **Build and deployment** 中选择 **Deploy from a branch**。
4. 选择存放文件的分支（通常为 `main`）和根目录 `/ (root)`，保存。
5. 等待部署完成，打开 Pages 提供的网址。

无需构建命令、API Key 或后端配置。仓库中的 GPX 测试文件会随公开仓库一起公开，发布前请确认其内容适合公开。

部署设置参考 [GitHub Pages 官方说明](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)。

## 项目结构

```text
index.html          页面入口
style.css           页面样式
app.js              文件读取、表单联动、预览和下载
converter.js        GPX 解析与 CSV 转换核心
测试.gpx            用户提供的测试轨迹（145 点）
tests/converter.cjs  可移植的核心逻辑测试
.nojekyll           GitHub Pages 静态文件标记
```

## 开发与测试

普通使用不需要 Node.js。开发者安装 Node.js 后可运行无第三方依赖的核心测试：

```sh
node tests/converter.cjs
```

GPX XML 解析依赖浏览器的 DOMParser。浏览器验收可选择 `测试.gpx`：默认时间下应显示 **145 点、10 小时、250 秒间隔**；手动改为 **10 秒**后，结束时间应为 **2019-11-30 08:24:00**。再检查导出 CSV 的 11 列表头、145 条记录、起止时间和坐标。

## 已知限制

- 形状预览不含地图底图，不能单凭预览判断是否贴路。
- 多段 CSV 没有独立分段字段，App 可能将分段连接显示。
- 计算的是点间球面直线距离，稀疏点可能低估实际道路里程。
- 最大输入文件为 50 MB，大轨迹可能使浏览器变慢。
- 不处理 GPX 扩展里的速度、时间区间、航点集合或加密文件。
