import type { Eip1193Provider } from './siwe.js';
/** Sign-in methods this SDK implements. `'siwe'` and `'wallet'` are aliases
 *  for native Sign-In with Ethereum. enforcer-v3 also supports privy, google,
 *  passkey, oidc and saml — those are out of scope here. */
export type AuthMethod = 'email' | 'phone' | 'siwe' | 'wallet';
/** `provider` value sent to POST /auth/login for each method. */
export declare const PROVIDER_BY_METHOD: Record<AuthMethod, 'email_otp' | 'phone_otp' | 'siwe'>;
export type LoginProvider = 'email_otp' | 'phone_otp' | 'siwe';
/** enforcer-v3's account shape (the fields a login UI actually uses). */
export interface EnforcerAccount {
    id?: string;
    email?: string;
    username?: string;
    first_name?: string;
    last_name?: string;
    email_verified?: boolean;
    profile_completed?: boolean;
    wallet_address?: string;
    tenant_id?: string;
    tenant?: EnforcerTenant;
    [key: string]: unknown;
}
export interface EnforcerTenant {
    id?: string;
    code?: string;
    name?: string;
    description?: string;
    logo_url?: string;
    banner_url?: string;
    thumbnail_url?: string;
    app_url?: string;
    auth_provider?: string;
    status?: string;
    [key: string]: unknown;
}
/** POST /auth/login → data. The session the SDK persists. */
export interface EnforcerSession {
    token: string;
    refresh_token?: string;
    /** RFC3339 timestamp from the server. */
    expires_at?: string;
    account?: EnforcerAccount;
    is_new_account?: boolean;
}
/** GET /auth/config → data. Tells the UI which scheme the tenant runs. */
export interface EnforcerAuthConfig {
    /** "native" (email/phone/siwe/passkey) or "privy". OTP requires "native". */
    auth_provider?: string;
    privy_app_id?: string;
}
/** GET /auth/email-status → data. */
export interface EmailStatus {
    exists: boolean;
    verified: boolean;
}
export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';
/** Pluggable persistence. `localStorage`/`sessionStorage` satisfy this as-is. */
export interface SessionStorageAdapter {
    getItem(key: string): string | null;
    setItem(key: string, value: string): void;
    removeItem(key: string): void;
}
export interface EnforcerAppearance {
    /** "auto" follows prefers-color-scheme. Default "auto". */
    theme?: 'light' | 'dark' | 'auto';
    /** Primary/CTA color. Any CSS color. */
    accent?: string;
    /** Text color on top of `accent`. Default "#fff". */
    accentForeground?: string;
    /** Corner radius for the card and controls, e.g. "12px". */
    radius?: string;
    /** Font stack for the widget. Defaults to the host page's font. */
    fontFamily?: string;
    /** Logo shown above the form. Falls back to the tenant's logo_url. */
    logoUrl?: string;
    /** Product name in the heading. Falls back to the tenant name. */
    brandName?: string;
    /** Extra class on the card root. */
    className?: string;
    /** Raw `--esdk-*` variable overrides, applied to the card root. */
    variables?: Record<string, string>;
    /** Set false to skip the injected stylesheet and bring your own CSS. */
    injectStyles?: boolean;
}
/** Every visible string, overridable for copy changes and localization. */
export interface EnforcerLabels {
    title?: string;
    subtitle?: string;
    emailTab?: string;
    phoneTab?: string;
    walletTab?: string;
    emailLabel?: string;
    emailPlaceholder?: string;
    phoneLabel?: string;
    phonePlaceholder?: string;
    walletSubtitle?: string;
    walletButton?: string;
    walletConnectingButton?: string;
    walletSigningButton?: string;
    walletUnavailable?: string;
    continueButton?: string;
    sendingButton?: string;
    codeTitle?: string;
    /** `{identifier}` is replaced with the email/phone the code went to. */
    codeSubtitle?: string;
    codeLabel?: string;
    verifyButton?: string;
    verifyingButton?: string;
    resendButton?: string;
    /** `{seconds}` is replaced with the remaining cooldown. */
    resendCooldown?: string;
    backButton?: string;
    newAccountNotice?: string;
    signedInAs?: string;
    signOutButton?: string;
    poweredBy?: string;
}
/**
 * Structural type of `configureService` from `@instruxi-io/hooks-shared`.
 * Declared here so the SDK stays dependency-free.
 */
