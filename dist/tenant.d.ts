import type { EnforcerTenantBrand, SessionStorageAdapter } from './types.js';
/** Where the tenant code in effect came from, highest precedence first. */
export type TenantCodeSource = 'prop' | 'url' | 'input' | 'stored' | 'default';
export interface ResolvedTenantCode {
    code: string | undefined;
    source: TenantCodeSource;
}
export declare const tenantCodeKey: (storageKey: string) => string;
export declare const tenantBrandKey: (storageKey: string) => string;
/** Reads `?<param>=` from the current URL. Null in SSR or when absent. */
export declare function readTenantCodeFromUrl(param: string): string | null;
/**
 * The tenant code to use: the `tenantCode` prop (build/env config, like a Privy
 * app id), then a `?tenant=` link, then what the user typed into the join-code
 * field, then the code remembered from this browser's last sign-in, then the
 * instance default.
 *
 * `typed` is null until the user submits the field; "" means they chose to
 * leave it blank, i.e. the instance default, overriding any remembered code.
 */
export declare function resolveTenantCode(input: {
    prop: string | undefined;
    urlParam: string | false;
    typed?: string | null;
    store: SessionStorageAdapter;
    storageKey: string;
    remember: boolean;
}): ResolvedTenantCode;
export declare function saveTenantCode(store: SessionStorageAdapter, storageKey: string, code: string | null): void;
export declare function loadTenantBrand(store: SessionStorageAdapter, storageKey: string, code: string | undefined): EnforcerTenantBrand | null;
export declare function saveTenantBrand(store: SessionStorageAdapter, storageKey: string, code: string | undefined, brand: EnforcerTenantBrand): void;
//# sourceMappingURL=tenant.d.ts.map