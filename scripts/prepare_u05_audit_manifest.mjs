import {readFileSync,writeFileSync} from 'node:fs';
const read=p=>JSON.parse(readFileSync(p,'utf8'));
const examples=read('public/data/v1/examples.json'),words=read('public/data/v1/words.json'),senses=read('public/data/v1/senses.json');
const source=read('output/unit-audit-20261105/LV1-U05-full-source.json');
const patches=[];
const url=w=>'https://www.merriam-webster.com/dictionary/'+w;
function add(dataset,key,id,after,reason,evidence){
 const row={examples,words,senses}[dataset].find(r=>r[key]===id);if(!row)throw Error('Unknown existing identity '+id);
 const before=Object.fromEntries(Object.keys(after).map(k=>[k,row[k]]));
 if(Object.values(before).some(v=>v===undefined))throw Error('Missing old value '+id);
 patches.push({dataset,key,id,before,after,reason,evidence});
}
// Explicit sentence-by-sentence decisions; source headword POS lists are retained.
const precise=[
 ['EX1ffe7695','adv.','偶爾（every now and then）'],['EX7dae506f','adv.','接著；然後'],['EX87fe6b21','adv.','那麼（表結果）'],['EX8c50cef0','adv.','當時'],['EXd052c1cb','adv.','那時'],['EXd28eb168','adj.','當時的'],
 ['EX0f0659ba','adv.','幾乎'],['EX89b82de6','prep.','關於'],['EXcf4569af','adv.','即將（be about to）'],['EXfcfe2f17','adv.','大約'],
 ['EX56ba841a','n.','意外發現的好東西'],['EX76018b50','v.','覺得；認為'],['EX830ec6aa','v.','找到'],['EXd3203fed','v.','查明（find out）'],
 ['EX0490ea2e','adj.','平坦的'],['EX5e03be39','adv.','即使（even if）'],['EX8468c530','adj.','相等的'],['EX921a09a5','adj.','偶數的'],['EX9461bb4b','adv.','甚至'],['EXa2cb1cad','adv.','雖然（even though）'],['EXea250226','v.','使比分相等'],
 ['EX4210abcd','v.','使用'],['EX64a74094','n.','用處'],['EXddc6b5cf','v.','使用'],
 ['EX08a8baa5','n.','同類事物（and the like）'],['EX6ea46448','prep.','像；如同'],['EXb35a83de','v.','喜歡'],['EXba63caca','n.','喜好'],['EXcb2c6b10','v.','喜歡'],['EXf4ecb810','v.','想要（would like）'],['EXf5dd2286','prep.','想要（feel like）'],
 ['EX011c7c08','adj.','自己的'],['EX9f1bb8c1','v.','擁有'],
 ['EX30ae139f','v.','居住'],['EX7c636f70','v.','存活'],['EX92c8de79','adj.','活的'],['EX96e0421d','adj.','現場直播的'],['EXd4f678a3','adj.','現場演出的'],['EXe20604da','v.','生活'],
 ['EX2a0f900a','adv.','剛剛'],['EX470cf0ac','adv.','實在；非常'],['EX75390ee5','adv.','恰好'],['EXaa643986','adj.','公正的'],['EXf92244c3','adv.','只是'],['EXfcd6c2de','adv.','僅僅（等一下）'],
 ['EX0aa6d7a6','prep.','在……之間'],['EX2ef8f3c9','adv.','在中間（in between）'],
 ['EX20a1a2db','adv.','仍然'],['EX487ea94c','adj.','靜止不動的'],['EX53d2410a','adv.','更；還要'],['EXa664f012','adj.','靜止不動的'],
 ['EX9b899824','adj.','再一個'],['EX9ff281f8','pron.','另一個'],
 ['EX0028eaaf','v.','奏效；行得通'],['EX2b09ba7e','n.','工作'],['EX741361d9','v.','解決（work out）'],['EXcee2e5e1','n.','作品'],['EXf17630a4','v.','工作'],['EXf6438e4e','v.','運作'],
 ['EX35ea5762','adj.','身體健康的'],['EX643b3daa','n.','井'],['EX6d332f94','adv.','好好地'],['EX81191eb5','adj.','身體健康的'],
 ['EX586cbf5f','adj.','很棒的'],['EXaea6abdd','adj.','大的'],['EXc3e83083','adj.','偉大的'],['EXe2db9a73','n.','傑出人物'],
 ['EXd7d33d5d','n.','謝意（thanks）'],['EXf0a32785','v.','感謝'],
 ['EX50dd20c8','n.','飲料'],['EX5296d26b','v.','喝'],['EX8522ade4','n.','飲料'],['EXea792231','v.','喝'],
 ['EX215a6f10','adv.','完全地'],['EX2b97d7d7','pron.','一切'],['EXa1a04aa9','adj.','全部的'],['EXa594edbf','adv.','一點也（at all）'],['EXba143a34','adj.','所有的']
];
for(const [id,pos,hint]of precise){const row=examples.find(e=>e.exampleId===id);if(!row)throw Error('Typo '+id);
 const after={};if(row.sensePos!==pos)after.sensePos=pos;if(row.meaningHint!==hint)after.meaningHint=hint;
 if(Object.keys(after).length)add('examples','exampleId',id,after,'The cloze target has this specific grammatical role and meaning in the unchanged sentence; a whole-headword POS list/gloss is misleading here.',url(row.word==='thank'&&hint.includes('thanks')?'thanks':row.word));
}
for(const c of source)for(const e of c.examples)if(e.status==='draft')add('examples','exampleId',e.exampleId,{status:'reviewed'},'Actually checked target, cloze, full English sentence and Chinese translation; sentence meaning retained.','LV1-U05 source snapshot and real general-card meaning tab; '+url(e.word));
for(const c of source)for(const s of c.senses)if(s.status==='needs_check'){
 const noun=s.sensePos==='n.';
 const note='2026-11-05：已核對現有例句、詞性及本義；'+((s.word==='great'||s.word==='find')&&noun?'名詞義有可靠詞典及現有例句支持，保留，不能因罕見刪除。':'未將本義核對當作整詞所有義項完成。');
 add('senses','senseId',s.senseId,{status:'reviewed',note},'The existing sense is supported by current examples and the dictionary; unresolved blanket splitting/deletion notes are replaced only after this check.',url(s.word));
}
const defs=[
 ['W000004',{meaningEn:'(prep.) concerning or relating to something; (adv.) approximately, nearly, or on the point of doing something; also on the move or all around.'},'Existing definition omitted the concerning/approximately/nearly senses used by current examples.','about'],
 ['W000493',{meaningEn:'(v.) to enjoy or want something; (prep.) similar to, or wanting something in feel like; (n.) a preference or a similar kind of person or thing.'},'Existing definition contained only the similar-kind noun, omitting the approved verb/preposition examples.','like'],
 ['W000270',{meaningEn:words.find(w=>w.wordId==='W000270').meaningEn+'; (v.) to make a surface level or amounts equal; (adj.) divisible by two without a remainder.',meaningZh:'甚至；更；平坦的；相等的；連貫的；均等的；偶數的；使平坦或相等'},'The current verb and even-number examples were absent from the definitions; other valid senses are retained.','even'],
 ['W000309',{meaningEn:words.find(w=>w.wordId==='W000309').meaningEn+'; (n.) a valuable or unexpectedly good discovery.',meaningZh:words.find(w=>w.wordId==='W000309').meaningZh+'；意外發現的好東西'},'The current real-find noun example and existing noun sense require a noun gloss; it is not an erroneous rare sense.','find'],
 ['W000500',{meaningZh:'居住；生活；活著；活的；生動的；精力充沛的；實況轉播的'},'Chinese summary omitted the verb meanings explicitly used by four current examples.','live'],
 ['W000449',{meaningZh:'只是；剛剛；恰好；實在；正直的；合理的；正確的；應得的'},'Chinese summary omitted the adverb meanings used by most current examples.','just'],
 ['W000827',{meaningZh:'仍然；更；靜止的；蒸餾室；寂靜；劇照；蒸餾'},'Chinese summary omitted the two current senses; unusual original source glosses are retained with an unresolved provenance note.','still'],
 ['W000986',{meaningZh:'工作；勞動；職業；行為；作品；運作；奏效'},'Chinese summary omitted the works, functioning and method-works meanings demonstrated by current examples.','work'],
 ['W000960',{meaningZh:'好好地；健康的；井；泉水；源泉；好'},'Chinese summary omitted the adverb and health adjective senses demonstrated by current examples.','well'],
 ['W000362',{meaningEn:words.find(w=>w.wordId==='W000362').meaningEn+'; (n., often plural greats) an exceptionally accomplished person.',meaningZh:'很棒的；偉大的；大的；非常的；主要的；重大的；傑出人物'},'The current Chopin/greats noun example is valid, while the summary omitted its noun gloss and common good/enjoyable meaning.','great'],
 ['W000870',{meaningEn:words.find(w=>w.wordId==='W000870').meaningEn+'; (n., thanks) an expression of gratitude.'},'The existing show-her-thanks noun example lacks an English noun gloss.','thanks']
];
for(const [id,after,reason,word]of defs)add('words','wordId',id,after,reason,url(word));
writeFileSync('docs/unit-audit-20261105/LV1-U05-patches.json',JSON.stringify({baseCommit:'29cfc684d7a11b07f09988c478d30358830f1951',unit:'LV1-U05',scope:'All 32 retained pairs; 30 existing official words and 171 formal examples. Two NOID supplement items remain separate; no IDs invented.',patches},null,2)+'\n');
console.log(JSON.stringify({patches:patches.length,preciseExampleDecisions:precise.length,wordDefinitions:defs.length,sentencesChanged:false}));