export type ConfigureServiceFn = (service: string, config: {
    baseUrl: string;
    getToken?: () => string | undefined | Promise<string | undefined>;
    credentials?: RequestCredentials;
    [key: string]: unknown;
}) => void;
export interface EnforcerAuthOptions {
    /** Origin of the enforcer-v3 API, e.g. "https://api.example.com". */
    baseUrl: string;
    /**
     * Path the API is mounted under. enforcer-v3's OpenAPI spec declares
     * `/api/v1/enforcer`, which is the default — pass "" if yours is at the root.
     */
    basePath?: string;
    /** Tenant join code. Omit to use the instance's default tenant. */
    tenantCode?: string;
    /**
     * Methods to offer, in tab order. Default `['email']`. `'siwe'` and
     * `'wallet'` are the same Sign-In with Ethereum flow.
     */
    methods?: AuthMethod[];
    /** Digits in the OTP. enforcer-v3 issues 6. */
    otpLength?: number;
    /**
     * Seconds before "Resend" re-enables. Default 30 — the server allows 10
     * credential requests per minute per IP and answers 429 `rate_limited`.
     */
    resendCooldownSeconds?: number;
    /** Refresh the access token this many seconds before it expires. Default 60. */
    refreshSkewSeconds?: number;
    /**
     * Where the session lives. "local" survives a browser restart, "session" is
     * per-tab, "memory" is lost on reload. Or pass your own adapter.
     * Default "local".
     */
    storage?: 'local' | 'session' | 'memory' | SessionStorageAdapter;
    /** Storage key. Default "enforcer.session". */
    storageKey?: string;
    /**
     * Call GET /auth/config on mount and refuse native methods (email, phone,
     * SIWE) when the tenant runs a non-native scheme (e.g. privy), instead of
     * failing at submit with a 403 `wrong_auth_scheme`. Default true.
     */
    bootstrapAuthConfig?: boolean;
    /**
     * EIP-1193 wallet used for SIWE. Default `window.ethereum`. Pass a mock in
     * tests, or a getter if the injected provider appears after mount.
     */
    walletProvider?: Eip1193Provider | (() => Eip1193Provider | undefined | null);
    /**
     * EIP-4361 `domain`. Default `window.location.host`. Must match the page the
     * user is looking at or wallets (and the server) will reject the signature.
     */
    siweDomain?: string;
    /** EIP-4361 `uri`. Default `window.location.origin`. */
    siweUri?: string;
    /** Optional statement shown in the wallet prompt. */
    siweStatement?: string;
    /** Override chain id. Default: the wallet's `eth_chainId`. */
    siweChainId?: number;
    /**
     * Call GET /auth/email-status before sending an email code so the UI can say
     * "sign in" vs "create your account". One extra request. Default false.
     */
    checkEmailStatus?: boolean;
    /**
     * Auto-fill the code from `dev_otp` when the server exposes it
     * (expose_dev_otp, local dev only). Default false.
     */
    devOtpAutofill?: boolean;
    /** Country code prefixed to phone numbers entered without one. Default "+1". */
    defaultCountryCode?: string;
    /** Extra headers on every SDK request. */
    headers?: Record<string, string>;
    /** Passed to fetch. Default "include" so the refresh cookie rides along. */
    credentials?: RequestCredentials;
    /** Override fetch (SSR, tests, instrumentation). */
    fetch?: typeof fetch;
    /**
     * Pass `configureService` from `@instruxi-io/hooks-shared` to point the
     * generated hook packages at this session — then every `useX()` in the host
     * app authenticates with no further wiring. The function is passed in rather
     * than imported so the SDK carries no dependency on the hooks packages.
     *
     *   import { configureService } from '@instruxi-io/hooks-shared'
     *   <EnforcerAuthProvider configureService={configureService} ... />
     */
    configureService?: ConfigureServiceFn;
    /**
     * Service keys to configure when `configureService` is supplied, e.g.
     * `['v3', 'files']`. Default `['v3']`. Set false to configure none.
     */
    configureHookServices?: string[] | false;
    /**
     * Base URLs for the services in `configureHookServices` when they differ
     * from `baseUrl`, keyed by service key.
     */
    hookServiceBaseUrls?: Record<string, string>;
    onSignIn?: (session: EnforcerSession) => void;
    onSignOut?: () => void;
    onError?: (error: unknown) => void;
}
//# sourceMappingURL=types.d.ts.map