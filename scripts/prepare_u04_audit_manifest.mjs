import {readFileSync,writeFileSync} from 'node:fs';
const read=p=>JSON.parse(readFileSync(p,'utf8'));
const examples=read('public/data/v1/examples.json'),senses=read('public/data/v1/senses.json'),words=read('public/data/v1/words.json');
const patches=[];
const add=(dataset,key,id,after,reason,word)=>{const r={examples,senses,words}[dataset].find(r=>r[key]===id);if(!r)throw Error(id);patches.push({dataset,key,id,before:Object.fromEntries(Object.keys(after).map(k=>[k,r[k]])),after,reason,evidence:`https://www.merriam-webster.com/dictionary/${word}`});};
for(const [id,pos,hint,word]of [
 ['EX8720f3ec','v.','主演','star'],['EXc1f2672a','v.','裝箱','box'],
 ['EX2313396c','v.','放置','place'],['EXce245ee9','v.','著色','color'],
 ['EX4b673a05','n.','看法；解讀','take'],['EX2ec1dd2d','prep.','because of：由於（介系詞片語）','because%20of'],
])add('examples','exampleId',id,{sensePos:pos,meaningHint:hint},'依填空實際指向及原句句法修正詞性與精確義；because of整體接名詞片語，不將它標成引導子句的conj.。英中句及答案保持。',word);
const source=read('output/unit-audit-20261105/LV1-U04-full-source.json');
for(const c of source)for(const e of c.examples.filter(e=>['draft','needs_check'].includes(e.status))){
 if(e.blankSentence.replace(/_+/g,e.answer)!==e.sentenceEn)throw Error(e.exampleId+' cloze');
 add('examples','exampleId',e.exampleId,{status:'reviewed'},e.exampleId==='EX755c430f'?'已核對填空是第一個for lunch（目的介系詞），第二個for he was…才是連接詞；保留正確prep.，不因同句含另一個for而錯改。其他英中句、填空及用法已核對。':'已核對全部英中句、實際填空詞性、句意與答案還原，才更新本例狀態，不替整詞或其他配圖通過。',e.word==='o’clock'?'o%27clock':e.word);
}
for(const c of source)for(const s of c.senses.filter(s=>['needs_check','draft'].includes(s.status)))add('senses','senseId',s.senseId,{status:'reviewed'},'逐義檢查詞性、中文及既有例句，並與詞典相符用法核對；本列通過不等於全部多義字義已拆分。',c.word);
const word=(name)=>words.find(w=>w.word===name||w.wordVariants?.includes(name));
const supplement=(name,text)=>{const w=word(name);add('words','wordId',w.wordId,{meaningEn:w.meaningEn+text},'補回現有義項及原例句已用到、但原英英解釋缺漏的用法；原英英內容保留，整詞原draft狀態不提升。',name);};
supplement('minute','; (minutes, plural) written notes recording the discussions and decisions of a meeting');
supplement('will','; (n.) a person\'s determination or intention; a document stating how a person wants property handled after death');
supplement('can','; (n.) a container, often made of metal, for food or drink; (v.) to preserve food in sealed containers');
supplement('time','; (v.) to measure how long something takes or to arrange when it happens');
supplement('take','; (n.) a person\'s view or interpretation of something');
supplement('green','; (v.) to make a place greener by planting trees or other plants');
const tv=word('television');
add('words','wordId',tv.wordId,{meaningZh:'電視；電視機'},'詞頭television/TV、現有英英解釋及全部五例均為電視義；轉移向量是非電視縮寫義混入，不能當成television的同義解釋。依詞典修回可證的電視及電視機，完整原列可回復；原匯入來源混入原因另記。','television');
const because=word('because');
add('words','wordId',because.wordId,{meaningEn:'(conj.) used to introduce the reason for an event or action; because of + a noun phrase means as a result of'},'原英英解釋有for the; reason等破損斷句；依已收錄because子句與because of名詞片語兩用法修復完整解釋，原例句不變。','because%20of');
const nice=word('nice');
add('words','wordId',nice.wordId,{meaningEn:'(adj.) pleasant, kind, or well done; (proper name, Nice) '+nice.meaningEn.split('; pleasant')[0]},'把已存在的形容詞常用義置前，明確將保留的法國城市內容標為大寫專名Nice，避免城市解釋混成小寫nice形容詞；draft不提升。','nice');
const forWord=word('for');
add('words','wordId',forWord.wordId,{status:'reviewed'},'已核對本詞prep./conj.、六例實際填空、英中句、目的／給予對象／原因／贊成等用法及現有英英摘要；詞典支持各已記錄用法後更新，不是只刪待核對標記。','for');
writeFileSync('docs/unit-audit-20261105/LV1-U04-patches.json',JSON.stringify({task:'逐單元全面檢查與修正',unit:'LV1-U04',baseCommit:'29cfc684d7a11b07f09988c478d30358830f1951',patches},null,2)+'\n');
console.log(JSON.stringify({patches:patches.length,pos:6,exampleReviewed:patches.filter(p=>p.dataset==='examples'&&p.after.status).length,senseReviewed:patches.filter(p=>p.dataset==='senses').length,wordDefinitions:9,wordReviewed:1}));
