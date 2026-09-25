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
/** The public face of a tenant: what the sign-in card shows before anyone signs in. */
export interface EnforcerTenantBrand {
    name?: string;
    logo_url?: string;
}
/**
 * GET /auth/config → data. Tells the UI which scheme the tenant runs.
 *
 * Only `auth_provider` and `privy_app_id` are served today. The rest are read
 * when the server sends them, and each becomes the default for the matching
 * provider prop (a prop the integrator sets always wins).
 */
export interface EnforcerAuthConfig {
    /** "native" (email/phone/siwe/passkey) or "privy". OTP requires "native". */
    auth_provider?: string;
    privy_app_id?: string;
    /** Sign-in methods the tenant has enabled, e.g. `["email","phone"]`. */
    methods?: string[];
    /** Digits in the codes this server issues. */
    otp_length?: number;
    /** Name and logo for the signed-out card. */
    tenant?: EnforcerTenantBrand;
    /** "open" or "invite_only". Invite-only tenants refuse new addresses without an invite. */
    self_join_policy?: 'open' | 'invite_only' | (string & {});
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
    tenantCodeLabel?: string;
    /** Appended to the join-code label when the field is optional. */
    tenantCodeOptional?: string;
    tenantCodePlaceholder?: string;
    newAccountNotice?: string;
    /** Shown on the first step when the tenant is invite-only. */
    inviteOnlyNotice?: string;
    /**
     * Shown on the code step for an address with no account when the tenant may
     * be invite-only: the server then emails a "no access" notice instead of a code.
     */
    noCodeHint?: string;
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
    /**
     * Tenant join code, usually from build/env config so end users never type
     * one. When omitted, the SDK falls back to the `tenantCodeParam` URL
     * parameter, then the code remembered from this browser's last sign-in,
     * then the instance's default tenant.
     */
    tenantCode?: string;
    /**
     * URL query parameter that carries a tenant code, so a link like
     * `https://app.example.com/?tenant=K7M2-Q9XW` signs people into that tenant.
     * Default "tenant". Set false to ignore the URL.
     */
    tenantCodeParam?: string | false;
    /**
     * The join-code field on `<SignIn />`, shown only when the code did not come
     * from the `tenantCode` prop or a link — so embedding the code in config
     * (e.g. a Vite variable) hides it, and leaving it out lets users type one.
     * A remembered code pre-fills it.
     *
     * "optional": blank signs into the instance's default tenant. "required":
     * Continue stays disabled until a code is typed. false: never shown.
     * Default "optional".
     */
    tenantCodeInput?: 'optional' | 'required' | false;
    /**
     * Remember the tenant code (and the tenant's name and logo) after sign-in, so
     * a returning user lands in the same workspace with its branding. Codes that
     * came from a link or the join-code field are saved — a `tenantCode` prop is
     * already known. Default true.
     */
    rememberTenant?: boolean;
    /**
     * Methods to offer, in tab order. Default: what the tenant has enabled in
     * `/auth/config`, else `['email']`. `'siwe'` and `'wallet'` are the same
     * Sign-In with Ethereum flow.
     */
    methods?: AuthMethod[];
    /** Digits in the OTP. Default: the server's `otp_length`, else 6. */
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