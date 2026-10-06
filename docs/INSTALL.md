# Installation guide

Target: SnappyMail 2.38.2 deployed as a separate container on mailcow's Docker
network. Paths are examples; adjust them to your deployment.

## 1. SnappyMail container

Use `examples/docker-compose.snappymail.yml` as a starting point. It intentionally
publishes no host port. The important pieces are:

- join `mailcowdockerized_mailcow-network`;
- persist `/var/lib/snappymail`;
- mount `/opt/mailcow-dockerized/data/conf/sogo/sieve.creds` read-only at
  `/run/secrets/mailcow-sieve-creds`.

## 2. Install plugins

Copy directories to:

```text
/opt/snappymail/data/_data_/_default_/plugins/proxy-auth/
/opt/snappymail/data/_data_/_default_/plugins/mailcow-session-sync/
```

Use the contents of `proxy-auth-mailcow-dynamic` for the `proxy-auth` directory.
Keep the directory name `proxy-auth`, because SnappyMail uses that plugin key.

In SnappyMail Admin → Extensions, enable both plugins.

## 3. SnappyMail domain configuration

Configure each real mail domain for your mailcow deployment. The tested setup
also requires `mailcow.local` so the ProxyAuth login form
`real-user@example.com*master@mailcow.local` can resolve during login.

Typical internal endpoints when SnappyMail shares mailcow's Docker network:

- IMAP: `dovecot:143`, STARTTLS
- SMTP: `postfix:587`, STARTTLS
- SIEVE: `dovecot:4190`, STARTTLS

Use your own verified TLS/security settings.

## 4. Proxy Auth settings

Configure:

```text
Master User Separator: *
Header Name: Remote-User
Check Proxy: enabled
Proxy IPNet: narrowest trusted reverse-proxy IP or CIDR
Automatic Login: enabled
```

Static Master User / Password remain fallback settings. The modified plugin
prefers the current read-only `sieve.creds` value for every ProxyAuth login.

## 5. Nginx

Copy:

```text
nginx/site.mailcow-auth.custom
  -> /opt/mailcow-dockerized/data/conf/nginx/site.mailcow-auth.custom

nginx/site.snappymail.custom
  -> /opt/mailcow-dockerized/data/conf/nginx/site.snappymail.custom
```

Then validate before restarting:

```sh
cd /opt/mailcow-dockerized
docker compose exec nginx-mailcow nginx -t
docker compose restart nginx-mailcow
```

## 6. Verify

Test at least:

1. mailcow A + SnappyMail guest → automatic login as A.
2. mailcow A + SnappyMail A → no transition.
3. mailcow switches A→B → SnappyMail logs out A locally and ProxyAuth enters B.
4. mailcow logs out → SnappyMail session is closed and browser returns to `/`.
5. Additional Account selection does not change the primary-account comparison.
6. `/mail/?admin` is not affected by session-sync.
7. Restart Dovecot so `sieve.creds` rotates; next ProxyAuth login still succeeds
   without restarting SnappyMail.

After mailcow or SnappyMail upgrades, repeat these tests before production use.
