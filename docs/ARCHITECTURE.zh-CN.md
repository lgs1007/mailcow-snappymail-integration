# 架构

```text
Browser
  │ mailcow session cookie
  ▼
mailcow nginx
  ├─ /mailcow-auth-verify (internal auth_request)
  │      └─ 127.0.0.1:65510/sogo-auth
  │              └─ X-User: current mailbox
  │
  ├─ /mailcow-session-check
  │      └─ browser sees only X-Mailcow-User
  │
  └─ /mail/
         ├─ overwrites Remote-User
         ▼
      SnappyMail
         ├─ proxy-auth-mailcow-dynamic
         │    └─ /run/secrets/mailcow-sieve-creds (read-only)
         └─ mailcow-session-sync
              └─ live primary-account reconciliation
```

mailcow 是浏览器会话的权威来源。SnappyMail 仍然负责 IMAP 登录，但 ProxyAuth 会使用当前 mailcow 生成的主凭据来构造 Dovecot 主登录。

session-sync 插件会在请求时执行账号比较，以确保将 mailcow 中的账号从 A 切换到 B 时，SnappyMail 不会继续停留在 A。网络错误会被归类为未知状态，并不会触发破坏性的切换。
