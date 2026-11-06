import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8')),write=(p,v)=>fs.writeFileSync(p,JSON.stringify(v,null,2)+'\n'),hash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex'),path='src/features/direct/curriculumLV2Unit40.json',sourcePath='scripts/sources/LV2Unit40.json',manifestPath='docs/unit-audit-20261105/LV2-U40-curriculum-patches.json',unit=read(path),source=read(sourcePath),patches=[];
if(fs.existsSync(manifestPath))assert.equal(hash(unit),read(manifestPath).beforeHash,'Do not regenerate over applied data');
const add=(id,after,reason)=>{const row=unit.learningItems.find(i=>i.learningItemId===id);assert(row,id);after=Object.fromEntries(Object.entries(after).filter(([k,v])=>JSON.stringify(row[k])!==JSON.stringify(v)));if(!Object.keys(after).length)return;assert(!patches.some(p=>p.id===id));patches.push({id,sourcePage:row.sourcePage,before:Object.fromEntries(Object.keys(after).map(k=>[k,row[k]])),after,reason});};
const printed=[['winged','adj.','有翼的'],['dough','n.','生麵糰'],['misery','n.','痛苦；悲慘'],['deafness','n.','耳聾；失聰'],['soft','adj.','柔軟的；柔和的'],['tender','adj.','溫柔的；柔嫩的'],['mild','adj.','溫和的'],['rough','adj.','粗暴的；粗糙的'],['gentlemen','','gentleman 的複數：先生們'],['table manners','n.','餐桌禮儀'],['ladies','','lady 的複數：女士們'],['jack-o\'-lantern','n.','南瓜燈'],['porridge','n.','粥；麥片粥'],['bok choy','n.','（字典校訂）小白菜、青江菜等；原稿與 Chinese cabbage 並列，菜種不可一概等同'],['vegetable','n.','蔬菜；（形容失去反應或嚴重失能者的貶義用語，應慎用）'],['persistent','adj.','持續的'],['vegetative','adj.','植物的；植物性生長的；（醫學用語）植物狀態的'],['nuts','adj.','（非正式）發狂的；瘋狂的'],['walnut','n.','胡桃'],['cashew','n.','腰果'],['wary','adj.','小心的；謹慎的'],['soy sauce','n.','醬油（美式寫法）'],['soya sauce','n.','醬油（英式寫法）'],['soy milk','n.','豆漿（美式寫法）'],['soya milk','n.','豆漿（英式寫法）'],['moody','adj.','喜怒無常的；心情不穩定的'],['toilet paper','n.','衛生紙（不可數）'],['appear','v.','似乎；看起來（本頁與 seem 對照的用法）'],['dry','adj./v.','乾的；使乾燥；變乾'],['net','n.','網；網路（internet 的簡稱用法）'],['system','n.','系統'],['connect','v.','連接'],['candidate','n.','候選人'],['overload','n./v.','超載；使超載'],['workload','n.','工作量；工作負荷'],['groceries','n.','食品雜貨'],['footprint','n.','腳印'],['fingerprint','n.','指紋'],['block letters','n.','正楷大寫字母；印刷體大寫字母'],['printery','n.','印刷所'],['printing','n.','印刷'],['heroic','adj.','英勇的；英雄般的'],['idol','n.','偶像'],['heroine','n.','女英雄；女主角（與 hero 為性別對應，原稿反義標籤保留）'],['safe','adj.','安全的'],['security','n.','安全；保全'],['danger','n.','危險'],['a coffee shop','n.','咖啡店'],['refreshments','n.','茶點；飲料及簡單食物（通常用複數）'],['cracker','n.','薄脆餅乾'],['chocolate','n.','巧克力'],['salt','n.','鹽'],['sweet','adj.','甜的'],['hot','adj.','辣的（此處味覺對照）'],['spicy','adj.','辛辣的；多香料的'],['sour','adj.','酸的'],['beggar','n.','乞丐']];assert.equal(printed.length,57);assert.deepEqual(printed.map(([w])=>w),source.related.map(r=>r.word));
for(const[word,sensePos,meaning]of printed){const row=unit.learningItems.find(i=>i.displayWord===word&&i.sourceRole!=='main');assert(row,word);const after={sensePos,targetMeaningZh:meaning,chapterMeaningsZh:meaning};if(row.officialWordId)after.meaningSource='textbook_transcription';else assert.equal(row.meaningSource,'unmapped_supplement');add(row.learningItemId,after,'Supply the viewed related-word context in reviewer Chinese; explicit dictionary qualifications are marked and raw print/labels are preserved. Null official identities remain null.');}
const net=unit.learningItems.find(i=>i.learningItemId==='LI-LV2U40-V027');assert(net);const networkZh='網狀系統；電腦網路；使電腦連上網路；建立人脈（字典校訂：network 不以必然小於 Internet 作詞義定義；原稿的範圍說明保留在來源）';add(net.learningItemId,{targetMeaningZh:networkZh,chapterMeaningsZh:networkZh},'Qualify the printed network-size simplification with directly verified dictionary meanings without changing immutable source transcription.');
const explanations=[
 '起飛；飛走。',
 'B 呵護、照顧或指導 A；A 是受到照顧的人。',
 '屬於某組織或政治團體的右派／左派。',
 '沒有事先準備而即興發揮、臨場應對。',
 '將 A 與 B 結合。',
 '聯合起來對抗……。',
 '將 A 與 B 混合。',
 '與某人交往、打交道。',
 'A 與 B 的混合／組合；此處 mix 是名詞。',
 'A 與 B 的混合物／混合；此處 mixture 是名詞。',
 '對……充耳不聞；不願聽從。',
 '女用洗手間；ladies 是 lady 的複數。',
 '第一夫人。',
 'Chinese cabbage 常指大白菜／結球白菜；字典校訂：農業部另將 bok choy／pak choi 對應小白菜、青江菜等，不能把原稿等號當作所有菜種完全相同。',
 '持續性植物狀態；此為醫學用語，不把植物狀態者當作蔬菜稱呼。',
 '大蒜麵包。',
 '一顆檳榔；此處 nut 是名詞。',
 '可指變得極度興奮、憤怒或失去控制；原稿分手語境指氣瘋、大發雷霆。',
 '對……小心、警覺；of 後接要防備的對象。',
 '有心情、想要做某事；to 後接動詞原形，for 後接名詞。',
 '心情好；教材把 good／high 並列。一般常見搭配為 in a good mood 或 in high spirits，原英文轉錄保留。',
 '心情低落；情緒不佳。',
 '全身濕透。',
 'thin skin 比喻容易因批評而受傷；thick skin 比喻不容易被批評影響。也有字面皮薄／厚義。',
 '擤鼻涕。',
 '衛生紙；此處通常作不可數名詞。',
 '一卷衛生紙。',
 '一張／一片衛生紙。',
 '看起來／似乎是……；後接形容詞或適合語境的名詞補語，不把所有名詞補語都判錯。',
 '看起來像某人／某事物。',
 '似乎做……；to 後接動詞原形。',
 '似乎……；that 後接完整子句。',
 '向 B 提到 A；A 是提及的事情，B 是聽者。',
 '提到……；that 後接完整子句。',
 '更不用說……；所列片語是相近表達，名詞與完整子句的接法依各式調整。',
 '未提及某事物；mention 在此是名詞。',
 '吹風機；hair dryer 與 hairdryer 兩種拼法。',
 '上網瀏覽；internet／Internet 及 net／Net 是所列大小寫寫法，不改正式合併詞頭。',
 '與某人建立人脈、交流聯繫，尤指為工作或商業目的。',
 '把 A 連接到 B。',
 '紗門。',
 '用 B 裝滿 A；被動式中 A 是被裝載的容器、車輛等。',
 '以印刷形式出版；指書籍時，也可表示仍可向出版社購得。曾經出版不必然表示目前未絕版，原英文簡式保留。',
 '停印；絕版。',
 '把……列印出來。',
 '為了安全起見。',
 '動詞三態：beg–begged–begged；過去式與過去分詞都雙寫 g。',
 '懇求、乞討某物。',
 '懇求某人做某事。',
 '向某人乞討某物。'
];assert.equal(explanations.length,50);explanations.forEach((explanationZh,index)=>add('LI-LV2U40-G'+String(index+1).padStart(3,'0'),{explanationZh},'Explain the actually viewed construction in reviewer Chinese; raw English, source/order/questions and read_only mode stay unchanged.'));

