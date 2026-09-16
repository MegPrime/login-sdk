import { sessionManager } from './sessionManager';
/**
 * Non-React accessors for the current session.
 *
 * The generated `@instruxi-io/*-hooks` packages authenticate through a
 * `getToken()` callback the fetch mutator invokes per request — outside React,
 * with no access to context. These are what that callback reads.
 */
/**
 * The current access token, synchronously. May be moments from expiry; prefer
 * `getFreshAccessToken` for anything that is about to hit the network.
 */
export function getAccessToken() {
    return sessionManager.getToken();
}
/**
 * The access token, rotated first if it has expired or is inside the refresh
 * skew. `configureService`'s `getToken` accepts a promise, so wiring this in
 * means a request can never go out with a stale token:
 *
 *   configureService('v3', { baseUrl, getToken: getFreshAccessToken })
 *
 * Concurrent callers share one rotation, and it is coordinated across tabs.
 */
export function getFreshAccessToken() {
    return sessionManager.getFreshToken();
}
/** Observe token changes (e.g. to clear a cache on sign-out). Returns an unsubscribe. */
export function onAccessTokenChange(listener) {
    let last = sessionManager.getToken();
    return sessionManager.subscribe(() => {
        const next = sessionManager.getToken();
        if (next !== last) {
            last = next;
            listener(next);
        }
    });
}
//# sourceMappingURL=tokenStore.js.map