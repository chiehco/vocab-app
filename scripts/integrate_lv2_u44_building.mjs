import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {buildingHash,validateBuildingProof,beforeBuildingRegistry,beforeBuildingGallery} from './building_image_repair_guard.mjs';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8')),p=read('docs/unit-audit-20261105/LV2-U44-building-image-repair.json'),mode=process.argv.includes('--apply')?'apply':process.argv.includes('--revert')?'revert':'check';
validateBuildingProof(p);
const sha=b=>createHash('sha256').update(b).digest('hex'),up='src/features/vocabulary/lv1ReviewedImages.json';
for(const {path,sha256}of p.unchangedFiles)assert.equal(sha(fs.readFileSync(path)),sha256,'Unrecorded change: '+path);
assert.equal(sha(fs.readFileSync('public/'+p.before.illustration.path)),p.originalImageSha256);assert.equal(sha(fs.readFileSync('public/'+p.after.illustration.path)),p.replacementImageSha256);
let rows=read(up),raw=fs.readFileSync(p.gallery.path,'utf8').replace(/\r\n/g,'\n');
const rowState=buildingHash(rows)===p.publishedRegistryBeforeHash?'before':'after',galleryState=buildingHash(raw)===p.gallery.beforeNormalizedSha256?'before':'after';
assert.equal(rowState,galleryState,'Partial integration must be reconciled before writing');
if(rowState==='after'){beforeBuildingRegistry(rows,p);beforeBuildingGallery(raw,p);}
else{assert.equal(buildingHash(rows),p.publishedRegistryBeforeHash);assert.deepEqual(rows.find(r=>r.id===p.id),p.before);assert.equal(buildingHash(raw),p.gallery.beforeNormalizedSha256);}
if(mode==='check')assert.equal(rowState,'after','Exact repair is not applied');
else if(mode==='apply'&&rowState==='before'){
 rows=rows.map(r=>r.id===p.id?structuredClone(p.after):r);raw=raw.replace(p.gallery.beforeNeedle,p.gallery.afterNeedle);beforeBuildingRegistry(rows,p);beforeBuildingGallery(raw,p);
 fs.writeFileSync(up,JSON.stringify(rows,null,2)+'\n');fs.writeFileSync(p.gallery.path,raw);
}else if(mode==='revert'&&rowState==='after'){
 rows=beforeBuildingRegistry(rows,p);raw=beforeBuildingGallery(raw,p);fs.writeFileSync(up,JSON.stringify(rows,null,2)+'\n');fs.writeFileSync(p.gallery.path,raw);
}
console.log(JSON.stringify({mode,publishedRowsChanged:1,gallerySourcesChanged:1,generalRegistryWritten:false,formalDataWritten:false,oldAssetRetained:true}));
