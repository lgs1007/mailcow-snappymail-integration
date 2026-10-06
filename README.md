# mailcow + SnappyMail integration

A small, source-available integration package for running **SnappyMail 2.38.2**
behind **mailcow** with same-origin SSO, dynamic Dovecot master credentials, and
mailcow-authoritative session synchronization.

> This is an independent community integration. It is not affiliated with,
> sponsored by, or endorsed by mailcow, The Infrastructure Company GmbH,
> SnappyMail, or the upstream Proxy Auth author.

## What it provides

- `/mail/` reverse proxy through mailcow Nginx.
- Reusable internal `/mailcow-auth-verify` auth subrequest.
- Browser-safe `/mailcow-session-check` exposing only `X-Mailcow-User`.
- Modified MIT-licensed SnappyMail `proxy-auth` plugin that reads mailcow's
  rotating Dovecot master credentials from a **read-only** file mount.
- `mailcow-session-sync` plugin that treats mailcow as the authoritative browser
  session, including A→B account switching and safe handling of unknown states.
- A `/user` management-center shortcut in SnappyMail.

## Supported target

- SnappyMail: **2.38.2**
- mailcow: uses the `127.0.0.1:65510/sogo-auth` Nginx integration point present
  in the tested deployment. Re-test after mailcow upgrades because this is an
  implementation detail, not a stable cross-project API contract.

## Repository layout

```text
nginx/                           mailcow Nginx custom include examples
snappymail/proxy-auth-mailcow-dynamic/
                                 modified upstream Proxy Auth plugin (MIT)
snappymail/mailcow-session-sync/
                                 session synchronization plugin (AGPL-3.0-only)
examples/                        Docker Compose example
docs/                            installation, architecture, security, licensing
patches/                         patch against upstream proxy-auth v0.5
LICENSES/                        upstream/reference license texts
```

## Quick start

Read **[docs/INSTALL.md](docs/INSTALL.md)** before deployment. In short:

1. Run SnappyMail 2.38.2 on `mailcowdockerized_mailcow-network` without exposing
   its application port publicly.
2. Mount mailcow's `sieve.creds` read-only at
   `/run/secrets/mailcow-sieve-creds`.
3. Install the two plugin directories under SnappyMail's `_default_/plugins/`.
4. Enable Proxy Auth and Mailcow Session Sync in SnappyMail Admin.
5. Configure Proxy Auth with `Remote-User`, `*`, automatic login, and a narrow
   trusted proxy IP/CIDR.
6. Install the two Nginx custom files and run `nginx -t` before reloading.

## Security model

The browser never supplies the trusted identity. mailcow Nginx resolves the
current mailbox session, then **overwrites** `Remote-User` before proxying to
SnappyMail. Master credentials remain server-side and are mounted read-only.
Unknown/failed session checks do not trigger destructive logout behavior.

See **[SECURITY.md](SECURITY.md)** for deployment requirements.

## Licensing

The repository intentionally does **not** redistribute mailcow core or
SnappyMail core. Components have explicit licenses:

- Project-authored integration files: **AGPL-3.0-only**.
- `proxy-auth-mailcow-dynamic`: **MIT**, preserving the original Philipp
  Mundhenk copyright and license from the upstream SnappyMail plugin.
- mailcow core (not included): **GPL-3.0** upstream.
- SnappyMail core (not included): **AGPL-3.0** upstream.

See **[LICENSES.md](LICENSES.md)** and
**[docs/LICENSE-COMPLIANCE.md](docs/LICENSE-COMPLIANCE.md)**.
