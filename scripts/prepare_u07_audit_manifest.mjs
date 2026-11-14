import {readFileSync,writeFileSync} from 'node:fs';
const read=p=>JSON.parse(readFileSync(p,'utf8'));
const source=read('output/unit-audit-20261105/LV1-U07-full-source.json');
const datasets=Object.fromEntries(['words','senses','examples'].map(k=>[k,read(`public/data/v1/${k}.json`)]));
const patches=[],url=w=>'https://www.merriam-webster.com/dictionary/'+w;
function add(dataset,key,id,after,reason,evidence){const row=datasets[dataset].find(r=>r[key]===id);if(!row)throw Error(id);
 const old=patches.find(p=>p.dataset===dataset&&p.id===id);
 if(old){for(const [k,v]of Object.entries(after)){if(k in old.after&&old.after[k]!==v)throw Error('Conflicting correction '+id);old.before[k]=row[k];old.after[k]=v;}old.reason+=' '+reason;return;}
 const before=Object.fromEntries(Object.keys(after).map(k=>[k,row[k]]));if(Object.values(before).some(v=>v===undefined))throw Error('Missing old value '+id);
 patches.push({dataset,key,id,before,after,reason,evidence});}
// Decisions refer to the actual cloze target in the explicitly read sentences.
// Only combined labels use these defaults; existing single labels change only in the explicit list below.
const decisions=[
 ['stand','v.',{EX8063a636:'n.',EX8bb5cb7b:'n.'}],
 ['since','conj.',{EX6037424c:'adv.',EXf5c6aa1a:'prep.'}],
 ['bear','v.',{EX40792ae4:'n.'}],
 ['need','v.',{EX963bcb35:'n.',EXe4dc3b5f:'n.',EXf6530b0e:'aux.'}],
 ['order','n.',{EX28db5d84:'v.',EXb0ab75c6:'v.',EXbfa53385:'v.'}],
 ['once','adv.',{EX52a67ab8:'conj.'}],
 ['interest','n.',{EX6ca05287:'v.'}],
 ['room','n.',{EX8bd5fb59:'v.'}],
 ['set','v.',{EX96f1baac:'n.',EXae59f5eb:'n.'}],
 ['several','adj.',{EX0c178a28:'pron.'}],
 ['mean','v.',{EX2d4dd0c9:'n.',EX3e0ba569:'adj.'}],
 ['name','v.',{}],
 ['power','n.',{EXa2277c15:'v.'}],
 ['matter','n.',{EX4ae894ca:'v.'}],
 ['trouble','n.',{EX3b94ac6c:'v.',EX5a2e21c6:'v.'}],
 ['act','v.',{EX10ac8987:'n.',EXa4b1c781:'n.'}],
 ['mind','n.',{EX38eb0b00:'v.',EXcb957a1b:'v.'}],
 ['reach','v.',{EX2bb834ae:'n.'}],
 ['lead','v.',{EXa2d0d57b:'n.'}]
];
const hint={EX2d4dd0c9:'意義（本句填空為名詞meaning；保留原教材mean詞族對應）'};
for(const [word,defaultPos,exceptions]of decisions){const card=source.find(c=>c.word===word);if(!card)throw Error(word);
 for(const e of card.examples)if(e.sensePos.includes('/')){const after={sensePos:exceptions[e.exampleId]??defaultPos};if(hint[e.exampleId])after.meaningHint=hint[e.exampleId];
 add('examples','exampleId',e.exampleId,after,'Read the full unchanged sentence and actual cloze answer; replace the inherited multi-POS summary with the target role. Headword POS and source-family mapping remain unchanged.',url(word));}}
const single=[['EX3af1aa32','n.','攤位'],['EXf6228a29','n.','熊'],['EXe67b5f81','n.','跑步'],['EX36245e06','v.','點餐'],['EX613c0f87','v.','要求'],['EXfc7bc944','n.','一組；一套'],['EX8d003ef3','adj.','刻薄的'],['EX60c230e4','v.','命名'],['EX0b2b6507','v.','保養；維修'],['EX6c727231','v.','重要；有影響'],['EX405477c6','v.','麻煩；打擾'],['EXd158771a','v.','遇到'],['EX32cbd42c','n.','法案'],['EX84c740eb','v.','介意'],['EXd4af26e5','n.','領先'],['EX19634554','n.','款項；報酬']];
for(const [id,sensePos,meaningHint]of single){const row=datasets.examples.find(e=>e.exampleId===id);if(!row||row.sensePos===sensePos)throw Error('Unexpected prior POS '+id);
 add('examples','exampleId',id,{sensePos,meaningHint},'The existing sentence clearly uses this part of speech; preserve its English, Chinese, cloze and answer.',url(row.word));}
