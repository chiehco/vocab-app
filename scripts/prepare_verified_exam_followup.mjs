import {readFileSync,writeFileSync} from 'node:fs';
const read=name=>JSON.parse(readFileSync(`public/data/v1/${name}.json`,'utf8'));
const paper112='https://www.ceec.edu.tw/files/file_pool/1/0n045359274947649605/02-112%E5%AD%B8%E6%B8%AC%E8%8B%B1%E6%96%87%E8%A9%A6%E5%8D%B7.pdf';
const answer112='https://www.ceec.edu.tw/files/file_pool/1/0N015546416633213720/02-112%E5%AD%B8%E6%B8%AC%E8%8B%B1%E6%96%87%E5%8F%83%E8%80%83%E7%AD%94%E6%A1%88.pdf';
const paper106='https://www.ceec.edu.tw/files/file_pool/1/0j076574214786979208/02-106%E5%AD%B8%E6%B8%AC%E8%8B%B1%E6%96%87%E8%A9%A6%E5%8D%B7%E5%AE%9A%E7%A8%BF.pdf';
const answer106='https://www.ceec.edu.tw/files/file_pool/1/0j076574215321858235/02-106%E5%AD%B8%E6%B8%AC%E8%8B%B1%E6%96%87%E9%81%B8%E6%93%87%E9%A1%8C%E7%AD%94%E6%A1%88.pdf';
const specs=[
 ['senses','senseId','W000270-1',{meaningZh:'使平衡；使均衡',examEvidence:`112學年度（2023）學測英文，文意選填Q23，印刷第3頁；選項G even，官方答案23＝G。試卷：${paper112}；答案：${answer112}`,note:'考點：even things out，使平衡、使均衡。官方題目談水與鹽失衡後恢復平衡；本站鋪沙弄平路面的例句 EXd2362b27 是另寫的練習句，呈現弄平表面的用法，並非Q23原文。',status:'reviewed'},'Official question context establishes restoring balance; the separate practice sentence illustrates leveling a surface.',`${paper112} printed p3 Q23, option G; ${answer112} Q23=G.`],
 ['senses','senseId','W000628-1',{meaningZh:'（身體）部位',examEvidence:`106學年度（2017）學測英文，文意選填Q38，印刷第3頁；選項B parts，官方答案38＝B。試卷：${paper106}；答案：${answer106}`,note:'考點：複數parts，指身體部位。官方題目是various parts of their bodies；body parts是教學概括，並非原題連續字串。本站醫生檢查手臂的例句 EX0cad31e9 是另寫的練習句，並非Q38原文。',status:'reviewed'},'Official question and answer establish plural noun parts referring to body regions; distinguish source from authored practice.',`${paper106} printed p3 Q38, option B; ${answer106} Q38=B.`],
 ['examples','exampleId','EXd2362b27',{meaningHint:'使表面平整；弄平（even out；本句為另寫練習句）'},'The unchanged practice sentence is about leveling sand, distinct from balancing fluid in the official question.','Existing sentenceEn/sentenceZh and verified CEEC112 Q23 context; no sentence, cloze or answer changes.'],
 ['examples','exampleId','EX0cad31e9',{meaningHint:'（身體）部位（本句為另寫練習句）'},'Clarify the authored practice sentence without suggesting it is the original exam quotation.','Existing sentenceEn/sentenceZh and verified CEEC106 Q38 context; no sentence, cloze or answer changes.']
];
const patches=specs.map(([dataset,key,id,after,reason,evidence])=>{const row=read(dataset).find(r=>r[key]===id);if(!row)throw Error(id);return {dataset,key,id,before:Object.fromEntries(Object.keys(after).map(k=>[k,row[k]])),after,reason,evidence};});
const target='docs/unit-audit-20261105/LV1-U05-U06-exam-source-followup.json';
writeFileSync(target,JSON.stringify({baseCommit:'29cfc684d7a11b07f09988c478d30358830f1951',scope:'Only two verified exam senses and the corresponding authored-practice hints; no whole-word promotion or claim that practice sentences quote the exam.',patches},null,2)+'\n');
console.log(JSON.stringify({target,patches:patches.length}));
