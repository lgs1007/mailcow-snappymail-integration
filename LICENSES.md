# License map

This repository uses per-component licensing. SPDX identifiers below describe
how each distributed component is licensed.

| Path | License | Notes |
| --- | --- | --- |
| `/` integration docs/config/scripts (except listed exceptions) | AGPL-3.0-only | Project-authored integration material |
| `snappymail/mailcow-session-sync/**` | AGPL-3.0-only | Independent plugin written for this integration |
| `snappymail/proxy-auth-mailcow-dynamic/**` | MIT | Modified upstream `proxy-auth`; original copyright and MIT license retained |
| `LICENSES/GPL-3.0.txt` | GPL-3.0 license text | Reference for mailcow upstream; mailcow core is not redistributed here |
| `LICENSES/AGPL-3.0.txt` | AGPL-3.0 license text | Project/SnappyMail license-family reference |
| `LICENSES/MIT-proxy-auth.txt` | MIT | Exact license notice distributed with upstream Proxy Auth |

## Upstream projects not redistributed

**mailcow** core is not copied into this repository. Upstream states that
mailcow itself is licensed under GNU GPL Version 3. See:
<https://github.com/mailcow/mailcow-dockerized>.

**SnappyMail** core is not copied into this repository. Upstream states that
SnappyMail is licensed under GNU Affero GPL Version 3. See:
<https://github.com/the-djmaze/snappymail>.

The `proxy-auth` plugin is a separately licensed MIT component in the
SnappyMail source tree. The modified copy here retains its upstream `LICENSE`.

This file is a packaging/compliance summary, not legal advice. If you modify or
redistribute mailcow or SnappyMail core themselves, follow their respective
upstream license obligations for those works.
