# @instruxi-io/enforcer-login-sdk

Drop-in sign-in UI for enforcer-v3 — a Clerk/Privy-style widget your developers
mount in two components. Email and phone OTP, native Sign-In with Ethereum
(SIWE / wallet), session persistence, silent token refresh, and a fully
headless mode when the default UI isn't enough.

Zero runtime dependencies. React is the only peer. SIWE talks to
`window.ethereum` (EIP-1193) directly — no wagmi or viem.

```tsx
import { EnforcerAuthProvider, SignIn, SignedIn, SignedOut } from '@instruxi-io/enforcer-login-sdk'

export default function App() {
  return (
    <EnforcerAuthProvider baseUrl="https://api.example.com">
      <SignedOut><SignIn /></SignedOut>
      <SignedIn><Dashboard /></SignedIn>
    </EnforcerAuthProvider>
  )
}
```

That is the whole integration. The widget ships its own styles (injected once,
all selectors prefixed `.esdk-`), adapts to light and dark, and needs no CSS
import.

## Install

```bash
npm install github:MegPrime/login-sdk#v0.2.0
```

No registry account or token is needed. The package installs as
`@instruxi-io/enforcer-login-sdk`, so imports are as shown above. The public
repo holds only the built distribution; the source lives in
`instruxi-io/enforcer-login-sdk`.

## How the flow works

**Email / phone OTP**

1. `POST /auth/otp/request` (email) or `POST /auth/sms/request` (phone) sends a
   6-digit code, valid 10 minutes.
2. `POST /auth/login` with `{provider, email|phone, otp, tenant_code}` exchanges
   the code for `{token, refresh_token, expires_at, account, is_new_account}`.

**SIWE (wallet)**

1. The widget calls `eth_requestAccounts` on the injected EIP-1193 provider
   (`window.ethereum`, or `walletProvider` if you pass one).
2. `POST /auth/siwe/nonce` with `{wallet_address, tenant_code?}` returns a
   one-time `{nonce}` (top-level; not wrapped in `data`).
3. The wallet `personal_sign`s an EIP-4361 message bound to that nonce,
   `window.location.host`, and the wallet's `eth_chainId`.
4. `POST /auth/login` with `{provider: 'siwe', message, signature, tenant_code?}`
   returns the same session shape as OTP.

After either path, the session is persisted and the access token is refreshed
via `POST /auth/refresh` shortly before `expires_at`. `signOut()` calls
`POST /auth/logout`, revoking the refresh-token family.

On mount the provider also calls `GET /auth/config` to learn the tenant's
scheme. If the tenant runs Privy rather than native auth, the widget says so up
front instead of failing at submit with a 403 `wrong_auth_scheme`. SIWE is a
native method — it is available when `auth_provider` is `"native"` (or when
config bootstrap is off) **and** `methods` includes `'siwe'` or `'wallet'`.

## Configuration

Everything enforcer-v3 exposes for these flows is a prop on the provider.

