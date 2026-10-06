# 许可证合规说明

该软件包的结构设计旨在避免无声地重新授权上游软件，或不必要地重新分发过多的上游代码。

## 1. mailcow

没有打包任何 mailcow 核心源代码、镜像或二进制文件。`nginx/` 下的 Nginx 文件是为本项目编写的集成示例。mailcow 上游声明其本身采用 GNU GPL 第 3 版发布。`LICENSES/GPL-3.0.txt` 中包含了完整的 GPLv3 文本，供参考。

`mailcow` 这个名称仅用于标识兼容性。上游声明该词为 The Infrastructure Company GmbH 的注册商标；本项目不声称拥有该商标，也未获得该公司的认可。

## 2. SnappyMail

没有打包任何 SnappyMail 核心源代码或二进制文件。用户应从上游项目/容器中获取 SnappyMail。SnappyMail 上游声明其核心采用 GNU AGPL 第 3 版授权。

本项目中撰写的集成材料，包括 `mailcow-session-sync`，均以 AGPL-3.0-only 发布。这是一种保守的兼容性选择，适用于设计嵌入在 AGPL 许可的 SnappyMail 应用中的插件。

## 3. Proxy Auth

SnappyMail 的 `proxy-auth` 插件本身带有 MIT 许可证。该仓库重新分发了一个修改过的源代码副本，因此：

- 保留了上游版权声明；
- 在组件目录中保留了完整的上游 MIT 许可证；
- 标明该副本已被修改；
- 包含该修改的首选源代码形式；
- 包含对上游插件的统一补丁。

该修改不会改变组件的 MIT 许可证。

## 4. 分发

GitHub-ready 的 ZIP 包包含的是源代码文件，而不是 mailcow/SnappyMail 的核心二进制文件。如果下游分发者将本仓库与修改后的 mailcow 或 SnappyMail 核心组合使用，那么该分发者必须独立满足这些上游作品所适用的 GPL/AGPL 义务。

本文档总结了打包决策；它不是法律建议。
