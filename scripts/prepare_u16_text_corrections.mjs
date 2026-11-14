import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync,copyFileSync} from 'node:fs';
const path='src/features/direct/curriculumLV1Unit16.json',sourcePath='scripts/sources/LV1Unit16.json';
const unit=JSON.parse(readFileSync(path,'utf8')),source=JSON.parse(readFileSync(sourcePath,'utf8'));
const hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const patches=[];
function add(id,after,reason){const item=unit.learningItems.find(i=>i.learningItemId===id);assert.ok(item);const before=Object.fromEntries(Object.keys(after).map(k=>[k,item[k]]));assert.ok(Object.values(before).every(x=>x!==undefined));patches.push({id,before,after,sourcePage:item.sourcePage,reason});}
const supplements={39:'湖邊',40:'小湖',41:'乾淨地',43:'凌亂的；不潔的',45:'懶骨頭；懶鬼',49:'安全地',51:'不安全的',55:'使變甜',56:'糖醋肉',66:'鱈魚',77:'打字'};
for(const[n,meaning]of Object.entries(supplements))add('LI-LV1U16-V'+n.padStart(3,'0'),{targetMeaningZh:meaning,chapterMeaningsZh:meaning},'Actually read the printed Chinese on the matching original textbook page. Retain null official IDs, source-role/label, read_only, and unmapped_supplement (which also preserves the existing practice exclusion). Source verification does not fabricate a dictionary mapping.');
for(const[n,parts]of [[6,['tidy','tidied','tidied']],[16,['cap','capped','capped']],[25,['tie','tied','tied']],[33,['blow','blew','blown']],[43,['mistake','mistook','mistaken']],[49,['know','knew','known']]])add('LI-LV1U16-G'+String(n).padStart(3,'0'),{explanationZh:`動詞三態：原形 ${parts[0]}；過去式 ${parts[1]}；過去分詞 ${parts[2]}。`},'The original printed three forms were actually read. Replace only the empty explanation marker with a self-contained label; no running example or question is adopted.');
add('LI-LV1U16-G002',{pattern:"sb guesses that... = sb's guess is that...",explanationZh:'某人猜……（sb 表示 somebody，現在式用 guesses；其他主語須配合變化）'},'Preserve the literal printed pattern in the before record; correct the unspecified third-person singular placeholder in the curated display, without editing the source manifest.');
add('LI-LV1U16-G005',{pattern:'do things cleanly'},'Keep the exact printed singular thing in the source and before record; the general plural things is required in this curated count-noun construction.');
add('LI-LV1U16-G050',{pattern:'As sb knows, ...',explanationZh:'如某人所知，……（sb 表示 somebody，現在式用 knows；如 as we know 則用 know）'},'Correct the curated third-person singular construction while preserving the literal printed As sb know in the source and before record.');
add('LI-LV1U16-V068',{targetMeaningZh:'播種；散佈',chapterMeaningsZh:'播種；散佈'},'This existing v.-scoped dictionary supplement concerns sow /soʊ/; the printed p147 also explicitly labels sow vt. 播種. Preserve all homograph nouns in the general dictionary and keep this row marked existing_dictionary rather than claim an entire new textbook quotation.');
const manifest={unit:'LV1-U16',baseCheckpoint:'bb581cde64a311e2bfc95eadd4592e27f1db70cb',curriculumPath:path,sourcePath,sourceHash:hash(source),beforeHash:hash(unit),hashMethod:'SHA-256 of JSON.stringify(parsed object), with original property order',sourcePagesActuallyViewed:[142,143,144,145,146,147,148,149],sourceMeaningBoundary:'Unmapped supplements keep their original meaningSource to preserve existing practice exclusions; verified printed glosses do not imply a formal dictionary ID or publication.',patches};
assert.equal(unit.template.deliveryMode,'text_only');assert.equal(patches.length,21);
copyFileSync(path,'output/unit-audit-20261105/U16-curriculum-before.json');
writeFileSync('docs/unit-audit-20261105/LV1-U16-curriculum-patches.json',JSON.stringify(manifest,null,2)+'\n');
if(process.argv.includes('--apply')){
 for(const p of patches){const item=unit.learningItems.find(i=>i.learningItemId===p.id);for(const[k,v]of Object.entries(p.before))assert.deepEqual(item[k],v);Object.assign(item,p.after);}
 assert.equal(unit.template.deliveryMode,'text_only');assert.ok(unit.learningItems.every(i=>i.practiceMode==='read_only'&&!i.originalExample&&!i.illustration&&!i.officialSenseId));
 writeFileSync(path,JSON.stringify(unit,null,2)+'\n');
}
console.log(JSON.stringify({patches:patches.length,printedSupplements:11,formsExplanations:6,curatedPatternCorrections:3,scopedSow:1,applied:process.argv.includes('--apply')}));
