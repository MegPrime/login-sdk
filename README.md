# @instruxi-io/enforcer-login-sdk

Drop-in sign-in UI for enforcer-v3 — a Clerk/Privy-style widget your developers
mount in two components. Email and phone OTP, session persistence, silent token
refresh, and a fully headless mode when the default UI isn't enough.

Zero runtime dependencies. React is the only peer.

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
npm install github:MegPrime/login-sdk#v0.1.0
```

No registry account or token is needed. The package installs as
`@instruxi-io/enforcer-login-sdk`, so imports are as shown above. The public
repo holds only the built distribution; the source lives in
`instruxi-io/enforcer-login-sdk`.

## How the flow works

1. `POST /auth/otp/request` (email) or `POST /auth/sms/request` (phone) sends a
   6-digit code, valid 10 minutes.
2. `POST /auth/login` with `{provider, email|phone, otp, tenant_code}` exchanges
   the code for `{token, refresh_token, expires_at, account, is_new_account}`.
3. The session is persisted and the access token is refreshed via
   `POST /auth/refresh` shortly before `expires_at`.
4. `signOut()` calls `POST /auth/logout`, revoking the refresh-token family.

On mount the provider also calls `GET /auth/config` to learn the tenant's
scheme. If the tenant runs Privy rather than native auth, the widget says so up
front instead of failing at submit with a 403 `wrong_auth_scheme`.

## Configuration

Everything enforcer-v3 exposes for these flows is a prop on the provider.

| Prop | Default | What it does |
| --- | --- | --- |
| `baseUrl` | — | **Required.** API origin, e.g. `https://api.example.com` |
| `basePath` | `/api/v1/enforcer` | Mount path from the OpenAPI spec. `""` for root |
| `tenantCode` | instance default | Tenant join code; scopes every call |
| `methods` | `['email']` | `['email','phone']` — also the tab order |
| `otpLength` | `6` | Digits in the code |
| `resendCooldownSeconds` | `30` | Server allows 10 credential requests/min per IP |
| `refreshSkewSeconds` | `60` | Refresh this long before the token expires |
| `storage` | `'local'` | `'local' \| 'session' \| 'memory'` or your own adapter |
| `storageKey` | `'enforcer.session'` | Where the session is kept |
| `bootstrapAuthConfig` | `true` | Call `GET /auth/config` on mount |
| `checkEmailStatus` | `false` | `GET /auth/email-status` for "sign in" vs "create account" copy |
| `devOtpAutofill` | `false` | Auto-fill from `dev_otp` (servers with `expose_dev_otp`) |
| `defaultCountryCode` | `'+1'` | Applied to phone numbers typed without one |
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
// canSubmitIdentifier, canSubmitCode, isSending, isVerifying,
// sendCode(), resendCode(), verifyCode(), editIdentifier(), reset()
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
`invalid_refresh_token`, `refresh_raced`, plus `network_error` from the client.

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
```
