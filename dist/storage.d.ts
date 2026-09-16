import type { EnforcerAuthOptions, EnforcerSession, SessionStorageAdapter } from './types';
export declare function resolveStorage(storage: EnforcerAuthOptions['storage']): SessionStorageAdapter;
export declare function loadSession(store: SessionStorageAdapter, key: string): EnforcerSession | null;
export declare function saveSession(store: SessionStorageAdapter, key: string, session: EnforcerSession): void;
export declare function clearSession(store: SessionStorageAdapter, key: string): void;
/** ms until the access token expires; Infinity when the server sent no expiry. */
export declare function millisUntilExpiry(session: EnforcerSession): number;
//# sourceMappingURL=storage.d.ts.map