import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
const read=p=>JSON.parse(readFileSync(p,'utf8'));
const examples=read('public/data/v1/examples.json');
const senses=read('public/data/v1/senses.json');
const patchRows=[
  ['EX2a494d00','n.','v.','負責；值勤','man the information desk','https://www.merriam-webster.com/simple/man'],
  ['EX1348ee89','adj.','adv.','長久地','lasted so long','https://www.merriam-webster.com/dictionary/long'],
  ['EX4df73b60','adj.','adv.','突然地','stopped short','https://www.merriam-webster.com/dictionary/short'],
  ['EX41608a4f','n.','v.','前往','we head straight','https://www.merriam-webster.com/dictionary/head'],
  ['EX96c9fbe3','n.','v.','面對','face heavy pressure','https://www.merriam-webster.com/dictionary/face'],
  ['EX63cc9246','n.','v.','預訂','booked a hotel room','https://www.merriam-webster.com/dictionary/book'],
  ['EXbe9611b1','adj.','v.','開放；開始營業','will open to the public','https://www.merriam-webster.com/dictionary/open'],
  ['EX29c337b8','adj.','v.','關閉；打烊','will close early','https://www.merriam-webster.com/dictionary/close'],
  ['EX467de9ce','n.','v.','配備','to arm the police','https://www.merriam-webster.com/dictionary/arm'],
  ['EX2dad6de6','v.','n.','划算的東西','a good buy','https://scrabble.m-w.com/dictionary/buy'],
  ['EX0daa64cc','n.','v.','躲避','ducked behind the wall','https://scrabble.merriam.com/finder/duck'],
  ['EX41165e07','adv.','adj.','足夠的','enough time','https://www.merriam-webster.com/simple/enough'],
  ['EXa383ab98','n.','v.','微笑','smiled warmly','https://www.merriam-webster.com/dictionary/smile'],
  ['EXaea96c52','n.','v.','開玩笑','just kidding','https://dictionary.cambridge.org/dictionary/english/kid?topic=not-believable'],
  ['EXbb2f537f','v.','n.','舞會','to a dance','https://www.merriam-webster.com/dictionary/dance'],
];
const patches=patchRows.map(([id,beforePos,afterPos,hint,phrase,evidence])=>{
  const row=examples.find(e=>e.exampleId===id);
  if(!row || row.sensePos!==beforePos || !row.sentenceEn.includes(phrase)) throw Error(id+' source changed');
  return {dataset:'examples',key:'exampleId',id,before:{sensePos:beforePos,meaningHint:row.meaningHint},
    after:{sensePos:afterPos,meaningHint:hint},reason:`原句 ${phrase} 的實際用法為 ${afterPos}；只修正詞性與同義中文提示，不改中英原句或答案。`,evidence};
});
for(const id of ['EX1348ee89','EX0a076afb','EXbe0840b9']){
  const row=examples.find(e=>e.exampleId===id);
  if(row.status!=='draft')throw Error(id+' review status changed');
  patches.push({dataset:'examples',key:'exampleId',id,before:{status:'draft'},after:{status:'reviewed'},
    reason:'已逐句核對詞義、詞性、英中對應與填空還原；為代理內容核對，非使用者新增美術批准。',
    evidence:row.word==='go'?'https://www.merriam-webster.com/dictionary/go':`https://www.merriam-webster.com/dictionary/${row.word}`});
}
for(const word of ['man','go','long','head','open','close','enough','body']){
  for(const row of senses.filter(s=>s.word===word && s.status==='needs_check')){
    patches.push({dataset:'senses',key:'senseId',id:row.senseId,before:{status:'needs_check',meaningZh:row.meaningZh,sensePos:row.sensePos},
      after:{status:'reviewed'},reason:'核對本義項詞性、中文釋義、既有例句及詞典用法；只審本 senseId，未批准整列原始摘要或所有圖句。',
      evidence:`https://www.merriam-webster.com/dictionary/${word}`});
  }
}
const manifest={task:'逐單元全面檢查與修正',unit:'LV1-U01',baseCommit:'29cfc684d7a11b07f09988c478d30358830f1951',
  reviewer:'Codex agent; user-authorized direct correction on 2026-11-05',
  reviewBoundary:'圖片與單元圖說38組逐張UI目視。一般字卡206例句逐句文字核對；修改後須重新開卡。字典摘要與動詞三態的剩餘缺口另外保留，不以圖句通過整列核准。',patches};
mkdirSync('docs/unit-audit-20261105',{recursive:true});
writeFileSync('docs/unit-audit-20261105/LV1-U01-patches.json',JSON.stringify(manifest,null,2)+'\n');
console.log(JSON.stringify({patches:patches.length,examplePos:patchRows.length,exampleReview:3,senseReview:patches.filter(p=>p.dataset==='senses').length}));
