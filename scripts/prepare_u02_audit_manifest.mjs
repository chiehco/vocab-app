import {readFileSync,writeFileSync} from 'node:fs';
const read=p=>JSON.parse(readFileSync(p,'utf8'));
const examples=read('public/data/v1/examples.json');
const senses=read('public/data/v1/senses.json');
const rows=[
 ['EX125c749d','n.','v.','遞交','hand your homework','hand'],
 ['EX3a0d807f','adj.','n.','感冒','a bad cold','cold'],
 ['EX7fd43e7b','adj.','adv.','在高處；高高地','flew high','high'],
 ['EX67a77ac9','adj.','n.','低點','a new low','low'],
 ['EXf3e4a0bf','v.','n.','車站；停靠站','the next stop','stop'],
 ['EX167e0554','n.','v.','film：拍攝影片','is filming','film'],
 ['EX4f7651cc','n.','v.','film：拍攝影片','was filmed','film'],
 ['EXfaa21eaf','n.','v.','擠奶','to milk a cow','milk'],
 ['EX00c84019','adj.','adv.','努力地','studies hard','hard'],
 ['EXf146f296','n.','v.','運送；出貨','will ship','ship'],
 ['EX3ebf8dd3','n.','v.','曬太陽','to sun himself','sun'],
];
const patches=rows.map(([id,oldPos,newPos,hint,phrase,word])=>{
 const row=examples.find(e=>e.exampleId===id);
 if(!row||row.sensePos!==oldPos||!row.sentenceEn.includes(phrase))throw Error(id+' source changed');
 return {dataset:'examples',key:'exampleId',id,before:{sensePos:oldPos,meaningHint:row.meaningHint},after:{sensePos:newPos,meaningHint:hint},
  reason:`依原句 ${phrase} 的語法修正詞性與精確提示；film 動詞只指 film，不將 movie 當動詞；中英句、答案不變。`,
  evidence:`https://www.merriam-webster.com/dictionary/${word}`};
});
for(const id of ['EX79078a92','EX2ff9ba41','EX1b17613e','EX07eabdea','EXa0b17272','EX62fcfd57']){
 const row=examples.find(e=>e.exampleId===id);if(row.status!=='draft')throw Error(id+' status changed');
 patches.push({dataset:'examples',key:'exampleId',id,before:{status:'draft'},after:{status:'reviewed'},
  reason:'已核對本例詞性、句意、英中對應及填空還原；內容代理核對，不改原句。',evidence:`https://www.merriam-webster.com/dictionary/${row.word}`});
}
for(const word of ['high','low','important','reason','story','make','sea']){
 for(const row of senses.filter(s=>s.word===word&&s.status==='needs_check'))patches.push({dataset:'senses',key:'senseId',id:row.senseId,
  before:{status:'needs_check',sensePos:row.sensePos,meaningZh:row.meaningZh},after:{status:'reviewed'},
  reason:'逐義核對現有中文、詞性及既有例句，再與詞典相符用法核對；只更新本senseId。',evidence:`https://www.merriam-webster.com/dictionary/${word}`});
}
const words=read('public/data/v1/words.json');
const butter=words.find(w=>w.word==='butter');
patches.push({dataset:'words',key:'wordId',id:butter.wordId,before:{meaningEn:butter.meaningEn},
 after:{meaningEn:butter.meaningEn+'; (v.) to spread butter on food'},
 reason:'現有中文與例句已收錄 butter his toast 的塗抹動詞，但英英解釋缺此義；補回已存在的用法，保留原英英解釋中的其他條目，其來源疑點另列未通過。',
 evidence:'https://www.merriam-webster.com/dictionary/butter'});
writeFileSync('docs/unit-audit-20261105/LV1-U02-patches.json',JSON.stringify({task:'逐單元全面檢查與修正',unit:'LV1-U02',
 baseCommit:'29cfc684d7a11b07f09988c478d30358830f1951',reviewer:'Codex agent; direct correction authorized 2026-11-05',patches},null,2)+'\n');
console.log(JSON.stringify({examplePos:rows.length,exampleReview:6,senseReview:patches.filter(p=>p.dataset==='senses').length,definitionSupplement:1}));
