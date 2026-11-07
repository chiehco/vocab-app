import {beforeLV3ConfirmText} from '../../../scripts/lv3_confirm_image_guard.mjs';
import confirmProof from '../../../docs/unit-audit-20261105/LV3-confirm-image-repair.json';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {beforeLV3ReplaceText} from '../../../scripts/lv3_replace_image_guard.mjs';
import proof from '../../../docs/unit-audit-20261105/LV3-replace-image-repair.json';
export function beforeReplaceImages<T>(rows:readonly T[]):T[]{
 const text=readFileSync(proof.registryPath,'utf8');
 const before=beforeLV3ReplaceText(beforeLV3ConfirmText(text,confirmProof),proof);
 assert.deepEqual(rows,JSON.parse(text),'Imported registry differs from verified disk bytes');
 return JSON.parse(before) as T[];
}
