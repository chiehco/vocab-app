export function puppetBytesHash(value: string | Uint8Array): string;
export function validateLV3PuppetProof(proof: unknown): void;
export function validateLV3PuppetAsset(bytes: Uint8Array, asset: {sha256:string}): void;
export function beforeLV3PuppetText(text: string, proof: unknown): string;
