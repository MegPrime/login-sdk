import { EnforcerAuthError } from './errors.js';
/**
 * Builds an EIP-4361 (Sign-In with Ethereum) message. Kept tiny on purpose —
 * pulling `siwe` / viem just to concatenate these fields would be a runtime
 * dependency the rest of the SDK does not need.
 *
 * Matches `SiweMessage.prepareMessage()` from the official `siwe` package so
 * spruceid/siwe-go on the server accepts what the wallet signed.
 */
export function buildSiweMessage(fields) {
    const version = fields.version ?? '1';
    const issuedAt = fields.issuedAt ?? new Date().toISOString();
    const header = `${fields.domain} wants you to sign in with your Ethereum account:`;
    const prefix = fields.statement
        ? `${header}\n${fields.address}\n\n${fields.statement}`
        : `${header}\n${fields.address}`;
    const suffix = [
        `URI: ${fields.uri}`,
        `Version: ${version}`,
        `Chain ID: ${fields.chainId}`,
        `Nonce: ${fields.nonce}`,
        `Issued At: ${issuedAt}`,
    ].join('\n');
    return `${prefix}\n\n${suffix}`;
}
/** True for the wallet/SIWE method aliases the provider accepts. */
export function isWalletMethod(method) {
    return method === 'siwe' || method === 'wallet';
}
export function normalizeHexAddress(address) {
    const trimmed = address.trim();
    if (!trimmed)
        return '';
    return trimmed.startsWith('0x') || trimmed.startsWith('0X') ? `0x${trimmed.slice(2)}` : `0x${trimmed}`;
}
function utf8ToHex(value) {
    const bytes = new TextEncoder().encode(value);
    let hex = '0x';
    for (const b of bytes)
        hex += b.toString(16).padStart(2, '0');
    return hex;
}
function parseChainId(value) {
    if (typeof value === 'number' && Number.isFinite(value))
        return value;
    const raw = String(value ?? '');
    if (!raw)
        return 1;
    if (raw.startsWith('0x') || raw.startsWith('0X')) {
        const n = Number.parseInt(raw, 16);
        return Number.isFinite(n) ? n : 1;
    }
    const n = Number.parseInt(raw, 10);
    return Number.isFinite(n) ? n : 1;
}
function isUserRejection(error) {
    if (!error || typeof error !== 'object') {
        return typeof error === 'string' && /reject|denied|cancel/i.test(error);
    }
    const e = error;
    if (e.code === 4001 || e.code === '4001' || e.code === 'ACTION_REJECTED')
        return true;
    return typeof e.message === 'string' && /reject|denied|cancel/i.test(e.message);
}
export function resolveWalletProvider(override) {
    if (typeof override === 'function')
        return override() ?? undefined;
    if (override)
        return override;
    if (typeof window === 'undefined')
        return undefined;
    return window.ethereum;
}
/**
 * Asks an EIP-1193 wallet for an account, then `personal_sign`s the EIP-4361
 * message. No wagmi/viem — just `eth_requestAccounts` + `eth_chainId` +
 * `personal_sign`.
 */
export async function requestWalletSignature(input) {
    const { provider } = input;
    let address = input.address ? normalizeHexAddress(input.address) : '';
    if (!address) {
        let accounts;
        try {
            accounts = await provider.request({ method: 'eth_requestAccounts' });
        }
        catch (error) {
            if (isUserRejection(error)) {
                throw new EnforcerAuthError(0, 'wallet_rejected', 'User rejected the wallet request', error);
            }
            throw new EnforcerAuthError(0, 'wallet_unavailable', String(error), error);
        }
        address = Array.isArray(accounts) ? normalizeHexAddress(String(accounts[0] ?? '')) : '';
    }
    if (!address) {
        throw new EnforcerAuthError(0, 'wallet_unavailable', 'Wallet returned no account');
    }
    let chainId = input.chainId;
    if (chainId == null) {
        try {
            chainId = parseChainId(await provider.request({ method: 'eth_chainId' }));
        }
        catch {
            chainId = 1;
        }
    }
    const message = buildSiweMessage({
        domain: input.domain,
        address,
        uri: input.uri,
        chainId,
        nonce: input.nonce,
        statement: input.statement,
        issuedAt: input.issuedAt,
    });
    const hexMessage = utf8ToHex(message);
    let signature;
    try {
        try {
            // EIP-1193 / MetaMask: [data, address]. Hex so the wallet shows UTF-8, not garbage.
            signature = await provider.request({
                method: 'personal_sign',
                params: [hexMessage, address],
            });
        }
        catch (hexError) {
            if (isUserRejection(hexError))
                throw hexError;
            // Some injected providers only accept the raw UTF-8 string.
            signature = await provider.request({
                method: 'personal_sign',
                params: [message, address],
            });
        }
    }
    catch (error) {
        if (isUserRejection(error)) {
            throw new EnforcerAuthError(0, 'wallet_rejected', 'User rejected the signature request', error);
        }
        throw new EnforcerAuthError(0, 'auth_error', String(error), error);
    }
    const sig = typeof signature === 'string' ? signature : '';
    if (!sig) {
        throw new EnforcerAuthError(0, 'auth_error', 'Wallet returned an empty signature');
    }
    return { address, message, signature: sig, chainId };
}
//# sourceMappingURL=siwe.js.map