const projected=structuredClone(unit);for(const p of patches)Object.assign(projected.learningItems.find(i=>i.learningItemId===p.id),p.after);const manifest={unit:'LV2-U40',baseCheckpoint:'ca15841e96b26d1c5000d0beadad926e1423f345',curriculumPath:path,sourcePath,sourceHash:hash(source),beforeHash:hash(unit),afterHash:hash(projected),hashMethod:'SHA-256 of JSON.stringify(parsed object), preserving property order',sourcePagesActuallyViewed:[354,355,356,357,358,359,360,361,362],printedRelatedWords:57,printedUnmappedSupplements:25,grammarExplanations:50,rawSourcePreserved:true,mainDictionaryQualification:'Raw source preserved. Chinese-cabbage naming, network size, heroine gender counterpart and in-print qualifications are marked explicitly; all25 supplements retain null official IDs.',patches};write(manifestPath,manifest);
if(process.argv.includes('--apply')){for(const p of patches){const row=unit.learningItems.find(i=>i.learningItemId===p.id);for(const[k,v]of Object.entries(p.before))assert.deepEqual(row[k],v);Object.assign(row,p.after);}assert.equal(unit.template.deliveryMode,'text_only');assert(unit.learningItems.every(i=>i.practiceMode==='read_only'&&!i.illustration&&!i.originalExample&&!i.officialSenseId));assert.equal(hash(unit),manifest.afterHash);write(path,unit);}console.log(JSON.stringify({rows:patches.length,fields:patches.reduce((n,p)=>n+Object.keys(p.after).length,0),applied:process.argv.includes('--apply')}));
