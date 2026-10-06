# Security

This integration relies on trusted reverse-proxy identity injection and a
Dovecot master credential. Treat both as privileged infrastructure.

## Required controls

- Do not publish SnappyMail's internal application port directly to the
  Internet when using ProxyAuth.
- Enable Proxy Auth's proxy check and use the narrowest practical trusted proxy
  address/range.
- Nginx must **overwrite** `Remote-User`; never pass `$http_remote_user` or an
  equivalent client-controlled value.
- Mount `sieve.creds` read-only. Never copy its contents to `.env`, plugin JSON,
  Git, logs, browser code, or support tickets.
- Keep `/mailcow-auth-verify` marked `internal`.
- `/mailcow-session-check` deliberately strips `X-Auth`, `X-Auth-Type`, and raw
  `X-User`, exposing only `X-Mailcow-User`.
- Unknown/timeout/5xx state checks are not treated as logout.

## Session activity

Calling `/mailcow-session-check` goes through mailcow's normal session handling
and may refresh the mailcow session's activity timestamp. This is intentional
for this integration: active use of SnappyMail is treated as active use of the
mailcow session.

## Reporting issues

Do not include real cookies, `X-Auth`, master credentials, or `sieve.creds`
contents in a public issue. Redact domains and addresses when they are not
needed to reproduce a problem.
