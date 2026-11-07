export function confirmBytesHash(value: string | Uint8Array): string;
export function validateLV3ConfirmProof(proof: unknown): void;
export function validateLV3ConfirmAsset(bytes: Uint8Array, asset: {sha256:string}): void;
export function beforeLV3ConfirmText(text: string, proof: unknown): string;
