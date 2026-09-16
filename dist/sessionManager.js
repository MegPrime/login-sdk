import { EnforcerAuthError } from './errors';
import { clearSession, loadSession, millisUntilExpiry, saveSession } from './storage.js';
/** Retry backoff for failures that must NOT sign the user out. */
const BACKOFF_MS = [1_000, 2_000, 5_000, 10_000, 30_000, 60_000];
/** Refresh when the token has less than this left, even off-schedule. */
const EAGER_WINDOW_MS = 90_000;
export class SessionManager {
    config = null;
    session = null;
    listeners = new Set();
    inFlight = null;
    timer = null;
    retryTimer = null;
    attempt = 0;
    channel = null;
    bound = false;
    refreshing = false;
    /** Snapshot handed to useSyncExternalStore; only replaced when state changes. */
    snapshot = {
        session: null,
        refreshing: false,
    };
    // ---------------------------------------------------------------- lifecycle
    configure(config) {
        this.config = config;
        const stored = loadSession(config.storage, config.storageKey);
        // Reconfiguring re-reads storage and so mints a new object for the same
        // session. Keep the existing reference when nothing actually changed, so
        // subscribers aren't churned on every provider re-render.
        if (stored?.token !== this.session?.token) {
            this.session = stored;
            this.publish();
        }
        this.scheduleTimer();
    }
    /** Attaches cross-tab + wake-up listeners. Returns a detach function. */
    start() {
        if (typeof window === 'undefined')
            return () => { };
        if (!this.bound) {
            this.bound = true;
            window.addEventListener('visibilitychange', this.onVisibility);
            window.addEventListener('online', this.onOnline);
            window.addEventListener('storage', this.onStorage);
            try {
                this.channel = new BroadcastChannel('enforcer-login-sdk');
                this.channel.onmessage = this.onBroadcast;
            }
            catch {
                // No BroadcastChannel — the storage event still syncs tabs.
            }
        }
        return () => this.stop();
    }
    stop() {
        if (typeof window !== 'undefined' && this.bound) {
            window.removeEventListener('visibilitychange', this.onVisibility);
            window.removeEventListener('online', this.onOnline);
            window.removeEventListener('storage', this.onStorage);
        }
        this.bound = false;
        this.channel?.close();
        this.channel = null;
        this.clearTimers();
    }
    // ------------------------------------------------------------------- state
    subscribe = (listener) => {
        this.listeners.add(listener);
        return () => void this.listeners.delete(listener);
    };
    getSnapshot = () => this.snapshot;
    getSession() {
        return this.session;
    }
    /** The current access token. Synchronous — may be moments from expiry. */
    getToken() {
        return this.session?.token;
    }
    /**
     * The access token, refreshed first if it is expired or nearly so. Hand this
     * to the hook packages as `getToken` and a request can never carry a stale
     * token — the fetch waits for the rotation instead of 401ing.
     */
    async getFreshToken() {
        const session = this.session;
        if (!session?.token)
            return undefined;
        if (!session.refresh_token)
            return session.token;
        if (millisUntilExpiry(session) > this.skewMs())
            return session.token;
        const next = await this.refresh('token-read');
        return next?.token ?? this.session?.token;
    }
    setSession(next, opts = {}) {
        const config = this.config;
        this.session = next;
        if (config) {
            if (next)
                saveSession(config.storage, config.storageKey, next);
            else
                clearSession(config.storage, config.storageKey);
        }
        this.attempt = 0;
        this.clearRetry();
        this.publish();
        this.scheduleTimer();
        if (opts.broadcast !== false) {
            this.post(next ? { type: 'session', session: next } : { type: 'signout' });
        }
    }
    /** Adopts a session and fires `onSignIn`. */
    completeSignIn(next) {
        this.setSession(next);
        this.config?.onSignIn?.(next);
    }
    async signOut() {
        const current = this.session;
        this.setSession(null);
        this.config?.onSignOut?.();
        if (!current || !this.config)
            return;
        try {
            await this.config.client.logout(current.refresh_token, current.token);
        }
        catch (error) {
            // Local state is already cleared; a failed revoke must not block sign-out.
            this.config.onError?.(error);
        }
    }
    // ----------------------------------------------------------------- refresh
    /**
     * Rotates the access token. Concurrent callers share one attempt, and only
     * one tab at a time holds the lock. Resolves to the new session, or null when
     * there was nothing to refresh.
     */
    refresh(reason = 'manual') {
        if (this.inFlight)
            return this.inFlight;
        const run = this.runRefresh(reason).finally(() => {
            this.inFlight = null;
            this.refreshing = false;
            this.publish();
        });
        this.inFlight = run;
        this.refreshing = true;
        this.publish();
        return run;
    }
    async runRefresh(reason) {
        const config = this.config;
        if (!config)
            return null;
        const withLock = async () => {
            // Re-read shared storage inside the lock: another tab may have rotated
            // while this one waited, in which case its token is the live one and
            // spending ours would look like reuse.
            const stored = loadSession(config.storage, config.storageKey);
            if (stored && stored.token !== this.session?.token) {
                this.adopt(stored);
            }
            const current = this.session;
            if (!current?.refresh_token)
                return null;
            // Someone else's rotation already bought us headroom.
            if (millisUntilExpiry(current) > this.skewMs())
                return current;
            try {
                const next = await config.client.refresh(current.refresh_token);
                // The refresh response carries no account; keep the one we have.
                const merged = { ...next, account: next.account ?? current.account };
                this.setSession(merged);
                return merged;
            }
            catch (error) {
                return this.handleRefreshFailure(error, reason);
            }
        };
        const locks = globalThis.navigator?.locks;
        if (locks?.request) {
            return locks.request('enforcer-login-sdk.refresh', withLock);
        }
        return withLock();
    }
    /**
     * Decides whether a failed refresh ends the session. Only a definitive
     * rejection does — everything else keeps the user signed in and retries, so a
     * tunnel or a 502 never presents as a logout.
     */
    handleRefreshFailure(error, reason) {
        const config = this.config;
        config?.onError?.(error);
        const err = error instanceof EnforcerAuthError ? error : null;
        const code = err?.code;
        const status = err?.status ?? 0;
        // The server rotated under us. The winner wrote its session to storage;
        // adopt that rather than spending our now-demoted token again — a second
        // attempt outside the grace window would revoke the family.
        if (code === 'refresh_raced' || status === 409) {
            if (config) {
                const stored = loadSession(config.storage, config.storageKey);
                if (stored && stored.token !== this.session?.token) {
                    this.adopt(stored);
                    return stored;
                }
            }
            this.scheduleRetry(reason);
            return this.session;
        }
        // Definitive: the token was rejected or the family revoked. Nothing to
        // salvage — this is the one path that signs the user out.
        if (code === 'invalid_refresh_token' || status === 401 || status === 403) {
            this.setSession(null);
            config?.onSignOut?.();
            return null;
        }
        // Offline, DNS, 5xx, timeout — transient. Keep the session and retry.
        this.scheduleRetry(reason);
        return this.session;
    }
    // ----------------------------------------------------------------- private
    adopt(session) {
        // Written by another tab, so don't persist or re-broadcast it.
        this.session = session;
        this.attempt = 0;
        this.clearRetry();
        this.publish();
        this.scheduleTimer();
    }
    skewMs() {
        return (this.config?.skewSeconds ?? 60) * 1000;
    }
    scheduleTimer() {
        this.clearTimer();
        const session = this.session;
        if (!session?.refresh_token)
            return;
        const remaining = millisUntilExpiry(session);
        if (!Number.isFinite(remaining))
            return;
        // Fire at the skew boundary; a token already inside it refreshes now.
        this.timer = setTimeout(() => void this.refresh('timer'), Math.max(0, remaining - this.skewMs()));
    }
    scheduleRetry(reason) {
        this.clearRetry();
        if (!this.session?.refresh_token)
            return;
        const delay = BACKOFF_MS[Math.min(this.attempt, BACKOFF_MS.length - 1)];
        this.attempt += 1;
        this.retryTimer = setTimeout(() => void this.refresh(reason), delay);
    }
    clearTimer() {
        if (this.timer)
            clearTimeout(this.timer);
        this.timer = null;
    }
    clearRetry() {
        if (this.retryTimer)
            clearTimeout(this.retryTimer);
        this.retryTimer = null;
    }
    clearTimers() {
        this.clearTimer();
        this.clearRetry();
    }
    /**
     * Republishes only on a real change. `useSyncExternalStore` compares
     * snapshots by reference, so minting a new object unconditionally would spin
     * the render loop — and `configure()` legitimately runs during render.
     */
    publish() {
        const prev = this.snapshot;
        if (prev.session === this.session && prev.refreshing === this.refreshing)
            return;
        this.snapshot = { session: this.session, refreshing: this.refreshing };
        for (const listener of this.listeners)
            listener();
    }
    post(message) {
        try {
            this.channel?.postMessage(message);
        }
        catch {
            // A closed channel is not worth failing a sign-in over.
        }
    }
    /**
     * A sleeping tab's timer fires late (or not at all), so re-check on wake.
     * This is what stops "came back to the laptop and it had logged me out".
     */
    onVisibility = () => {
        if (typeof document === 'undefined' || document.visibilityState !== 'visible')
            return;
        this.syncFromStorage();
        const session = this.session;
        if (!session?.refresh_token)
            return;
        if (millisUntilExpiry(session) <= Math.max(this.skewMs(), EAGER_WINDOW_MS)) {
            void this.refresh('visibility');
        }
        else {
            this.scheduleTimer();
        }
    };
    onOnline = () => {
        const session = this.session;
        if (!session?.refresh_token)
            return;
        // Retries that failed while offline should not wait out their backoff.
        this.attempt = 0;
        if (millisUntilExpiry(session) <= Math.max(this.skewMs(), EAGER_WINDOW_MS)) {
            void this.refresh('online');
        }
    };
    onStorage = (event) => {
        if (!this.config || event.key !== this.config.storageKey)
            return;
        this.syncFromStorage();
    };
    onBroadcast = (event) => {
        const data = event.data;
        if (data?.type === 'session' && data.session) {
            if (data.session.token !== this.session?.token)
                this.adopt(data.session);
        }
        else if (data?.type === 'signout') {
            if (this.session) {
                this.session = null;
                this.clearTimers();
                this.publish();
                this.config?.onSignOut?.();
            }
        }
    };
    /** Pulls whatever another tab last wrote. */
    syncFromStorage() {
        const config = this.config;
        if (!config)
            return;
        const stored = loadSession(config.storage, config.storageKey);
        if (stored?.token && stored.token !== this.session?.token) {
            this.adopt(stored);
        }
        else if (!stored && this.session) {
            // Another tab signed out.
            this.session = null;
            this.clearTimers();
            this.publish();
            this.config?.onSignOut?.();
        }
    }
}
/** The process-wide manager. One session per page, as the server expects. */
export const sessionManager = new SessionManager();
//# sourceMappingURL=sessionManager.js.map