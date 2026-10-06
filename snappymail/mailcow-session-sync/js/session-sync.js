(function () {
	'use strict';

	var LOCK_KEY = 'mailcow-session-sync-switching';
	var SESSION_URL = '/mailcow-session-check';
	var MAILCOW_LOGOUT_URL = '/';
	var WEBMAIL_URL = '/mail/';
	var ROOT_URL = '/';
	var REQUEST_TIMEOUT = 5000;
	var SWITCH_LOCK_TTL = 15000;
	var MAX_MISMATCH_SWITCHES = 2;
	var BOOTSTRAP_DELAYS = [350, 1000, 2000, 4000];
	var requestTimer = 0;
	var nextReconcileTimer = 0;
	var intervalTimer = 0;
	var bootstrapTimers = [];
	var logoutFallbackTimer = 0;
	var backoff = [5000, 10000, 30000, 60000];
	var backoffIndex = 0;
	var inFlight = false;
	var reconcilePending = false;
	var activeController = null;
	var localReady = false;
	var switching = false;
	var userLogoutPending = false;
	var internalLogout = false;
	var activeExitTarget = '';
	var originalLogout = null;
	var originalLogoutReload = null;
	var logoutWrapped = false;
	var reloadWrapped = false;
	var initialized = false;
	var adminContext = false;
	var leaving = false;
	var destroyed = false;
	var lastLocalState = null;

	function isAdminUrl() {
		try {
			return new URL(window.location.href).searchParams.has('admin');
		} catch (e) {
			return /(?:^|[?&])admin(?:=|&|$)/i.test(window.location.search);
		}
	}

	function isProxyAuthActionUrl() {
		try {
			var params = new URL(window.location.href).searchParams;
			return params.has('ProxyAuth') || params.has('UserHeaderSet');
		} catch (e) {
			return /(?:^|[?&])(?:ProxyAuth|UserHeaderSet)(?:=|&|$)/i.test(window.location.search);
		}
	}

	function getSettings() {
		return window.rl && rl.settings && typeof rl.settings.get === 'function' ? rl.settings : null;
	}

	function appDataReadiness() {
		var s = getSettings();
		if (!s || !window.rl || !rl.app || typeof rl.app.logout !== 'function') {
			return { state: 'LOCAL_NOT_READY' };
		}
		var auth = s.get('Auth');
		if (typeof auth !== 'boolean') return { state: 'LOCAL_NOT_READY' };
		if (auth && !(String(s.get('mainEmail') || '').trim())) {
			return { state: 'LOCAL_NOT_READY' };
		}
		return { state: 'READY', appAuthenticated: auth };
	}

	function toast(message) {
		var node = document.getElementById('mailcow-session-sync-toast');
		if (!node) {
			node = document.createElement('div');
			node.id = 'mailcow-session-sync-toast';
			node.className = 'mailcow-session-sync-toast';
			node.setAttribute('role', 'alert');
			node.setAttribute('aria-live', 'assertive');
			document.body.appendChild(node);
		}
		node.textContent = message;
		node.classList.add('is-visible');
		window.clearTimeout(node._hideTimer);
		node._hideTimer = window.setTimeout(function () {
			node.classList.remove('is-visible');
		}, 5000);
	}

	function readLock() {
		try {
			var raw = window.sessionStorage.getItem(LOCK_KEY);
			if (!raw) return null;
			var data = JSON.parse(raw);
			if (!data || typeof data.at !== 'number' || typeof data.attempts !== 'number') {
				window.sessionStorage.removeItem(LOCK_KEY);
				return null;
			}
			return data;
		} catch (e) {
			return null;
		}
	}

	function writeLock(reason, attempts) {
		try {
			window.sessionStorage.setItem(LOCK_KEY, JSON.stringify({
				reason: reason,
				attempts: attempts,
				at: Date.now()
			}));
		} catch (e) { /* In-memory guards remain active if storage is unavailable. */ }
	}

	function clearLock() {
		try { window.sessionStorage.removeItem(LOCK_KEY); } catch (e) { /* no-op */ }
	}

	function clearBootstrap() {
		bootstrapTimers.forEach(function (timer) { window.clearTimeout(timer); });
		bootstrapTimers = [];
	}

	function clearScheduledReconcile() {
		window.clearTimeout(nextReconcileTimer);
		nextReconcileTimer = 0;
	}

	function clearTimers() {
		clearScheduledReconcile();
		clearBootstrap();
		window.clearInterval(intervalTimer);
		window.clearTimeout(requestTimer);
		window.clearTimeout(logoutFallbackTimer);
		intervalTimer = requestTimer = logoutFallbackTimer = 0;
	}

	function navigate(path) {
		if (leaving) return;
		leaving = true;
		clearTimers();
		if (window.location.pathname !== path || window.location.search || window.location.hash) {
			window.location.replace(path);
		}
	}

	function sameAccount(a, b) {
		return String(a || '').trim().toLowerCase() === String(b || '').trim().toLowerCase();
	}

	function fetchMailcowState() {
		var controller = new AbortController();
		activeController = controller;
		requestTimer = window.setTimeout(function () { controller.abort(); }, REQUEST_TIMEOUT);
		return fetch(SESSION_URL, {
			method: 'GET',
			credentials: 'same-origin',
			cache: 'no-store',
			headers: { 'Accept': 'text/plain' },
			signal: controller.signal
		}).then(function (response) {
			if (!response.ok) return { state: 'UNKNOWN' };
			var user = (response.headers.get('X-Mailcow-User') || '').trim();
			return { state: user ? 'AUTHENTICATED' : 'ANONYMOUS', user: user };
		}).catch(function () {
			return { state: 'UNKNOWN' };
		}).then(function (result) {
			window.clearTimeout(requestTimer);
			requestTimer = 0;
			if (activeController === controller) activeController = null;
			return result;
		});
	}

	function fetchSnappyState() {
		return new Promise(function (resolve) {
			var settled = false;
			var timer = window.setTimeout(function () {
				if (!settled) {
					settled = true;
					resolve({ state: 'UNKNOWN' });
				}
			}, REQUEST_TIMEOUT + 100);
			try {
				rl.pluginRemoteRequest(function (error, data) {
					if (settled) return;
					settled = true;
					window.clearTimeout(timer);
					if (error || !data || !data.Result || data.Result.ready !== true) {
						resolve({ state: 'UNKNOWN' });
						return;
					}
				var result = data.Result;
				if (result.authenticated === true) {
					var primary = String(result.primaryAccount || '').trim();
					resolve(primary ? { state: 'AUTHENTICATED', primaryAccount: primary } : { state: 'UNKNOWN' });
				} else if (result.authenticated === false) {
					resolve({ state: 'ANONYMOUS', primaryAccount: '' });
				} else {
					resolve({ state: 'UNKNOWN' });
				}
				}, 'SessionState', {}, REQUEST_TIMEOUT);
			} catch (e) {
				window.clearTimeout(timer);
				settled = true;
				resolve({ state: 'UNKNOWN' });
			}
		});
	}

	function schedule(delay) {
		clearScheduledReconcile();
		nextReconcileTimer = window.setTimeout(reconcile, delay);
	}

	function scheduleRetry() {
		var delay = backoff[Math.min(backoffIndex, backoff.length - 1)];
		backoffIndex = Math.min(backoffIndex + 1, backoff.length - 1);
		schedule(delay);
	}

	function scheduleNormal() {
		backoffIndex = 0;
		clearScheduledReconcile();
	}

	function startLocalLogout(reason, target, previousAttempts) {
		if (switching || leaving || userLogoutPending || !window.rl || !rl.app || typeof rl.app.logout !== 'function') return;
		switching = true;
		writeLock(reason, previousAttempts || 1);
		activeExitTarget = target;
		window.clearTimeout(logoutFallbackTimer);
		logoutFallbackTimer = window.setTimeout(function () {
			activeExitTarget = '';
			switching = false;
			logoutFallbackTimer = 0;
			scheduleNormal();
		}, 10000);
		internalLogout = true;
		try {
			rl.app.logout();
		} finally {
			internalLogout = false;
		}
	}

	function waitForReconcile() {
		return new Promise(function (resolve) {
			var started = Date.now();
			(function wait() {
				if (!inFlight) {
					resolve(true);
				} else if (Date.now() - started > REQUEST_TIMEOUT + 200) {
					resolve(false);
				} else {
					window.setTimeout(wait, 50);
				}
			})();
		});
	}

	function handleStableStates(local, mailcow) {
		lastLocalState = local;
		addManageButton();

		if (mailcow.state === 'ANONYMOUS') {
			clearLock();
			if (local.state === 'AUTHENTICATED') {
				startLocalLogout('SESSION_EXPIRED', ROOT_URL, 1);
			} else {
				navigate(ROOT_URL);
			}
			scheduleNormal();
			return;
		}

		if (local.state === 'ANONYMOUS') {
			// ProxyAuth Automatic Login owns this transition.
			scheduleNormal();
			return;
		}

		if (sameAccount(local.primaryAccount, mailcow.user)) {
			clearLock();
			switching = false;
			scheduleNormal();
			return;
		}

		var lock = readLock();
		if (lock && lock.reason === 'ACCOUNT_MISMATCH') {
			var age = Date.now() - lock.at;
			if (age < SWITCH_LOCK_TTL) {
				schedule(Math.min(SWITCH_LOCK_TTL - age + 100, 30000));
				return;
			}
			if (lock.attempts >= MAX_MISMATCH_SWITCHES) {
				// Stop a logout/reload loop. Continue observing, and clear after a match.
				scheduleNormal();
				return;
			}
			startLocalLogout('ACCOUNT_MISMATCH', WEBMAIL_URL, lock.attempts + 1);
			scheduleNormal();
			return;
		}

		startLocalLogout('ACCOUNT_MISMATCH', WEBMAIL_URL, 1);
		scheduleNormal();
	}

	function reconcile(forceFollowUp) {
		if (adminContext || destroyed || leaving || isProxyAuthActionUrl()) return Promise.resolve({ state: 'SKIPPED' });
		if (inFlight) {
			if (forceFollowUp) reconcilePending = true;
			return Promise.resolve({ state: 'IN_FLIGHT' });
		}

		var readiness = appDataReadiness();
		if (readiness.state === 'LOCAL_NOT_READY') {
			// Crucially, this neither writes a switching lock nor changes auth state.
			scheduleRetry();
			return Promise.resolve({ state: 'LOCAL_NOT_READY' });
		}
		wrapLogoutReload();
		wrapLogout();

		inFlight = true;
		return Promise.all([fetchSnappyState(), fetchMailcowState()]).then(function (states) {
			if (destroyed || leaving) return { state: 'STALE' };
			var local = states[0];
			var mailcow = states[1];
			if (local.state !== 'UNKNOWN' && !localReady) {
				localReady = true;
				clearBootstrap();
			}
			if (userLogoutPending) {
				scheduleNormal();
				return { state: 'USER_LOGOUT_PENDING' };
			}
			if (local.state === 'UNKNOWN' || mailcow.state === 'UNKNOWN') {
				scheduleRetry();
				return { state: 'UNKNOWN' };
			}
			handleStableStates(local, mailcow);
			return { state: 'RECONCILED' };
		}).catch(function () {
			scheduleRetry();
			return { state: 'UNKNOWN' };
		}).then(function (result) {
			inFlight = false;
			if (reconcilePending && !destroyed && !leaving) {
				reconcilePending = false;
				window.setTimeout(function () { reconcile(false); }, 0);
			}
			return result;
		});
	}

	function verifyAfterLogout() {
		return waitForReconcile().then(function (available) {
			if (!available) return { local: { state: 'UNKNOWN' }, mailcow: { state: 'UNKNOWN' } };
			return Promise.all([fetchSnappyState(), fetchMailcowState()]).then(function (states) {
				return { local: states[0], mailcow: states[1] };
			});
		});
	}

	function wrapLogoutReload() {
		if (reloadWrapped || !window.rl || typeof rl.logoutReload !== 'function') return;
		originalLogoutReload = rl.logoutReload;
		rl.logoutReload = function (url) {
			if (activeExitTarget) {
				var target = activeExitTarget;
				activeExitTarget = '';
				switching = false;
				userLogoutPending = false;
				window.clearTimeout(logoutFallbackTimer);
				logoutFallbackTimer = 0;
				leaving = true;
				clearTimers();
				originalLogoutReload.call(rl, target);
				return;
			}
			return originalLogoutReload.call(rl, url);
		};
		reloadWrapped = true;
	}

	function wrapLogout() {
		if (logoutWrapped || !window.rl || !rl.app || typeof rl.app.logout !== 'function') return;
		originalLogout = rl.app.logout;
		rl.app.logout = function () {
			if (internalLogout || adminContext || userLogoutPending) {
				return originalLogout.apply(this, arguments);
			}
			userLogoutPending = true;
			performUserLogout(this, arguments);
		};
		logoutWrapped = true;
	}

	function performUserLogout(app, args) {
		clearScheduledReconcile();
		var finished = false;
		var controller = new AbortController();
		var timer = window.setTimeout(function () { controller.abort(); }, REQUEST_TIMEOUT);
		fetch(MAILCOW_LOGOUT_URL, {
			method: 'POST',
			credentials: 'same-origin',
			cache: 'no-store',
			headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
			body: 'logout=1',
			signal: controller.signal
		}).then(function (response) {
			window.clearTimeout(timer);
			if (!response.ok) throw new Error('mailcow-logout-failed');
			return verifyAfterLogout();
		}).then(function (states) {
			var local = states.local;
			var mailcow = states.mailcow;
			if (local.state === 'UNKNOWN' || mailcow.state === 'UNKNOWN') throw new Error('state-unknown');
			if (local.state !== 'AUTHENTICATED') throw new Error('local-session-changed');
			if (mailcow.state === 'AUTHENTICATED' && sameAccount(mailcow.user, local.primaryAccount)) {
				throw new Error('mailcow-session-still-active');
			}
			finished = true;
			activeExitTarget = mailcow.state === 'AUTHENTICATED' ? WEBMAIL_URL : ROOT_URL;
			window.clearTimeout(logoutFallbackTimer);
			logoutFallbackTimer = window.setTimeout(function () {
				activeExitTarget = '';
				userLogoutPending = false;
				logoutFallbackTimer = 0;
				scheduleNormal();
			}, 10000);
			internalLogout = true;
			try {
				originalLogout.apply(app, args);
			} finally {
				internalLogout = false;
			}
		}).catch(function () {
			window.clearTimeout(timer);
			if (!finished) {
				userLogoutPending = false;
				toast('退出 mailcow 失败，请重试。');
			}
		});
	}

	function addManageButton() {
		var existing = document.getElementById('mailcow-session-sync-manage');
		if (!lastLocalState || lastLocalState.state !== 'AUTHENTICATED' || destroyed) {
			if (existing) existing.remove();
			return;
		}
		if (existing || !document.body) return;
		var button = document.createElement('a');
		button.id = 'mailcow-session-sync-manage';
		button.className = 'mailcow-session-sync-manage';
		button.href = '/user';
		button.title = '返回 mailcow 管理中心';
		button.setAttribute('aria-label', '管理中心');
		button.textContent = '管理中心';
		document.body.appendChild(button);
	}

	function startBootstrap() {
		clearBootstrap();
		BOOTSTRAP_DELAYS.forEach(function (delay) {
			bootstrapTimers.push(window.setTimeout(reconcile, delay));
		});
	}

	function onVisibilityChange() {
		if (document.visibilityState === 'visible') reconcile(true);
	}

	function onPageShow() {
		var wasDestroyed = destroyed;
		destroyed = false;
		if (wasDestroyed && !adminContext && !isProxyAuthActionUrl()) {
			if (!intervalTimer) intervalTimer = window.setInterval(reconcile, 30000);
			if (!localReady) startBootstrap();
		}
		reconcile(true);
	}

	function onPageHide() {
		destroyed = true;
		if (activeController) activeController.abort();
		clearTimers();
	}

	function init() {
		if (adminContext || destroyed || isAdminUrl() || isProxyAuthActionUrl()) return;
		if (!initialized) {
			initialized = true;
			wrapLogoutReload();
			wrapLogout();
			intervalTimer = window.setInterval(reconcile, 30000);
			startBootstrap();
		}
		reconcile(true);
	}

	adminContext = isAdminUrl();
	if (adminContext || isProxyAuthActionUrl()) return;
	document.addEventListener('DOMContentLoaded', init, { once: true });
	window.addEventListener('load', init, { once: true });
	window.addEventListener('pageshow', onPageShow);
	window.addEventListener('focus', function () { reconcile(true); });
	document.addEventListener('visibilitychange', onVisibilityChange);
	window.addEventListener('pagehide', onPageHide);
	if (document.readyState !== 'loading') init();
})();
