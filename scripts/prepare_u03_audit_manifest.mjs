import {readFileSync,writeFileSync} from 'node:fs';
const read=p=>JSON.parse(readFileSync(p,'utf8'));
const examples=read('public/data/v1/examples.json');
const senses=read('public/data/v1/senses.json');
const fixes=[
 ['EX6eb9f058','n.','v.','主持','chair','will chair'],
 ['EXa71b4b3e','n.','v.','下雨','rain','to rain heavily'],
 ['EX146695ef','adj.','adv.','接下來','next','do next'],
 ['EXfb897739','adj.','n.','幼鳥；幼小動物','young','feed their young'],
 ['EX1ac54dae','adj./n./adv.','adv.','字寫得小小地','small','wrote small'],
 ['EX7d044020','adj./n./adv.','n.','小號衣物','small','wears smalls'],
];
const patches=fixes.map(([id,old,pos,hint,word,phrase])=>{
 const r=examples.find(e=>e.exampleId===id);if(r.sensePos!==old||!r.sentenceEn.includes(phrase))throw Error(id);
 return {dataset:'examples',key:'exampleId',id,before:{sensePos:old,meaningHint:r.meaningHint},after:{sensePos:pos,meaningHint:hint},
  reason:'依原句實際句法與用法修正例句詞性及提示；保留全部英中句、填空及答案。',evidence:`https://www.merriam-webster.com/dictionary/${word}`};
});
const draft=examples.find(e=>e.exampleId==='EX7a75eb08');
patches.push({dataset:'examples',key:'exampleId',id:draft.exampleId,before:{status:'draft'},after:{status:'reviewed'},
 reason:'已核對small形容詞用法、英中句意與填空還原，原句不變。',evidence:'https://www.merriam-webster.com/dictionary/small'});
for(const word of ['small','old','now','get'])for(const r of senses.filter(s=>s.word===word&&s.status==='needs_check')){
 const after={status:'reviewed'};
 if(r.senseId==='W000791-2')after.meaningZh='細小或較窄的部分；（複數 smalls）小號尺寸物品或衣物';
 patches.push({dataset:'senses',key:'senseId',id:r.senseId,before:{status:r.status,meaningZh:r.meaningZh},after,
 reason:r.senseId==='W000791-2'?'詞典確認細窄部分及smalls小號物品兩種名詞用法；補足既有wears smalls例句所用義，並非刪標記。':'已逐義核對詞性、中文及現有例句，再與詞典相符用法交叉核對；只更新此義項。',
 evidence:`https://www.merriam-webster.com/dictionary/${word}`});
}
writeFileSync('docs/unit-audit-20261105/LV1-U03-patches.json',JSON.stringify({task:'逐單元全面檢查與修正',unit:'LV1-U03',baseCommit:'29cfc684d7a11b07f09988c478d30358830f1951',patches},null,2)+'\n');
console.log(JSON.stringify({examplePos:fixes.length,exampleReview:1,senseReview:patches.filter(p=>p.dataset==='senses').length}));
