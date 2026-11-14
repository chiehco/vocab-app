import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
const read=p=>JSON.parse(readFileSync(p,'utf8'));
const words=read('public/data/v1/words.json'),selection=read('output/unit-audit-20261105/U16-form-source-selection.json');
const ids='W000367 W000170 W000891 W000448 W000140 W000380 W000745 W000892 W000729 W000098 W000660 W000737 W000545 W000463 W000940 W000926 W001437 W002486 W000739 W000653 W003767 W004820 W000522 W001012 W001825'.split(' ');
assert.equal(selection.length,25);assert.equal(new Set(selection.map(e=>e.wordId)).size,25);assert.deepEqual(new Set(selection.map(e=>e.wordId)),new Set(ids));
const facts=selection.map(e=>{
 const row=words.find(w=>w.wordId===e.wordId);assert.ok(row);assert.equal(row.word,e.word);assert.ok(row.pos.includes('v.'));assert.ok(!Object.hasOwn(row,'verbForms'));
 assert.equal(e.researchStatus,'verified_candidate');assert.ok(e.proposedVerbForms?.base===row.word);assert.ok(e.evidence.length);
 return {wordId:e.wordId,word:e.word,verbForms:{...e.proposedVerbForms,status:'approved'},evidence:e.evidence,applicableSense:e.applicableSense,restriction:e.homographAndVariantRestrictions,variantAssessment:e.variantAssessment,researchFile:e.sourceFile.split('/').at(-1),verification:'Exact current key absence, formal headword/verb POS, explicit past and past participle evidence checked; variant limits retained. No whole-word approval.'};
});
writeFileSync('docs/unit-audit-20261105/VERIFIED-U16-VERB-FORMS-SOURCES.json',JSON.stringify({baseCheckpoint:'bb581cde64a311e2bfc95eadd4592e27f1db70cb',researchCommit:'44441f21cf132b8da0a3ae7be0f814a7f1d22484',scope:'Only these 25 U16 missing fields; original 31, separate 16, house and all other data retained. leap uses leaped without denying leapt; Scottish obsolete luppen is excluded. sow forms apply only to the verb /soʊ/.',facts},null,2)+'\n');
const patches=facts.map(f=>({dataset:'words',key:'wordId',id:f.wordId,before:{verbForms:{$absent:true}},after:{verbForms:f.verbForms},reason:'Add only individually sourced principal parts to this genuinely absent key; preserve headword POS, whole-word status, senses and every example. Restore by deleting the key, never by writing null.',evidence:f.evidence.map(e=>e.url).join(' ; ')}));
writeFileSync('docs/unit-audit-20261105/LV1-U16-verified-forms-patches.json',JSON.stringify({baseCommit:'29cfc684d7a11b07f09988c478d30358830f1951',unit:'LV1-U16',patches},null,2)+'\n');
console.log(JSON.stringify({facts:facts.length,patches:patches.length}));