| Prop | Default | What it does |
| --- | --- | --- |
| `baseUrl` | — | **Required.** API origin, e.g. `https://api.example.com` |
| `basePath` | `/api/v1/enforcer` | Mount path from the OpenAPI spec. `""` for root |
| `tenantCode` | see [tenant codes](#tenant-codes) | Tenant join code; scopes every call |
| `tenantCodeInput` | `'optional'` | Join-code field when no code is configured: `'optional' \| 'required' \| false` |
| `tenantCodeParam` | `'tenant'` | URL parameter that carries a tenant code. `false` to ignore the URL |
| `rememberTenant` | `true` | Remember the tenant code and branding after sign-in |
| `methods` | tenant config, else `['email']` | Tab order. `'email'`, `'phone'`, `'siwe'` / `'wallet'` |
| `otpLength` | tenant config, else `6` | Digits in the code |
| `resendCooldownSeconds` | `30` | Server allows 10 credential requests/min per IP |
| `refreshSkewSeconds` | `60` | Refresh this long before the token expires |
| `storage` | `'local'` | `'local' \| 'session' \| 'memory'` or your own adapter |
| `storageKey` | `'enforcer.session'` | Where the session is kept |
| `bootstrapAuthConfig` | `true` | Call `GET /auth/config` on mount |
| `checkEmailStatus` | `false` | `GET /auth/email-status` for "sign in" vs "create account" copy |
| `devOtpAutofill` | `false` | Auto-fill from `dev_otp` (servers with `expose_dev_otp`) |
| `defaultCountryCode` | `'+1'` | Applied to phone numbers typed without one |
| `walletProvider` | `window.ethereum` | EIP-1193 wallet; pass a mock in tests |
| `siweDomain` / `siweUri` | page host / origin | EIP-4361 domain and URI |
| `siweStatement` | `'Sign in with Ethereum.'` | Shown in the wallet prompt |
| `siweChainId` | wallet `eth_chainId` | Override the signed chain id |
| `headers` / `credentials` / `fetch` | — | Passed through to every request |
| `configureService` | — | See [wiring the hook packages](#wiring-the-hook-packages) |
| `onSignIn` / `onSignOut` / `onError` | — | Callbacks |

`<SignIn />` takes `appearance`, `labels`, `header`, `footer`, `autoSubmit`, and
`signedInFallback`.

```tsx
<SignIn
  appearance={{ theme: 'dark', accent: '#aa3bff', radius: '18px', brandName: 'Acme' }}
  labels={{ title: 'Welcome back', continueButton: 'Send my code' }}
  footer={<a href="/terms">Terms</a>}
/>
```

`appearance` maps onto `--esdk-*` custom properties. For finer control pass
`variables` (any `--esdk-*` override) or set `injectStyles: false` and style
`.esdk-*` yourself.

Wallet-only tenants (SIWE-native, no email OTP) pass `methods={['siwe']}`. The
join-code field and the [tenant codes](#tenant-codes) order apply to wallet
sign-in too:

```tsx
<EnforcerAuthProvider
  baseUrl="https://api.example.com"
  methods={['siwe']}
  // tenantCode={process.env.ENFORCER_TENANT_CODE}  // only if you have one
>
  <SignedOut><SignIn /></SignedOut>
  <SignedIn><Dashboard /></SignedIn>
</EnforcerAuthProvider>
```

Email + wallet together:

```tsx
<EnforcerAuthProvider baseUrl={baseUrl} methods={['email', 'siwe']}>
  <SignIn />
</EnforcerAuthProvider>
```

`'wallet'` is accepted as an alias of `'siwe'`. With no `methods` prop and no
tenant config, `methods` stays `['email']`, so existing OTP integrations do not
grow a wallet tab.

## Tenant codes

Embed the join code in config the way you would a Privy app ID, and users never
see it:

```tsx
<EnforcerAuthProvider baseUrl={apiUrl} tenantCode={import.meta.env.VITE_ENFORCER_TENANT_CODE}>
```

Leave it out and `<SignIn />` shows a **Join code** field under the email/phone
input. The SDK uses the first of these it finds:

1. **The `tenantCode` prop.** The field is hidden.
2. **A link.** `https://app.example.com/?tenant=K7M2-Q9XW` signs people into
   that tenant, and the field is hidden. Rename the parameter with
   `tenantCodeParam`.
3. **What the user typed into the field.**
4. **This browser's last sign-in.** It pre-fills the field. A code from a link
   or the field is saved when sign-in succeeds. A prop-supplied code is never
   written.
5. **The instance's default tenant.** This is what a blank field means.

`tenantCodeInput` controls the field: `'optional'` (the default, where blank
means the default tenant), `'required'` (Continue stays disabled until a code
is typed) or `false` (never shown). Codes are matched exactly and
case-sensitively by the server, so the field only trims whitespace. Headless
flows get `showTenantCode`, `tenantCodeRequired`, `tenantCode` and
`setTenantCode` from `useSignInFlow()`.

If a remembered code's tenant no longer exists, the SDK forgets the code and
falls back to the default. `useEnforcerAuth()` exposes `tenantCode`, `tenantCodeSource`,
`setTenantCode()` and `forgetTenantCode()`.

On an `open` tenant the join code is the credential: anyone holding it can
join, so a code shipped in a public bundle is effectively public. On an
`invite_only` tenant the code alone admits nobody.

### Tenant-driven defaults

When `GET /auth/config` returns them, these become the defaults. A prop you set
always wins.

| Field | Drives |
| --- | --- |
| `methods` | The method tabs (methods the SDK can't show yet, such as `passkey`, are ignored) |
| `otp_length` | Digits in the code field |
| `tenant` `{name, logo_url}` | The logo and name on the signed-out card |
| `self_join_policy` | An "invite-only" notice before a code is sent |

enforcer-v3 serves these from `/auth/config` (instruxi-io/enforcer-v3#414).
Against an older server, the signed-out card is branded from the tenant cached
at this browser's last sign-in (or from `appearance.logoUrl` / `brandName`).

With `checkEmailStatus` on, an address with no account sees the "didn't get a
code? ask an admin to invite you" hint, unless the tenant is known to be `open`.
That's because an invite-only tenant emails such an address a "no access" notice
instead of a code, and still answers 200.

## Reading the session

```tsx
const { status, account, accessToken, isNewAccount, signOut, refresh } = useEnforcerAuth()
```

`status` is `'loading' | 'authenticated' | 'unauthenticated'`. `<SignedIn>`,
`<SignedOut>`, `<AuthLoading>` and `<Protect fallback={<SignIn />}>` wrap the
same state.

## Wiring the hook packages

The generated `@instruxi-io/*-hooks` packages authenticate through a `getToken()`
callback invoked per request, outside React. The SDK mirrors the live token to a
module-level accessor for exactly this:

```ts
import { configureService } from '@instruxi-io/hooks-shared'
import { getAccessToken } from '@instruxi-io/enforcer-login-sdk'

configureService('v3', { baseUrl, getToken: getAccessToken })
```

Or hand `configureService` to the provider and let it wire the services for you:

```tsx
<EnforcerAuthProvider
  baseUrl={baseUrl}
  configureService={configureService}
  configureHookServices={['v3', 'files']}
>
```

The function is passed in rather than imported, so this SDK never depends on the
hooks packages.

## Headless

`useSignInFlow()` is the entire state machine with no markup — `<SignIn />` is
just one consumer of it.

```tsx
const flow = useSignInFlow()
// step, method, identifier, code, sentTo, error, resendIn,
// canSubmitIdentifier, canSubmitCode, isSending, isVerifying, isConnecting,
// walletAvailable, connectedAddress,
// sendCode(), resendCode(), verifyCode(), signInWithWallet(),
// editIdentifier(), reset()
```

For a custom layout that keeps the built-in card chrome, pass a render prop
instead: `<SignIn>{(flow) => <YourForm {...flow} />}</SignIn>`.

## Errors

Everything rejects with a typed `EnforcerAuthError` carrying `code`, `status`,
`detail`, plus `retryable` and `needsNewCode`. `.message` is user-facing copy;
`.detail` is the server's raw text.

```tsx
if (isEnforcerAuthError(e) && e.code === 'rate_limited') { /* back off */ }
```

Codes the auth surface emits: `invalid_otp`, `rate_limited`, `tenant_not_found`,
`registration_rejected`, `account_inactive`, `account_deleted`,
`wrong_auth_scheme`, `unsupported_provider`, `email_taken`,
`invalid_refresh_token`, `refresh_raced`, `wallet_unavailable`,
`wallet_rejected`, plus `network_error` from the client.

## Status of phone OTP

The phone flow is implemented and matches the API contract, but **it cannot
complete against enforcer-v3 today**. `validateLoginRequest` in
`internal/delivery/http/handler/auth.go` special-cases `email_otp` and `siwe`
and then falls through to requiring `token`, so a `phone_otp` login is rejected
before it reaches the provider:

```
POST /auth/login {"provider":"phone_otp","phone":"+1...","otp":"123456"}
→ 400 {"error":"missing_fields","message":"token is required"}
```

The `phoneotp` provider itself is complete. The server-side fix is to add a
`phone_otp` branch alongside the `email_otp` one:

```go
if req.Provider == identity.ProviderPhoneOTP {
    if req.Phone == "" || req.Code == "" {
        return errors.New("phone and otp are required")
    }
    return nil
}
```

Sending the code (`POST /auth/sms/request`) additionally needs a Twilio Verify
connection on the tenant. Until both are in place, keep `methods={['email']}`.

## Build

```bash
bun install
bun run build      # tsc → dist (ESM + .d.ts)
bun run typecheck
bun test
```

## Public distribution

Source stays in this private repo. Consumers install the built tree from
`MegPrime/login-sdk`. Cut a public tag **from `master` after this change is
merged** — do not publish `v0.2.0` from an unmerged PR branch:

```bash
# on master, after merge, working tree clean
# README install line must already reference github:MegPrime/login-sdk#v0.2.0
bun run release:dist
```

`DRY_RUN=1 bun run release:dist` builds, tests, and stages the tarball without
pushing. The script refuses a dirty tree and refuses to ship if README does not
mention the tag being released.
