import {readFileSync,writeFileSync} from 'node:fs';
const read=p=>JSON.parse(readFileSync(p,'utf8'));
const source=read('output/unit-audit-20261105/LV1-U06-full-source.json');
const datasets={examples:read('public/data/v1/examples.json'),senses:read('public/data/v1/senses.json'),words:read('public/data/v1/words.json')};
const patches=[];const url=w=>'https://www.merriam-webster.com/dictionary/'+w;
function add(dataset,key,id,after,reason,evidence){
 const row=datasets[dataset].find(r=>r[key]===id);if(!row)throw Error('Unknown identity '+id);
 const before=Object.fromEntries(Object.keys(after).map(k=>[k,row[k]]));if(Object.values(before).some(v=>v===undefined))throw Error('Missing old field '+id);
 patches.push({dataset,key,id,before,after,reason,evidence});
}
// Per-word defaults are used only for this explicitly read set of sentences;
// the listed exceptions preserve noun, adjective, pronoun and adverb uses.
const decisions=[
 ['most','adj.',{'EX67451744':'adv.','EX6e268e15':'pron.','EXfd9a5383':'adv.'}],
 ['least','adv.',{'EXbe785d68':'adj.'}],
 ['front','n.',{'EX26c91f63':'adj.'}],
 ['back','adv.',{'EX0ffa6627':'v.','EX4fa80fe9':'n.','EX62359512':'n.','EX96b2b541':'n.','EXe5a6be7d':'adj.'}],
 ['show','v.',{'EX15e884ca':'n.','EX2e5c45e9':'n.'}],
 ['call','v.',{'EX888a9db4':'n.','EX9bdd46c2':'n.'}],
 ['leave','v.',{'EX9fdb726b':'n.'}],['school','n.',{'EXaaeb34cf':'v.'}],
 ['course','n.',{'EXacbe3fc9':'v.'}],['while','conj.',{'EX8de93d43':'n.','EX937e184c':'v.'}],
 ['part','n.',{'EX0f650d50':'v.'}],['end','n.',{'EX028e0a65':'v.','EX18c56a7b':'v.','EXd2cfe13d':'v.'}],
 ['start','v.',{'EX099a0f96':'n.'}],['feel','v.',{'EX81b84686':'n.','EXd6d9fbe8':'n.'}],
 ['number','n.',{'EXd57854e7':'v.'}],['turn','v.',{'EX644a9a9c':'n.','EXc5140a7b':'n.'}],
 ['question','n.',{'EX14e8e5f4':'v.','EX9691f938':'v.'}],['hold','v.',{'EXbfb0c2d0':'n.'}],
 ['keep','v.',{'EXd8b1f2ac':'n.'}],['group','n.',{'EXb039225d':'v.'}],
 ['case','n.',{'EX46f46c4e':'v.'}],['point','n.',{'EX5e396662':'v.','EX89092225':'v.','EXaf51a469':'v.'}],
 ['line','n.',{'EX6980768e':'v.','EX9fd00ef0':'v.'}],['try','v.',{'EX5910cd4b':'n.','EX5bced7ff':'n.'}],
 ['water','v.',{'EX6583aa71':'n.','EXc189e8e8':'n.'}],['attempt','n.',{'EX0002ce3e':'v.'}],['movement','n.',{}]
];
const hints={'EX4fa80fe9':'背部','EX2e5c45e9':'節目','EXc5140a7b':'輪到的機會','EX5910cd4b':'嘗試','EX885fb9e6':'澆水','EX0002ce3e':'嘗試做','EXc9cce761':'（共同目標的）運動'};
for(const [word,defaultPos,exceptions]of decisions){
 const c=source.find(c=>c.wordData?.word===word);if(!c)throw Error('Unknown word '+word);
 for(const e of c.examples){const pos=exceptions[e.exampleId]??defaultPos;if(e.sensePos===pos)continue;
  const after={sensePos:pos};if(hints[e.exampleId])after.meaningHint=hints[e.exampleId];
  add('examples','exampleId',e.exampleId,after,'Actually checked the cloze target in this unchanged sentence; distinguish the sentence role from the multi-POS headword summary.',url(word));
 }
}
for(const c of source)for(const e of c.examples)if(e.status==='draft')add('examples','exampleId',e.exampleId,{status:'reviewed'},'Actually read the full English/Chinese example and cloze; meaning and answer agree, with no sentence rewrite.','LV1-U06 original text and actual general-card meaning tab; '+url(e.word));
for(const c of source)for(const s of c.senses)if(s.status==='needs_check'){
 const after={status:'reviewed',note:'2026-11-05：已核對本義、現有例句及可靠詞典；保留可確認的名詞／動詞義，不因罕見刪除；未將本義核對當作所有其他義項完成。'};
 if(s.senseId==='W000302-2')after.meaningZh='觸感；感覺；氛圍';
 add('senses','senseId',s.senseId,after,'The existing sense is supported by sentence grammar and the dictionary. Noun feel/hold/keep and verb case are valid; original deletion suggestions are not evidence of an error.',url(s.word));
}
const wordPatch=(id,after,reason,lemma)=>add('words','wordId',id,after,reason,url(lemma));
const get=id=>datasets.words.find(w=>w.wordId===id);
wordPatch('W000479',{meaningEn:'(adj.) smallest in amount or degree; (adv.) to the smallest degree; (pron.) the smallest amount. In at least, it marks a minimum amount.'},'The original English definition ended mid-clause with or...; replace the truncation with complete wording covering the existing examples.','least');
wordPatch('W000554',{meaningEn:'(adj.) greatest in number or amount, or a majority; (pron.) the greater part; (adv.) to the greatest degree, including adjective superlatives.'},'The current English definition omitted the majority/pronoun/adverb uses demonstrated by the existing examples.','most');
wordPatch('W000968',{meaningEn:'(conj.) during the time that something happens; whereas, or although; (n.) a period of time; (v., while away) to spend time pleasantly.',usagePattern:'while + S + V; while + V-ing (reduced clause); for a while; while away + time',usagePatternZh:'當……時／然而／雖然 + 子句；簡化子句可接動名詞；一會兒；消磨時間'},'The noun-only definition and while to V template contradicted four existing conjunction examples and whiled-away verb use; replace the erroneous usage rule with supported syntax.','while');
wordPatch('W006029',{meaningEn:'(n.) the act of changing position or a particular motion; a development or change; an organized effort by people working toward a shared goal.'},'movement has an existing noun identity; its English definition incorrectly began with the move verb. Preserve movement noun meanings and the environmental-movement example.','movement');
for(const [id,zh,lemma]of [
 ['W000055','背部；後面；向後；回原處；後面的；使後退；支持；倒退','back'],
 ['W000480','離開；留下；許可；告別；請假；休假','leave'],
 ['W000772','顯示；表現；表演；節目；展覽；賣弄','show'],
 ['W000924','轉彎；轉動；旋轉；翻轉；轉變；輪到的機會','turn'],
 ['W000403','握住；抱著；舉行；容納；把握；把持力；柄；控制','hold'],
 ['W000950','水；雨水；海水；水位；澆水；流口水','water'],
 ['W000431','在裡面；向裡；內部；內臟；內幕；內部的','inside']
])wordPatch(id,{meaningZh:zh},'Add the current example/sense meanings missing from the source summary; retain other valid original meanings.',lemma);
for(const [id,suffix,lemma]of [
 ['W000595','; (v.) to mark things with identifying numbers.','number'],
 ['W000741','; (n.) a group of fish, or a school of thought; (v.) to teach or train someone.','school'],
 ['W000199','; (n.) one dish in a meal, or a period/process; (v.) to flow or move along a path.','course'],
 ['W000628','; (v.) to separate or move apart.','part'],
 ['W000262','; (v.) to stop or bring something to a conclusion.','end'],
 ['W000403','; (n.) a firm grip or control of something.','hold'],
 ['W000450','; (n.) the food, shelter or money needed to live.','keep'],
 ['W000147','; (v.) to put something in a protective container or covering.','case'],
 ['W000661','; (n.) a main idea, an opinion, or a scoring unit; (v.) to indicate a direction or aim something at a target.','point'],
 ['W000431','; (prep.) within a place; (adv.) in or toward the inner part; (adj.) situated on the inner side.','inside'],
 ['W000616','; (prep.) beyond the boundary of a place; (adv.) in or toward the open air; (adj.) on the outer side.','outside']
]){
 const prior=patches.find(p=>p.dataset==='words'&&p.id===id);
 if(prior){prior.before.meaningEn=get(id).meaningEn;prior.after.meaningEn=get(id).meaningEn+suffix;prior.reason+=' Supply the existing noun/verb/adverb example definition.';}
 else wordPatch(id,{meaningEn:get(id).meaningEn+suffix},'Supply the dictionary part of speech/meaning explicitly used by current examples while retaining existing correct definitions.',lemma);
}
writeFileSync('docs/unit-audit-20261105/LV1-U06-patches.json',JSON.stringify({unit:'LV1-U06',baseCommit:'29cfc684d7a11b07f09988c478d30358830f1951',scope:'51 source pairs; 47 existing official words and 237 formal examples. Four NOID forms remain separate; no new identities or formal sentences.',patches},null,2)+'\n');
console.log(JSON.stringify({patches:patches.length,uniqueRows:new Set(patches.map(p=>p.dataset+':'+p.id)).size,posCorrections:patches.filter(p=>p.after.sensePos).length,sourceSentencesChanged:false}));
