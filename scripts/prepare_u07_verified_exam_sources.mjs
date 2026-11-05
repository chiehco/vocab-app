import {readFileSync,writeFileSync} from 'node:fs';
const read=p=>JSON.parse(readFileSync(p,'utf8'));
const urls={
107:['0j076574893317534748','02-107學測英文試卷定稿.pdf','0j076574893773665710','02-107學測英文答案.pdf'],
108:['0j196548669826315609','01-108學測英文試卷定稿.pdf','0j196548660460294627','02-108學測英文選擇題答案.pdf'],
110:['0l069608312283063557','110學測英文試卷 .pdf','0l069608703462801602','110學測英文答案.pdf'],
111:['0m053357638065462325','02-111學測英文試卷.pdf','0m052625594764853905','02-111學測英文選擇題答案..pdf'],
112:['0n045359274947649605','02-112學測英文試卷.pdf','0N015546416633213720','02-112學測英文參考答案.pdf'],
113:['0o051427482769341323','02-113學測英文科定稿.pdf','0o051427843482078305','02-113學測英文答案.pdf'],
114:['0p056425554473267580','02-114學測英文試題.pdf','0p051545433631383724','02-114學測英文答案.pdf']};
const source=(year,q,option,form,context)=>{const a=urls[year],root='https://www.ceec.edu.tw/files/file_pool/1/';return {year,question:q,option,answerForm:form,context,questionUrl:root+a[0]+'/'+encodeURIComponent(a[1]),answerUrl:root+a[2]+'/'+encodeURIComponent(a[3])};};
const facts=[
['W000041-1','出現；問世','first appeared 整體表示首次出現；首次由 first 修飾，不是 appear 所有用法都含首次。EX7dfa0583 是另寫練習句，並非原題引文。',[source(107,38,'B','appeared','幸運餅起源；較普遍接受的說法指日裔移民於1907或1914年在舊金山創製。')]],
['W000071-1','具有；帶有（名稱）','each bearing a name 中 bearing 是 bear 的現在分詞，表示各自具有名稱；不是熊、生育或承受重量。EX49144abd 是另寫練習句。',[source(114,23,'B','bearing','巴黎聖母院十口鐘各有名稱，最大的鐘名為 Emmanuel。')]],
['W000529-1','刻薄的；不友善的','形容詞 mean 與 bossy 並列。EX8d003ef3 將原題 totally different from 改成 unlike，屬改寫練習句，不是逐字原題；EX723c2aa9 也是另寫練習句。',[source(108,2,'C','mean','和善謙遜的新主管，對比刻薄且愛使喚人的前主管。')]],
['W000669-1','可能做到的；可實現的','it is possible to V 表示技術讓事情做得到；不僅指發生機率。EX8d61e24d 是另寫練習句。',[source(111,29,'A','possible','電腦生成影像讓電影在不使用真正特技演員時仍能製作逼真場景。')]],
['W000822-1','經得起；承受（考驗）','stand the test of time：經得起時間考驗、歷久不衰。EX7afed7c5 是另寫練習句；未逐字核實的練習句不標為原題引文。',[source(113,5,'D','stand','畢卡索、莫內等偉大藝術家的作品經得起時間考驗。')]],
['W001088-1','看法；所相信的觀點','beliefs 是 belief 複數；本題談對婚姻意義的看法，不專指宗教信仰。EX44201c9e 是另寫練習句。',[source(107,6,'B','beliefs','男女通常思考不同，以雙方對婚姻在人生中意義的看法差異為例。')]],
['W001538-1','方法；手段','a powerful means 中 means 是單數名詞，單複數同形；不是 mean 的第三人稱動詞。EX63b77d47 是另寫練習句。',[source(110,39,'A','means','即使短時間低衝擊運動，也能成為改善健康的有效方法。')]],
['W003270-1','（人）要求嚴格的；（活動）費力的、吃力的','兩題答案均為 demand 詞族的衍生形容詞 demanding，不是 demand 本身的形容詞用法，也不是普通時態變化；保留 demand 詞頭原詞性。EX3226d24a 是另寫練習句。',[source(107,7,'D','demanding','主管要求相同工作卻縮短期限，表示要求嚴格。'),source(110,36,'E','demanding','physically demanding exercises 指費力、耗體力的運動；與真正疼痛作區分。')]],
['W001008-1','身體活動量大的；經常活動的','physically active 指身體活動量大；本題不支持性格好動、社交活躍或 ADHD。EX935f8ca2 是另寫的祖母每日游泳練習句。',[source(112,22,'B','active','戶外工作且身體活動量大的人，比久坐冷氣房工作的人需要更多水分。')]]
];
const senses=read('public/data/v1/senses.json'),examples=read('public/data/v1/examples.json');
const patches=facts.map(([id,meaningZh,note,exams])=>{const row=senses.find(s=>s.senseId===id);if(!row||row.status!=='draft')throw Error('Unexpected prior sense '+id);const examEvidence=exams.map(e=>`${e.year}學年度學測英文 Q${e.question}；選項${e.option} ${e.answerForm}。試卷：${e.questionUrl}；答案：${e.answerUrl}`).join('；');const after={meaningZh,note,examEvidence,status:'reviewed'};return {dataset:'senses',key:'senseId',id,before:Object.fromEntries(Object.keys(after).map(k=>[k,row[k]])),after,reason:'Verified this specific sense against the official question context and answer key. Preserve whole-word status, headword POS, answer forms and authored practice sentences.',evidence:JSON.stringify(exams)};});
for(const [id,meaningHint]of [['EX7dfa0583','出現；問世（本句為另寫練習句）'],['EX935f8ca2','身體活動量大的；經常活動的（本句為另寫練習句）']]){const row=examples.find(e=>e.exampleId===id);if(!row)throw Error(id);patches.push({dataset:'examples',key:'exampleId',id,before:{meaningHint:row.meaningHint},after:{meaningHint},reason:'Narrow the practice hint to the verified context without altering the sentence or presenting it as an exam quotation.',evidence:'Specific official context and the unchanged practice sentence; see corresponding sense patch.'});}
writeFileSync('docs/unit-audit-20261105/LV1-U07-verified-exam-source-followup.json',JSON.stringify({baseCommit:'29cfc684d7a11b07f09988c478d30358830f1951',scope:'Nine specific exam senses, ten official questions, two authored-practice hints; no whole-word promotion, headword POS expansion or original-sentence rewriting.',patches},null,2)+'\n');
console.log(JSON.stringify({senses:9,questions:10,practiceHints:2}));
