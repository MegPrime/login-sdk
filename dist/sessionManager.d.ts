import type { EnforcerAuthClient } from './client.js';
import type { EnforcerSession, SessionStorageAdapter } from './types.js';
/**
 * Owns the session outside React so the token is always current for callers
 * that aren't components (the hook packages' `getToken`), and so refresh can be
 * coordinated across tabs.
 *
 * enforcer-v3 issues ROTATING refresh tokens: every refresh mints a successor
 * and demotes its predecessor. Presenting a demoted token inside the server's
 * grace window is a benign `refresh_raced` (409), but outside it the server
 * treats it as theft and **revokes the whole family** — signing the user out
 * everywhere. Two tabs refreshing independently is exactly how that happens, so
 * this manager guarantees:
 *
 *   1. one refresh at a time per tab (an in-flight promise all callers share),
 *   2. one refresh at a time across tabs (Web Locks, where available),
 *   3. the token being spent is always re-read from shared storage first, and
 *   4. a fresh session is broadcast so other tabs adopt it instead of rotating.
 *
 * Failures are triaged rather than treated alike: only a definitive rejection
 * ends the session. Network loss, server errors and races keep the user signed
 * in and retry.
 */
export type RefreshReason = 'timer' | 'visibility' | 'online' | 'manual' | 'token-read';
interface ManagerConfig {
    client: EnforcerAuthClient;
    storage: SessionStorageAdapter;
    storageKey: string;
    /** Refresh this many seconds before `expires_at`. */
    skewSeconds: number;
    onSignIn?: (session: EnforcerSession) => void;
    onSignOut?: () => void;
    onError?: (error: unknown) => void;
}
type Listener = () => void;
export declare class SessionManager {
    private config;
    private session;
    private listeners;
    private inFlight;
    private timer;
    private retryTimer;
    private attempt;
    private channel;
    private bound;
    private refreshing;
    /** Snapshot handed to useSyncExternalStore; only replaced when state changes. */
    private snapshot;
    configure(config: ManagerConfig): void;
    /** Attaches cross-tab + wake-up listeners. Returns a detach function. */
    start(): () => void;
    stop(): void;
    subscribe: (listener: Listener) => (() => void);
    getSnapshot: () => {
        session: EnforcerSession | null;
        refreshing: boolean;
    };
    getSession(): EnforcerSession | null;
    /** The current access token. Synchronous — may be moments from expiry. */
    getToken(): string | undefined;
    /**
     * The access token, refreshed first if it is expired or nearly so. Hand this
     * to the hook packages as `getToken` and a request can never carry a stale
     * token — the fetch waits for the rotation instead of 401ing.
     */
    getFreshToken(): Promise<string | undefined>;
    setSession(next: EnforcerSession | null, opts?: {
        broadcast?: boolean;
    }): void;
    /** Adopts a session and fires `onSignIn`. */
    completeSignIn(next: EnforcerSession): void;
    signOut(): Promise<void>;
    /**
     * Rotates the access token. Concurrent callers share one attempt, and only
     * one tab at a time holds the lock. Resolves to the new session, or null when
     * there was nothing to refresh.
     */
    refresh(reason?: RefreshReason): Promise<EnforcerSession | null>;
    private runRefresh;
    /**
     * Decides whether a failed refresh ends the session. Only a definitive
     * rejection does — everything else keeps the user signed in and retries, so a
     * tunnel or a 502 never presents as a logout.
     */
    private handleRefreshFailure;
    private adopt;
    private skewMs;
    private scheduleTimer;
    private scheduleRetry;
    private clearTimer;
    private clearRetry;
    private clearTimers;
    /**
     * Republishes only on a real change. `useSyncExternalStore` compares
     * snapshots by reference, so minting a new object unconditionally would spin
     * the render loop — and `configure()` legitimately runs during render.
     */
    private publish;
    private post;
    /**
     * A sleeping tab's timer fires late (or not at all), so re-check on wake.
     * This is what stops "came back to the laptop and it had logged me out".
     */
    private onVisibility;
    private onOnline;
    private onStorage;
    private onBroadcast;
    /** Pulls whatever another tab last wrote. */
    private syncFromStorage;
}
/** The process-wide manager. One session per page, as the server expects. */
export declare const sessionManager: SessionManager;
export {};
//# sourceMappingURL=sessionManager.d.ts.map