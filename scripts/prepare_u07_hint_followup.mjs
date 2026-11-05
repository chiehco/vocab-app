import {readFileSync,writeFileSync} from 'node:fs';
const read=p=>JSON.parse(readFileSync(p,'utf8'));
const examples=read('public/data/v1/examples.json'),prior=read('docs/unit-audit-20261105/LV1-U07-patches.json').patches;
const decisions={
 stand:['站立',{EX0e719179:'象徵（stand for）',EX70118d1b:'忍受',EX8063a636:'立場',EX8bb5cb7b:'攤位',EX99546563:'站起來',EXb8811fb1:'支持（stand up for）',EXb98bddd7:'支持（stand by）'}],
 since:['自從……以來',{EX0621e70c:'既然；因為',EX6037424c:'從那時以來'}],
 bear:['忍受',{EX2f2f2f03:'生育',EX40792ae4:'熊',EX6f5daa5d:'結果實'}],
 need:['需要',{EX963bcb35:'基本需求',EXe4dc3b5f:'需要（in need of）',EXf6530b0e:'不必（needn’t）'}],
 order:['命令；要求',{EX02d562ad:'井然有序（in order）',EX3affaec7:'為了（in order to）',EX4dde39ab:'點餐內容',EX89c1d6c6:'故障（out of order）',EX92c3afe7:'順序',EXb0ab75c6:'點餐',EXbfa53385:'訂購',EXeca217ed:'訂單'}],
 once:['一次',{EX42304edc:'從前（once upon a time）',EX52a67ab8:'一……就',EXbfa9876a:'曾經',EXf4425b74:'一勞永逸地（once and for all）'}],
 interest:['興趣',{EX6ca05287:'使感興趣'}],
 room:['房間',{EX8bd5fb59:'同住；住宿',EX9a04c99f:'空間'}],
 set:['設置；放置',{EX085d7a8a:'出發（set out）',EX28402128:'擺好餐具',EX96f1baac:'片場',EXa82e784f:'設定',EXad4c25b2:'以……為背景',EXae59f5eb:'一組；一套',EXcf4b3e4b:'設立（set up）'}],
 several:['幾個的',{EX0c178a28:'其中幾個'}],
 mean:['表示；意指',{EX3e0ba569:'刻薄的；卑鄙的',EX4d996b67:'打算',EXb7fe53d1:'對某人很重要'}],
 name:['命名；取名',{}],
 power:['權力',{EX8b3fc8f3:'發電（power plant發電廠）',EXa2277c15:'供能；驅動',EXa6ee01b6:'能源'}],
 matter:['事情',{EX4ae894ca:'重要；有影響',EX6d9f195e:'問題；麻煩',EXe5d93d78:'事實（as a matter of fact）'}],
 trouble:['麻煩；困難',{EX3b94ac6c:'使煩惱',EX5a2e21c6:'麻煩；打擾'}],
 act:['採取行動',{EX10ac8987:'行為',EX640b26ac:'飾演',EXa4b1c781:'（戲劇的）幕',EXe5508c64:'表現；行為舉止'}],
 mind:['心思；思想',{EX38eb0b00:'介意',EXcb957a1b:'介意',EXefa1db43:'心意；決心（have one’s mind set on）'}],
 reach:['到達',{EX2bb834ae:'可及範圍',EX2e1d39a2:'達到',EX4a025979:'伸手拿'}],
 lead:['帶領',{EX88be04c9:'領先',EXa2d0d57b:'領先地位',EXbcb01770:'導致（lead to）'}]
};
const patches=prior.filter(p=>p.dataset==='examples'&&p.after.sensePos&&!Object.hasOwn(p.after,'meaningHint')).map(p=>{
 const row=examples.find(e=>e.exampleId===p.id),[fallback,exceptions]=decisions[row.word];const value=exceptions[p.id]??fallback;
 return {dataset:'examples',key:'exampleId',id:p.id,before:{meaningHint:row.meaningHint},after:{meaningHint:value},reason:'The inherited multi-sense Chinese summary included unrelated meanings. Supply the meaning of this actually inspected cloze target while retaining the source sentence and headword meanings.',evidence:'Unchanged sentenceEn, sentenceZh and blankSentence in LV1-U07; https://www.merriam-webster.com/dictionary/'+row.word};
}).filter(p=>p.before.meaningHint!==p.after.meaningHint);
writeFileSync('docs/unit-audit-20261105/LV1-U07-hints-followup.json',JSON.stringify({unit:'LV1-U07',baseCommit:'29cfc684d7a11b07f09988c478d30358830f1951',scope:'Precise Chinese hints for the same inspected cloze targets after POS correction; no sentence or answer changes.',patches},null,2)+'\n');
console.log(JSON.stringify({hints:patches.length}));
