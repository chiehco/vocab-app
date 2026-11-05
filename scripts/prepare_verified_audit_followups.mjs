import {readFileSync,writeFileSync} from 'node:fs';
const read=p=>JSON.parse(readFileSync(p,'utf8')),write=(p,x)=>writeFileSync(p,JSON.stringify(x,null,2)+'\n');
const root='docs/unit-audit-20261105/',baseCommit='29cfc684d7a11b07f09988c478d30358830f1951';
const sources=read(root+'LV1-U08-precise-hint-sources.json'),examples=read('public/data/v1/examples.json'),words=read('public/data/v1/words.json');
const alreadyPrecise=new Set(['EX0282b9db','EXa6e2171a','EXd96728e7']),skipped=[],hints=[];
for(const c of sources.candidates){const r=examples.find(e=>e.exampleId===c.exampleId);if(!r)throw Error('Missing example '+c.exampleId);
 for(const k of ['word','sentenceEn','sentenceZh','blankSentence','answer'])if(r[k]!==c[k])throw Error('Source drift '+c.exampleId+':'+k);
 if(alreadyPrecise.has(c.exampleId)){skipped.push({exampleId:c.exampleId,reason:'Already contextually narrowed in the later U09 audit; preserve that newer precise value.',currentHint:r.meaningHint,proposedEquivalent:c.after.meaningHint});continue;}
 if(r.meaningHint!==c.before.meaningHint)throw Error('Unexpected hint drift '+c.exampleId);
 hints.push({dataset:'examples',key:'exampleId',id:c.exampleId,before:c.before,after:c.after,classification:c.classification,reason:'Match the hint to the actual unchanged cloze target in this particular sentence. '+c.classification,evidence:c.evidence.join(' ; ')});
}
write(root+'LV1-U08-hints-followup.json',{baseCommit,scope:'Only contextual meaningHint; no sentence, answer, cloze, POS, identity or null-hint filling.',counts:{candidates:120,applied:hints.length,alreadyHandledInU09:skipped.length,originalMissingOrIncompatible:33,originalOverbroad:87,intentionallyBlankUntouched:129},skipped,retainedLimitations:sources.retainedLimitations,patches:hints});
const translationFacts=[
 ['EX50693488','The girl died from head injuries.','這女孩死於腦部創傷。','這女孩死於頭部傷勢。','Head injuries do not necessarily mean brain injuries.','https://www.merriam-webster.com/dictionary/head ; https://www.merriam-webster.com/dictionary/injury'],
 ['EXddc4d110','She needs additional time to finish her science project this weekend.','她這個週末需要額外的時間才能完成科展作品。','她這個週末需要額外的時間才能完成她的科學專題。','Science project does not specify participation in a science fair.','https://www.merriam-webster.com/dictionary/project'],
 ['EX66703666','She worked hard for ten years to realize her dream of opening a bakery.','她努力了十年，終於實現了開一家麵包店的夢想。','為了實現開一家麵包店的夢想，她努力了十年。','The purpose infinitive does not independently assert that the goal was achieved.','https://dictionary.cambridge.org/grammar/british-grammar/in-order-to ; https://learnenglish.britishcouncil.org/free-resources/grammar/english-grammar-reference/infinitives'],
 ['EX1f033d08','The new model is far better than the old one.','新型號比起舊的還要好。','新型號比舊型號好得多。','Far before the comparative explicitly indicates a large degree.','https://www.merriam-webster.com/dictionary/far'],
 ['EX51e703b4',"This shirt isn't big enough for him anymore.",'這件襯衫對他來說已經不夠大了。','這件上衣對他來說已經不夠大了。','Shirt includes the round-neck T-shirt actually shown; remove the unsupported collared-shirt specificity.','https://www.merriam-webster.com/dictionary/shirt ; https://dictionary.cambridge.org/dictionary/english/t-shirt']
];
write(root+'VERIFIED-TRANSLATION-SOURCES.json',{scope:'Exactly five Chinese-only corrections; each original English sentence is an immutable write guard.',facts:translationFacts.map(([exampleId,sentenceEn,before,after,reason,evidence])=>({exampleId,sentenceEn,before,after,reason,evidence}))});
const translations=translationFacts.map(([id,sentenceEn,before,after,reason,evidence])=>{const r=examples.find(e=>e.exampleId===id);if(r?.sentenceEn!==sentenceEn||r?.sentenceZh!==before)throw Error('Translation source drift '+id);return{dataset:'examples',key:'exampleId',id,before:{sentenceEn,sentenceZh:before},after:{sentenceZh:after},reason,evidence};});
write(root+'LV1-verified-translations-followup.json',{baseCommit,scope:'Only the Chinese wording of these five exact sentences. English, cloze, answer, POS, status and all other rows remain unchanged.',patches:translations});
const facts=read(root+'VERIFIED-VERB-FORMS-SOURCES.json').facts,forms=[];
for(const f of facts){const r=words.find(w=>w.wordId===f.wordId);if(!r||r.word!==f.word||!r.pos.includes('v.'))throw Error('Verb identity/POS drift '+f.wordId);if(Object.hasOwn(r,'verbForms')){if(JSON.stringify(r.verbForms)!==JSON.stringify(f.verbForms))throw Error('Existing principal parts differ '+f.wordId);continue;}
 forms.push({dataset:'words',key:'wordId',id:f.wordId,before:{verbForms:{$absent:true}},after:{verbForms:f.verbForms},reason:'Fill only independently verified past and past-participle fields. '+f.restriction,evidence:f.evidence.url+' ; '+f.evidence.scope});}
write(root+'LV1-U01-U02-verb-forms-followup.json',{baseCommit,scope:'Exactly 31 source-verified existing verbs. Missing-key sentinel restores true absence, not null. No headword POS, status, meaning, sense or example changes.',patches:forms});
console.log(JSON.stringify({hints:hints.length,skipped:skipped.length,translations:translations.length,verbForms:forms.length}));