for(const c of source)for(const e of c.examples)if(e.status==='draft')add('examples','exampleId',e.exampleId,{status:'reviewed'},'Read English, translation, blank and answer in the original data and actual meaning-tab UI. This approves the practice sentence only, not an unverified exam-source assertion.','LV1-U07 original data and actual general-card UI; '+url(e.word));
for(const c of source)for(const s of c.senses)if(s.status==='needs_check')add('senses','senseId',s.senseId,{status:'reviewed',note:'2026-11-05：已逐句核對本義、既有例句與詞典。保留各詞頭其他詞性與原始來源界線；本義通過不代表整個詞條所有欄位通過。'},'The specific existing sense agrees with the inspected sentences and dictionary; no blanket word-status promotion.',url(s.word));
function wordPatch(word,after,reason){const c=source.find(c=>c.word===word);add('words','wordId',c.officialWordId,after,reason,url(word));}
wordPatch('since',{meaningEn:'(prep.) from a stated past time until a later time; (conj.) from the time that, or because; (adv.) from that time onward.'},'Replace a malformed historical sample embedded in the definition with complete coverage of the existing three parts of speech.');
wordPatch('need',{meaningEn:'(v.) to require something or have to do something; (n.) a requirement, lack, or something necessary; (aux., especially in negatives and questions) to be obliged to do something.'},'The noun-only definition omitted the ordinary verb and auxiliary uses in the inspected examples.');
wordPatch('disorder',{meaningEn:'(n.) a state of untidiness or lack of order; a disturbance of public peace; an illness or abnormal functioning; (v.) to disturb the arrangement or normal functioning of something.',usagePattern:'in disorder; a physical/mental disorder; disorder + N',usagePatternZh:'雜亂；身體／心理失調；擾亂某事物'},'The original definition omitted the current untidy-toys meaning; disorder to V was an unsupported and misleading complement template.');
wordPatch('needy',{meaningEn:'(adj.) lacking money and basic necessities; requiring much affection, attention or emotional support; (the needy) people who lack basic necessities.'},'Supply the poverty adjective required by needy families, retaining the emotional-support sense and collective use.');
wordPatch('orderly',{meaningEn:'(adj.) arranged neatly or acting in an organized, peaceful way; (n.) a hospital attendant or a soldier serving as an attendant.',usagePattern:'an orderly room; in an orderly way; an/the orderly',usagePatternZh:'整齊的房間；有秩序地；護理員／勤務兵'},'The noun-only English definition and noun-centered usage omitted the existing books-on-shelf adjective; valid attendant nouns are retained.');
wordPatch('room',{meaningEn:'(n.) a space within a building divided by walls; available space or opportunity; (v.) to live or stay in accommodation, especially sharing it with another person.'},'Include make room and roomed together from the inspected formal examples.');
wordPatch('payment',{meaningEn:'(n.) the act of paying; money or another form of compensation that is paid or received.'},'The original English began with the pay verb despite the payment noun identity and unchanged first-payment sentence.');
wordPatch('server',{meaningEn:'(n.) a person who brings food or drinks to customers; a utensil used for serving; a player who serves in a game; a computer that supplies shared services to other computers.',meaningZh:'服務生；上菜用具；發球員；伺服器',usagePattern:'a restaurant server; a tennis server; a computer server',usagePatternZh:'餐廳服務生；網球發球員；電腦伺服器'},'Add the food-service meaning required by the authored card; distinguish it from the preserved sports and computing meanings.');
for(const [word,prefix]of [
 ['hobby','(n.) an activity done regularly for pleasure in free time; other established senses include '],
 ['deed','(n.) an action, especially one that is good or bad; also '],
 ['wage','(n.) money earned for work, especially an amount paid by time worked; also ']
]){const c=source.find(c=>c.word===word);wordPatch(word,{meaningEn:prefix+c.wordData.meaningEn},'Supply the current ordinary learner sense without deleting the existing rarer definitions.');}
for(const [word,suffix]of [
 ['outstanding','; also not yet paid, settled or resolved.'],
 ['operate','; to run or manage a business or organization.'],
 ['power','; (v.) to supply energy to make something work.'],
 ['reach','; (n.) the distance or area within which something can be touched, obtained or influenced.']
]){const c=source.find(c=>c.word===word);wordPatch(word,{meaningEn:c.wordData.meaningEn+suffix},'Add the already documented Chinese or inspected example sense missing from the English summary.');}
for(const [word,meaningZh]of [
 ['stand','站立；站住；停頓；講臺；攤位；立場；忍受；經得起'],
 ['operate','操作；運轉；動手術；活動；經營'],
 ['mean','表示；意指；打算；對某人重要；低劣的；卑賤的；簡陋的；吝嗇的；刻薄的'],
 ['meaningful','有意義的；意味深長的'],
 ['name','名字；名稱；姓名；名義；命名；說出名字'],
 ['power','力；體力；力量；勢力；權力；電力；驅動'],
 ['matter','事件；物質；原因；素材；重要；有影響'],
 ['meet','會面；遇見；滿足（需求）；會；集會；適宜的；合適的'],
 ['mind','思想；願望；智力；記憶；介意；留意']
])wordPatch(word,{meaningZh},'Include the actual current sentence meanings missing from the inherited Chinese summary; retain other source senses.');
wordPatch('means',{meaningZh:'方法；手段；工具；財產；經濟能力'},'The existing noun identity means refers to methods or financial resources; the adjective lowly belongs to the distinct mean entry, which remains intact.');
wordPatch('belief',{usagePatternZh:'對……的信念；某人相信……'},'Correct the clear Chinese transcription error 張 to 的 in the existing belief-in rule.');
const all=source.flatMap(c=>c.examples);if(all.some(e=>e.blankSentence.replace(/_+/g,e.answer)!==e.sentenceEn))throw Error('Cloze mismatch');
writeFileSync('docs/unit-audit-20261105/LV1-U07-patches.json',JSON.stringify({unit:'LV1-U07',baseCommit:'29cfc684d7a11b07f09988c478d30358830f1951',scope:'93 authored pairs, 78 existing formal dictionary identities and 276 formal examples. Fifteen NOID forms remain separate. No original sentences, IDs or headword POS lists changed.',patches},null,2)+'\n');
console.log(JSON.stringify({patches:patches.length,pos:patches.filter(p=>p.after.sensePos).length,singlePosErrors:single.length,draftExamples:patches.filter(p=>p.dataset==='examples'&&p.after.status).length,senses:patches.filter(p=>p.dataset==='senses').length,wordRows:patches.filter(p=>p.dataset==='words').length}));
