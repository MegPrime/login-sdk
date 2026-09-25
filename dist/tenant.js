export const tenantCodeKey = (storageKey) => `${storageKey}.tenant`;
export const tenantBrandKey = (storageKey) => `${storageKey}.brand`;
function read(store, key) {
    try {
        return store.getItem(key);
    }
    catch {
        return null;
    }
}
function write(store, key, value) {
    try {
        if (value === null)
            store.removeItem(key);
        else
            store.setItem(key, value);
    }
    catch {
        /* quota or a blocked store — remembering is best-effort */
    }
}
/** Reads `?<param>=` from the current URL. Null in SSR or when absent. */
export function readTenantCodeFromUrl(param) {
    if (typeof window === 'undefined' || !window.location)
        return null;
    try {
        const value = new URLSearchParams(window.location.search).get(param);
        return value?.trim() || null;
    }
    catch {
        return null;
    }
}
/**
 * The tenant code to use: the `tenantCode` prop (build/env config, like a Privy
 * app id), then a `?tenant=` link, then what the user typed into the join-code
 * field, then the code remembered from this browser's last sign-in, then the
 * instance default.
 *
 * `typed` is null until the user submits the field; "" means they chose to
 * leave it blank, i.e. the instance default, overriding any remembered code.
 */
export function resolveTenantCode(input) {
    if (input.prop)
        return { code: input.prop, source: 'prop' };
    if (input.urlParam) {
        const fromUrl = readTenantCodeFromUrl(input.urlParam);
        if (fromUrl)
            return { code: fromUrl, source: 'url' };
    }
    if (input.typed != null)
        return { code: input.typed || undefined, source: 'input' };
    if (input.remember) {
        const stored = read(input.store, tenantCodeKey(input.storageKey));
        if (stored)
            return { code: stored, source: 'stored' };
    }
    return { code: undefined, source: 'default' };
}
export function saveTenantCode(store, storageKey, code) {
    write(store, tenantCodeKey(storageKey), code);
}
export function loadTenantBrand(store, storageKey, code) {
    const raw = read(store, tenantBrandKey(storageKey));
    if (!raw)
        return null;
    try {
        const cached = JSON.parse(raw);
        if ((cached.code ?? null) !== (code ?? null))
            return null;
        return { name: cached.name, logo_url: cached.logo_url };
    }
    catch {
        write(store, tenantBrandKey(storageKey), null);
        return null;
    }
}
export function saveTenantBrand(store, storageKey, code, brand) {
    if (!brand.name && !brand.logo_url)
        return;
    const cached = { code: code ?? null, name: brand.name, logo_url: brand.logo_url };
    write(store, tenantBrandKey(storageKey), JSON.stringify(cached));
}
//# sourceMappingURL=tenant.js.map