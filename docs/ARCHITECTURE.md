# Architecture

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

mailcow is the browser-session authority. SnappyMail still performs the IMAP
login, but ProxyAuth constructs the Dovecot master login using the current
mailcow-generated master credentials.

The session-sync plugin performs request-time account comparison so changing
mailcow from account A to B does not leave SnappyMail on A. Network errors are
classified as unknown and do not trigger destructive transitions.
