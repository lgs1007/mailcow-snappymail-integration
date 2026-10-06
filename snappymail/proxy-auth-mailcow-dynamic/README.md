# SnappyMail Proxy Auth — mailcow dynamic credentials variant

This directory is a **modified version** of the SnappyMail `proxy-auth` plugin
(version 0.5) by Philipp Mundhenk. The upstream plugin is MIT-licensed; its
original copyright and MIT license are preserved in `LICENSE`.

Upstream source: <https://github.com/the-djmaze/snappymail/tree/v2.38.2/plugins/proxy-auth>

## Modifications in this repository

The mailcow integration keeps the upstream ProxyAuth behavior and adds dynamic
Dovecot master-credential loading:

- On every `?ProxyAuth` login, read `/run/secrets/mailcow-sieve-creds`.
- Trim outer whitespace and split the file at the **first** `:` only.
- The left side is the current Dovecot master user; the complete remainder is
  the master password (so passwords may contain additional `:` characters).
- If the file is missing, unreadable, empty, or malformed, fall back to the
  static `Master User` / `Master Password` plugin settings.
- `MapEmailAddress()` uses the same master user selected for that login so the
  master suffix is removed correctly from the account shown in the UI.
- The credential value is never intentionally written to logs or returned to
  the browser.

Mount the source file read-only:

```yaml
volumes:
  - /opt/mailcow-dockerized/data/conf/sogo/sieve.creds:/run/secrets/mailcow-sieve-creds:ro
```

## SnappyMail settings

Enable **Proxy Auth** in SnappyMail Admin → Extensions and configure:

- Master User Separator: `*` (or the separator configured by your mailcow/Dovecot setup)
- Header Name: `Remote-User`
- Check Proxy: **enabled**
- Proxy IPNet: the narrowest IP/CIDR that represents the trusted reverse proxy
- Automatic Login: **enabled**

The static Master User / Password fields remain as fallback values. For a pure
mailcow deployment, keep them protected and do not publish them.

The mailcow-generated master user commonly uses the `mailcow.local` domain.
Ensure SnappyMail has a matching domain configuration if your deployment
requires domain resolution for that login form.

## Security

The reverse proxy must overwrite `Remote-User`; never forward a value supplied
by the browser. Do not expose SnappyMail directly to an untrusted network when
ProxyAuth is enabled.

## License

MIT, exactly as the upstream `proxy-auth` plugin. See `LICENSE`.

The modifications are identified in source comments and this README. This
repository does not redistribute SnappyMail core.
