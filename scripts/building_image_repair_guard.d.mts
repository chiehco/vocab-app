export function buildingHash(value:unknown):string;
export function validateBuildingProof(proof:unknown):void;
export function beforeBuildingRegistry<T extends {id:string}>(rows:T[],proof:unknown):T[];
export function beforeBuildingGallery(raw:string,proof:unknown):string;
