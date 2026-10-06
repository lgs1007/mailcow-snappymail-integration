# mailcow + SnappyMail 集成包

这是一个独立的社区集成项目，目标是让 **SnappyMail 2.38.2** 在 mailcow
同域名环境下获得 SSO、动态 Dovecot Master 凭据和会话同步能力。

主要功能：

- `/mail/` 由 mailcow Nginx 反代到 SnappyMail；
- `/mailcow-auth-verify` 提供服务端 mailcow 会话认证；
- `/mailcow-session-check` 仅向浏览器暴露当前邮箱地址；
- 修改版 `proxy-auth` 每次登录动态读取只读挂载的 `sieve.creds`；
- `mailcow-session-sync` 负责 mailcow / SnappyMail 登录、退出与 A→B 账号切换；
- SnappyMail 中提供 `/user` 管理中心快捷入口。

## 许可证

本仓库**不包含 mailcow Core，也不包含 SnappyMail Core**。

- 本项目原创集成代码、配置和文档：AGPL-3.0-only；
- 修改版 `proxy-auth`：继续遵守其上游 MIT 许可证，并完整保留原作者版权和 MIT 文本；
- mailcow Core（未包含）：上游 GPL-3.0；
- SnappyMail Core（未包含）：上游 AGPL-3.0。

完整说明见 [LICENSES.md](LICENSES.md) 和
[docs/LICENSE-COMPLIANCE.md](docs/LICENSE-COMPLIANCE.md)。

部署前请阅读 [docs/INSTALL.md](docs/INSTALL.md) 和 [SECURITY.md](SECURITY.md)。
