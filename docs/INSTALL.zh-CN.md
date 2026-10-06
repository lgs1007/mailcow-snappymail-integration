# 安装指南

目标：将 SnappyMail 2.38.2 部署为 mailcow Docker 网络中的单独容器。路径仅为示例；请根据你的部署环境进行调整。

## 1. SnappyMail 容器

可以将 `examples/docker-compose.snappymail.yml` 作为起点。它有意不对外发布宿主机端口。关键配置包括：

- 加入 `mailcowdockerized_mailcow-network` 网络；
- 持久化 `/var/lib/snappymail`；
- 以只读方式挂载 `/opt/mailcow-dockerized/data/conf/sogo/sieve.creds` 至 `/run/secrets/mailcow-sieve-creds`。

## 2. 安装插件

将目录复制到：

```text
/opt/snappymail/data/_data_/_default_/plugins/proxy-auth/
/opt/snappymail/data/_data_/_default_/plugins/mailcow-session-sync/
```

将 `proxy-auth-mailcow-dynamic` 的内容用于 `proxy-auth` 目录。请保留目录名为 `proxy-auth`，因为 SnappyMail 使用这个插件键名。

在 SnappyMail 管理后台 → 扩展中，启用两个插件。

## 3. SnappyMail 域名配置

为你的 mailcow 部署配置每个真实邮件域。测试环境还要求存在 `mailcow.local`，这样在登录时 ProxyAuth 登录表单 `real-user@example.com*master@mailcow.local` 才能解析。

当 SnappyMail 与 mailcow 共享 Docker 网络时，常见的内部端点如下：

- IMAP: `dovecot:143`，STARTTLS
- SMTP: `postfix:587`，STARTTLS
- SIEVE: `dovecot:4190`，STARTTLS

请使用你已验证过的 TLS/安全配置。

## 4. Proxy Auth 设置

配置如下：

```text
Master User Separator: *
Header Name: Remote-User
Check Proxy: enabled
Proxy IPNet: 最窄的受信任反向代理 IP 或 CIDR
Automatic Login: enabled
```

静态 Master User / Password 仍然保留为回退设置。修改后的插件会优先使用当前只读挂载的 `sieve.creds` 中的值，用于每次 ProxyAuth 登录。

## 5. Nginx

复制：

```text
nginx/site.mailcow-auth.custom
  -> /opt/mailcow-dockerized/data/conf/nginx/site.mailcow-auth.custom

nginx/site.snappymail.custom
  -> /opt/mailcow-dockerized/data/conf/nginx/site.snappymail.custom
```

然后在重启前先验证：

```sh
cd /opt/mailcow-dockerized
docker compose exec nginx-mailcow nginx -t
docker compose restart nginx-mailcow
```

## 6. 验证

至少测试以下几项：

1. mailcow A + SnappyMail guest → 自动登录为 A。
2. mailcow A + SnappyMail A → 不发生切换。
3. mailcow 从 A 切换到 B → SnappyMail 会在本地注销 A，并让 ProxyAuth 进入 B。
4. mailcow 注销登录 → SnappyMail 会关闭会话并浏览器返回 `/`。
5. 额外账号选择不会更改主账号比较结果。
6. `/mail/?admin` 不受 session-sync 影响。
7. 重启 Dovecot 以让 `sieve.creds` 轮换；下一次 ProxyAuth 登录仍然成功，而不需要重启 SnappyMail。

在 mailcow 或 SnappyMail 升级后，在投入生产前请重复这些测试。
