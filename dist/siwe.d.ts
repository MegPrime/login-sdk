/** Minimal EIP-1193 surface — MetaMask, Rabby, Coinbase Wallet, and happy-dom mocks. */
export interface Eip1193Provider {
    request(args: {
        method: string;
        params?: unknown;
    }): Promise<unknown>;
}
export interface SiweMessageFields {
    domain: string;
    address: string;
    uri: string;
    chainId: number;
    nonce: string;
    version?: string;
    issuedAt?: string;
    statement?: string;
}
/**
 * Builds an EIP-4361 (Sign-In with Ethereum) message. Kept tiny on purpose —
 * pulling `siwe` / viem just to concatenate these fields would be a runtime
 * dependency the rest of the SDK does not need.
 *
 * Matches `SiweMessage.prepareMessage()` from the official `siwe` package so
 * spruceid/siwe-go on the server accepts what the wallet signed.
 */
export declare function buildSiweMessage(fields: SiweMessageFields): string;
/** True for the wallet/SIWE method aliases the provider accepts. */
export declare function isWalletMethod(method: string): boolean;
export declare function normalizeHexAddress(address: string): string;
export declare function resolveWalletProvider(override?: Eip1193Provider | (() => Eip1193Provider | undefined | null)): Eip1193Provider | undefined;
export interface SignSiweInput {
    provider: Eip1193Provider;
    nonce: string;
    domain: string;
    uri: string;
    statement?: string;
    chainId?: number;
    issuedAt?: string;
    /** Skip `eth_requestAccounts` when the address is already known. */
    address?: string;
}
export interface SignSiweResult {
    address: string;
    message: string;
    signature: string;
    chainId: number;
}
/**
 * Asks an EIP-1193 wallet for an account, then `personal_sign`s the EIP-4361
 * message. No wagmi/viem — just `eth_requestAccounts` + `eth_chainId` +
 * `personal_sign`.
 */
export declare function requestWalletSignature(input: SignSiweInput): Promise<SignSiweResult>;
//# sourceMappingURL=siwe.d.ts.map