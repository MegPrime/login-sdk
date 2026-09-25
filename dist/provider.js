import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore, } from 'react';
import { DEFAULT_BASE_PATH, EnforcerAuthClient } from './client.js';
import { isEnforcerAuthError } from './errors.js';
import { sessionManager } from './sessionManager.js';
import { resolveStorage } from './storage.js';
import { loadTenantBrand, resolveTenantCode, saveTenantBrand, saveTenantCode, } from './tenant.js';
import { getFreshAccessToken } from './tokenStore.js';
const EnforcerAuthContext = createContext(null);
export function EnforcerAuthProvider({ children, ...options }) {
    const { baseUrl, basePath, tenantCode: tenantCodeProp, tenantCodeParam = 'tenant', rememberTenant = true, storage, storageKey = 'enforcer.session', refreshSkewSeconds = 60, bootstrapAuthConfig = true, configureService, configureHookServices: hookServices = ['v3'], hookServiceBaseUrls, credentials = 'include', onSignIn, onSignOut, onError, } = options;
    const store = useMemo(() => resolveStorage(storage), [storage]);
    const client = useMemo(() => new EnforcerAuthClient({
        baseUrl,
        basePath,
        headers: options.headers,
        credentials,
        fetch: options.fetch,
    }), 
    // A changed baseUrl/basePath must rebuild the client; headers/fetch are
    // read at call time from the captured options object.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [baseUrl, basePath, credentials]);
    const callbacks = useRef({ onSignIn, onSignOut, onError });
    callbacks.current = { onSignIn, onSignOut, onError };
    // The manager is configured during the first render, not in an effect, so the
    // session restored from storage is already readable by children (and by any
    // hook that fires on mount) before anything paints.
    const configured = useRef(false);
    if (!configured.current) {
        configured.current = true;
        sessionManager.configure({
            client,
            storage: store,
            storageKey,
            skewSeconds: refreshSkewSeconds,
            onSignIn: (s) => callbacks.current.onSignIn?.(s),
            onSignOut: () => callbacks.current.onSignOut?.(),
            onError: (e) => callbacks.current.onError?.(e),
        });
    }
    // Re-configure when the inputs the manager captured actually change.
    useEffect(() => {
        sessionManager.configure({
            client,
            storage: store,
            storageKey,
            skewSeconds: refreshSkewSeconds,
            onSignIn: (s) => callbacks.current.onSignIn?.(s),
            onSignOut: () => callbacks.current.onSignOut?.(),
            onError: (e) => callbacks.current.onError?.(e),
        });
    }, [client, store, storageKey, refreshSkewSeconds]);
    // Cross-tab sync + wake-up refresh.
    useEffect(() => sessionManager.start(), []);
    const { session, refreshing } = useSyncExternalStore(sessionManager.subscribe, sessionManager.getSnapshot, sessionManager.getSnapshot);
    const [authConfig, setAuthConfig] = useState(null);
    // What the user typed into the join-code field, once submitted.
    const [typedTenantCode, setTypedTenantCode] = useState(null);
    // Bumped to re-run resolution after a remembered code is dropped.
    const [tenantEpoch, setTenantEpoch] = useState(0);
    const resolvedTenant = useMemo(() => resolveTenantCode({
        prop: tenantCodeProp,
        urlParam: tenantCodeParam,
        typed: typedTenantCode,
        store,
        storageKey,
        remember: rememberTenant,
    }), 
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tenantCodeProp, tenantCodeParam, typedTenantCode, store, storageKey, rememberTenant, tenantEpoch]);
    const tenantCode = resolvedTenant.code;
    const tenantCodeSource = resolvedTenant.source;
    const forgetTenantCode = useCallback(() => {
        saveTenantCode(store, storageKey, null);
        setTenantEpoch((n) => n + 1);
    }, [store, storageKey]);
    const setTenantCode = useCallback((code) => setTypedTenantCode(code.trim()), []);
    // Remember where this browser signs in, so the next visit needs no link and
    // shows the workspace's branding before sign-in. A prop-supplied code is
    // already known to the app and is not written.
    const signedInTenant = session?.account?.tenant;
    useEffect(() => {
        if (!session || !rememberTenant)
            return;
        if (tenantCode && tenantCodeSource !== 'prop')
            saveTenantCode(store, storageKey, tenantCode);
        // Blank field: the user chose the default tenant, so stop pre-filling the old one.
        if (!tenantCode && tenantCodeSource === 'input')
            saveTenantCode(store, storageKey, null);
        if (signedInTenant) {
            saveTenantBrand(store, storageKey, tenantCode, {
                name: signedInTenant.name,
                logo_url: signedInTenant.logo_url,
            });
        }
    }, [session, signedInTenant, rememberTenant, tenantCode, tenantCodeSource, store, storageKey]);
    const cachedBrand = useMemo(() => (rememberTenant ? loadTenantBrand(store, storageKey, tenantCode) : null), [rememberTenant, store, storageKey, tenantCode]);
    const tenantBrand = useMemo(() => {
        const candidates = [signedInTenant, authConfig?.tenant, cachedBrand];
        const hit = candidates.find((b) => b && (b.name || b.logo_url));
        return hit ? { name: hit.name, logo_url: hit.logo_url } : null;
    }, [signedInTenant, authConfig, cachedBrand]);
    const optionsRef = useRef(options);
    optionsRef.current = options;
    const setSession = useCallback((next) => {
        sessionManager.setSession(next);
    }, []);
    const completeSignIn = useCallback((next) => {
        sessionManager.completeSignIn(next);
    }, []);
    const refresh = useCallback(() => sessionManager.refresh('manual'), []);
    const signOut = useCallback(() => sessionManager.signOut(), []);
    // Wire the generated hook packages to this session. `configureService` is
    // passed in rather than imported, so the SDK never depends on hooks-shared.
    useEffect(() => {
        if (!configureService || hookServices === false || !hookServices?.length)
            return;
        const mount = (basePath ?? DEFAULT_BASE_PATH).replace(/^\/+|\/+$/g, '');
        const origin = baseUrl.replace(/\/+$/, '');
        for (const key of hookServices) {
            configureService(key, {
                baseUrl: hookServiceBaseUrls?.[key] ?? (mount ? `${origin}/${mount}` : origin),
                // Async on purpose: a request made just as the token expires waits for
                // the rotation instead of going out stale and 401ing.
                getToken: getFreshAccessToken,
                credentials,
            });
        }
    }, [configureService, hookServices, baseUrl, basePath, hookServiceBaseUrls, credentials]);
    // Bootstrap the tenant's auth scheme so the UI can refuse OTP up front
    // instead of failing at submit with a 403 wrong_auth_scheme.
    useEffect(() => {
        if (!bootstrapAuthConfig)
            return;
        const ac = new AbortController();
        client
            .getAuthConfig(tenantCode, ac.signal)
            .then(setAuthConfig)
            .catch((error) => {
            if (ac.signal.aborted)
                return;
            // A remembered code whose tenant is gone would strand the user on an
            // error. Drop it; resolution falls through to the instance default.
            if (tenantCodeSource === 'stored' && isEnforcerAuthError(error) && error.code === 'tenant_not_found') {
                forgetTenantCode();
                return;
            }
            // Non-fatal: older servers don't serve /auth/config. Assume native so
            // sign-in still works, and let the submit path report the truth.
            setAuthConfig({});
            callbacks.current.onError?.(error);
        });
        return () => ac.abort();
    }, [client, tenantCode, tenantCodeSource, forgetTenantCode, bootstrapAuthConfig]);
    const status = session ? 'authenticated' : 'unauthenticated';
    const value = useMemo(() => ({
        status,
        session,
        account: session?.account ?? null,
        accessToken: session?.token ?? null,
        isRefreshing: refreshing,
        isNewAccount: Boolean(session?.is_new_account),
        authConfig,
        // Unknown (bootstrap off or endpoint absent) is treated as available.
        otpAvailable: !authConfig?.auth_provider || authConfig.auth_provider === 'native',
        tenantCode,
        tenantCodeSource,
        forgetTenantCode,
        setTenantCode,
        tenantBrand,
        get options() {
            return optionsRef.current;
        },
        client,
        setSession,
        completeSignIn,
        refresh,
        getFreshToken: getFreshAccessToken,
        signOut,
    }), [
        status,
        session,
        refreshing,
        authConfig,
        tenantCode,
        tenantCodeSource,
        forgetTenantCode,
        setTenantCode,
        tenantBrand,
        client,
        setSession,
        completeSignIn,
        refresh,
        signOut,
    ]);
    return _jsx(EnforcerAuthContext.Provider, { value: value, children: children });
}
export function useEnforcerAuth() {
    const ctx = useContext(EnforcerAuthContext);
    if (!ctx) {
        throw new Error('[enforcer-login-sdk] useEnforcerAuth must be used inside <EnforcerAuthProvider>');
    }
    return ctx;
}
//# sourceMappingURL=provider.js.map