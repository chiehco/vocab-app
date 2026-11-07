import fs from 'node:fs';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {additionalHash,validateAdditionalProof,beforeAdditionalRegistry,beforeAdditionalGallery} from './additional_caption_guard.mjs';
const root=fileURLToPath(new URL('../',import.meta.url)),read=p=>fs.readFileSync(root+p,'utf8'),proof=JSON.parse(read('docs/unit-audit-20261105/LV1-U08-additional-caption-review.json')),c=proof.core;
validateAdditionalProof(proof);const rows=JSON.parse(read(c.registry.path)),raw=read(c.gallery.path).replace(/\r\n/g,'\n');
if(process.argv.includes('--check')){beforeAdditionalRegistry(rows,proof);beforeAdditionalGallery(raw,proof);console.log('Exact additional caption and unchanged history verified');}
else{
 assert(process.argv.includes('--apply'));assert.equal(additionalHash(rows),c.registry.beforeHash);assert.equal(additionalHash(raw),c.gallery.beforeNormalizedSha256);const i=rows.findIndex(r=>r.id===c.id);assert.deepEqual(rows[i],c.before);rows[i]=structuredClone(c.after);assert.equal(additionalHash(rows),c.registry.afterHash);assert.equal(raw.split(c.gallery.beforeArticle).length,2);const next=raw.replace(c.gallery.beforeArticle,c.gallery.afterArticle);assert.equal(additionalHash(next),c.gallery.afterNormalizedSha256);beforeAdditionalRegistry(rows,proof);beforeAdditionalGallery(next,proof);fs.writeFileSync(root+c.registry.path,JSON.stringify(rows,null,2)+'\n');fs.writeFileSync(root+c.gallery.path,next);console.log('Applied exactly one Chinese registry caption and its two gallery occurrences');
}
