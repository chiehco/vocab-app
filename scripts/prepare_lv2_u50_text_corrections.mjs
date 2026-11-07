import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8')),hash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const manifest=read('docs/unit-audit-20261105/LV2-U50-curriculum-patches.json'),unit=read(manifest.curriculumPath),source=read(manifest.sourcePath);
assert.equal(hash(source),manifest.sourceHash);assert.equal(hash(unit),manifest.beforeHash,'Only the exact before snapshot may be changed');
for(const p of manifest.patches){const row=unit.learningItems.find(i=>i.learningItemId===p.id);assert(row);assert.equal(row.sourcePage,p.sourcePage);for(const[k,v]of Object.entries(p.before))assert.deepEqual(row[k],v);Object.assign(row,p.after);}
assert.equal(hash(unit),manifest.afterHash);assert.equal(unit.template.deliveryMode,'text_only');assert(unit.learningItems.every(i=>i.practiceMode==='read_only'&&!i.illustration&&!i.originalExample&&!i.officialSenseId));
if(process.argv.includes('--apply'))fs.writeFileSync(manifest.curriculumPath,JSON.stringify(unit,null,2)+'\n');
console.log(JSON.stringify({rows:manifest.patches.length,fields:manifest.patches.reduce((n,p)=>n+Object.keys(p.after).length,0),applied:process.argv.includes('--apply')}));
