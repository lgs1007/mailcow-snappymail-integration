# License compliance notes

The package is deliberately structured to avoid silently relicensing upstream
software or redistributing more upstream code than necessary.

## 1. mailcow

No mailcow core source file, image, or binary is bundled. The Nginx files in
`nginx/` are integration examples authored for this project. mailcow upstream
states that mailcow itself is released under GNU GPL Version 3. The full GPLv3
text is included in `LICENSES/GPL-3.0.txt` for reference.

The name `mailcow` is used only to identify compatibility. Upstream states it is
a registered word mark of The Infrastructure Company GmbH; this project makes
no claim to that mark and is not endorsed by the company.

## 2. SnappyMail

No SnappyMail core source or binary is bundled. Users obtain SnappyMail from the
upstream project/container. SnappyMail upstream states that the core is GNU
AGPL Version 3.

Project-authored integration material, including `mailcow-session-sync`, is
released under AGPL-3.0-only. This is a conservative compatibility choice for a
plugin designed to execute inside the AGPL-licensed SnappyMail application.

## 3. Proxy Auth

SnappyMail's `proxy-auth` plugin carries its own MIT license. This repository
redistributes a modified source copy and therefore:

- preserves the upstream copyright notice;
- preserves the full upstream MIT license in the component directory;
- marks that the copy has been modified;
- includes the preferred source form of the modification;
- includes a unified patch against the upstream plugin.

The modification does not change the component's MIT license.

## 4. Distribution

The GitHub-ready ZIP contains source files, not mailcow/SnappyMail core
binaries. If a downstream distributor combines this repository with modified
mailcow or SnappyMail core, that distributor must independently satisfy the
GPL/AGPL obligations applicable to those upstream works.

This document summarizes the packaging decisions; it is not legal advice.
