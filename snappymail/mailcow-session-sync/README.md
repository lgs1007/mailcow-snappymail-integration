# mailcow-session-sync

SnappyMail 2.38.2 plugin for synchronizing the webmail authentication state with the same-origin mailcow session.

## Requirements

- SnappyMail 2.38.2
- The existing `proxy-auth` plugin is working and ProxyAuth Automatic Login is enabled
- Nginx exposes the tested same-origin `GET /mailcow-session-check` endpoint with `X-Mailcow-User`

mailcow is the authoritative authentication session. `2xx + non-empty X-Mailcow-User` means authenticated; `2xx + empty/missing header` means explicitly anonymous; every other result is unknown and causes retry only.

## Behavior

- Anonymous mailcow session: logs out the local SnappyMail session first, then goes to `/`.
- Different primary accounts: logs out only SnappyMail and returns to `/mail/` so ProxyAuth can log in the mailcow account.
- Same primary account: no action.
- Signed-in mailcow with no SnappyMail session: leaves ProxyAuth Automatic Login in control.
- A user-triggered SnappyMail logout first POSTs `logout=1` to `/`, then verifies both the current SnappyMail state and `/mailcow-session-check`. It logs out SnappyMail only if mailcow is anonymous or mailcow has restored/switched to another account (dual-login case). Verification failure leaves SnappyMail signed in.
- `?admin` is excluded. ProxyAuth action URLs are excluded from page synchronization.
- A floating **管理中心** button opens `/user` in the same tab.

## Startup and reconciliation

The plugin runs the same `reconcile()` operation on initial load, `pageshow`, `focus`, visible `visibilitychange`, and a 30-second interval. Initial bootstrap retries run around 350 ms, 1 s, 2 s, and 4 s; they stop as soon as the local SnappyMail account state is ready. If it is not ready, the plugin returns `LOCAL_NOT_READY`, creates no switching lock, and tries again at the next bootstrap/event/interval.

Every reconciliation calls the plugin JSON action to read the **current** server-side SnappyMail primary account from `getMainAccountFromToken(false)`. The `mainEmail` value in initial AppData is used only to confirm frontend readiness; it is never cached or used for ACCOUNT_MISMATCH comparison. The JSON response contains only `ready`, `authenticated`, and the primary account address. It does not return credentials or session tokens.

A mismatch lock records only the reason, attempt count, and timestamp in `sessionStorage`. Mismatch logout is attempted at most twice without an intervening successful account match, which allows one re-evaluation after the short 15-second cooldown and prevents an endless logout/reload cycle.

## Installation

Unzip so the directory is exactly:

`/opt/snappymail/data/_data_/_default_/plugins/mailcow-session-sync/`

Enable **Mailcow Session Sync** under SnappyMail Admin → Extensions → Plugins, then reload `/mail/`. Restarting the SnappyMail container should not be needed for plugin files; if the plugin does not appear after enabling, restart the container once to clear cached plugin metadata/JS.

## Uninstall

Disable or delete this plugin. It does not modify SnappyMail Core, `proxy-auth`, mailcow, Nginx, Docker Compose, Dovecot, Postfix, or SOGo.

## Source interfaces verified in SnappyMail 2.38.2

- Plugin base/registration: `RainLoop\Plugins\AbstractPlugin`, `Init()`, `addJs()`, `addCss()`, `addJsonHook()`, and `rl.pluginRemoteRequest()`.
- Primary account: `RainLoop\Actions::getMainAccountFromToken(false)` returns the main authenticated account. `getAccountData()` separately exposes `mainEmail`; the active `Email` can refer to an Additional Account. The plugin's `PluginSessionState` action calls the live server API on every reconciliation, so Additional Account selection does not alter the compared primary account.
- Logout: `AppUser.logout()` calls `Remote.request('Logout', ...)` and on success `rl.logoutReload(Settings.app('customLogoutLink'))`. The visible dropdown calls `rl.app.logout()`. The generic `json.before-logout` and `json.after-logout` hooks run after the Logout JSON request has been sent, so the plugin wraps the exact public runtime methods to hold user-initiated logout until mailcow has been checked.
- Front-end plugin JS: `PluginsLink` is generated from `HaveJs($bAdmin)`; user-scoped `addJs()` files load for guest/login and authenticated user AppData. Admin has a separate `Admin` plugin JS scope.
- Admin exclusion: JS/CSS are registered only in user scope; the server JSON action rejects an `ActionsAdmin` context, and the browser also skips `?admin`.
- ProxyAuth: `ProxyAuth`/`UserHeaderSet` are part actions handled by `ServiceActions`. The plugin does not register or intercept them and skips those action URLs.
- Notifications: the source's `NotificationUserStore.display()` is for opt-in desktop mail notifications, not a general toast. Logout failure uses a small accessible live-region alert.
- Lifecycle: initialization is idempotent; the central reconciliation function handles each trigger, coalesces concurrent calls, and clears timers on `pagehide`. A bfcache `pageshow` resumes the 30-second interval and restarts bootstrap only if the local account was not ready before suspension.

## Test guide

Use a test account and confirm each case in the browser network panel:

1. Reproduce the reported case: login to mailcow as A, open `/mail/`, switch mailcow to B without manually refreshing SnappyMail. The first live `PluginSessionState` response should report primary A and `/mailcow-session-check` should report B; SnappyMail should locally logout A and return to `/mail/` for ProxyAuth login as B within seconds.
2. mailcow logged out + SnappyMail guest → `/`.
3. mailcow logged out + SnappyMail authenticated → SnappyMail `Logout`, then `/`.
4. mailcow A + guest → ProxyAuth performs login; plugin does not log out mailcow.
5. mailcow A + primary A → no session transition.
6. Click SnappyMail logout → POST `/` body `logout=1`, verify both sessions, SnappyMail `Logout`, then `/` (or `/mail/` if dual-login restored another user).
7. Make POST fail or keep the same mailcow session → SnappyMail remains signed in and an error message appears.
8. Return 502/503 or delay either state endpoint beyond five seconds → no logout or redirect; retries back off.
9. Open `/mail/?admin` → no check, redirect, logout interception, or management button.
10. Switch UI to Additional Account B with primary A and mailcow A → no mismatch.
11. Trigger `pageshow`, focus, visible `visibilitychange`, and interval during a delayed request → calls coalesce and only one pair of state requests runs at once.

## License

This independent integration plugin is distributed under **AGPL-3.0-only** to
match the license family of the SnappyMail host. See `LICENSE` in this plugin
directory. SnappyMail itself is not included in this repository.
