export function replaceBytesHash(value: string | Uint8Array): string;
export function validateLV3ReplaceProof(proof: unknown): void;
export function validateLV3ReplaceAsset(bytes: Uint8Array, asset: {sha256:string}): void;
export function beforeLV3ReplaceText(text: string, proof: unknown): string;
