import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8')),write=(p,v)=>fs.writeFileSync(p,JSON.stringify(v,null,2)+'\n'),hash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex'),path='src/features/direct/curriculumLV2Unit39.json',sourcePath='scripts/sources/LV2Unit39.json',manifestPath='docs/unit-audit-20261105/LV2-U39-curriculum-patches.json',unit=read(path),source=read(sourcePath),patches=[];
if(fs.existsSync(manifestPath))assert.equal(hash(unit),read(manifestPath).beforeHash,'Do not regenerate over applied data');
const add=(id,after,reason)=>{const row=unit.learningItems.find(i=>i.learningItemId===id);assert(row,id);after=Object.fromEntries(Object.entries(after).filter(([k,v])=>JSON.stringify(row[k])!==JSON.stringify(v)));if(!Object.keys(after).length)return;assert(!patches.some(p=>p.id===id));patches.push({id,sourcePage:row.sourcePage,before:Object.fromEntries(Object.keys(after).map(k=>[k,row[k]])),after,reason});};
const printed=[['thirst','n.','口渴；渴望'],['trustee','n.','（財產）受託人；託管人'],['believe','v.','相信；信仰（與 in 連用）'],['relations','','relation 的複數：（人與人或國家之間的）關係'],['neighborhood','n.','鄰近地區'],['neighborly','adj.','親切的'],['gesture','n.','表示；表達態度的舉動'],['wilderness','n.','荒野'],['wildlife','n.','野生動植物'],['release','v.','釋放'],['freeway','n.','高速公路'],['expressway','n.','高速公路'],['superhighway','n.','超級高速公路'],['mph','','miles per hour 的縮寫：每小時英里數'],['foxes','','fox 的複數：狐狸'],['foxy','adj.','狡猾的；性感迷人的'],['cunning','adj.','狡猾的'],['wolves','','wolf 的複數：狼'],['stripe','n.','條紋'],['reindeer','n.','馴鹿'],['Santa','n.','聖誕老人'],['sheep','n.','羊（單複數同形）'],['mimic','v.','模仿'],['monkey','n.','猴子'],['chimpanzee','n.','黑猩猩'],['gorilla','n.','大猩猩'],['grapefruit','n.','葡萄柚'],['wine','n.','葡萄酒'],['strawberries','','strawberry 的複數：草莓'],['berry','n.','莓果；漿果'],['blueberry','n.','藍莓'],['blackberry','n.','黑莓'],['cranberry','n.','蔓越莓；小紅莓'],['mulberry','n.','桑葚'],['raspberry','n.','覆盆子'],['be in season','','正值產季'],['peaches','','peach 的複數：桃子'],['juicy','adj.','多汁的'],['avocado','n.','酪梨'],['melon','n.','甜瓜'],['dance','n./v.','跳舞；舞蹈；舞步；舞曲'],['policemen','','policeman 的複數：男警察'],['police','n.','警方（集合名詞）'],['policewoman','n.','女警察'],['policewomen','','policewoman 的複數：女警察'],['hunting','n.','打獵'],['search','n./v.','尋找'],['robber','n.','搶匪'],['primitive','adj.','原始的'],['baker','n.','麵包／糕點師'],['bakeries','','bakery 的複數：麵包店'],['bin','n.','垃圾箱（英式）'],['pepper','n.','甜椒（可數）；胡椒粉（不可數）'],['bell pepper','n.','甜椒'],['recommend','v.','推薦'],['mutton','n.','羊肉（不可數）'],['mint','n.','薄荷'],['creature','n.','生物'],['wooden','adj.','木製的；呆板的'],['woody','adj.','很多樹木的'],['hairpin','n.','髮夾'],['rush','n./v.','衝；匆忙行動'],['hasten','v.','催促；急忙；趕快'],['haste','n.','匆忙；急促']];assert.equal(printed.length,64);assert.deepEqual(printed.map(([w])=>w),source.related.map(r=>r.word));
for(const[word,sensePos,meaning]of printed){const row=unit.learningItems.find(i=>i.displayWord===word&&i.sourceRole!=='main');assert(row,word);const after={sensePos,targetMeaningZh:meaning,chapterMeaningsZh:meaning};if(row.officialWordId)after.meaningSource='textbook_transcription';else assert.equal(row.meaningSource,'unmapped_supplement');add(row.learningItemId,after,'Supply the actually viewed printed related-word sense in reviewer Chinese; null identities remain null and full dictionary meanings remain separate.');}
const explanations=[
 '渴望某事物；此片語中的 thirst 是動詞，與另列的名詞口渴／渴望分開。',
 '信任某人而把某物或某件事託付給他；sb 是受託的人，sth 是所託付的事物。',
 '信任……；信仰……。',
 '對……有信任；trust 在此是名詞。',
 '彼此信任；互信。',
 '缺乏信任。',
 '變得極度興奮或不受控制；也可依上下文指勃然大怒。',
 '非常喜愛……；對……著迷。',
 '在自然／野生環境中；此處 wild 是名詞。',
 '在偏遠荒僻的……地區；此義通常使用複數 wilds。',
 '野生生長；不經人工栽培。',
 '不受控制地奔跑、蔓延或行動；如想像力自由奔放。',
 '在公路上。',
 '公路巡邏警察／隊；依語境指執行公路巡邏的人員或單位。',
 '三態可列 speed–sped/speeded–sped/speeded；用法有差別：Collins 對快速行進偏好 sped，對 speed up 偏好 speeded。不是每種構式都無條件互換。',
 'mph 是 miles per hour 的縮寫，表示每小時英里數；不是每小時公里數。',
 '以高速。',
 '以……的速度；of 後接明確速率，如時速若干英里。',
 '加速；使進行得更快。',
 'deer 的複數通常仍作 deer；詞典也列 deers 變體。保留原稿兩式，不把變體當錯字。',
 'reindeer 的複數可作 reindeer 或 reindeers；不新增正式詞頭或變體映射。',
 '完整詞 hippopotamus 的複數可作 hippopotamuses；原稿的 hippos 是簡稱 hippo 的複數，不是把全詞直接縮成另一種詞尾。',
 '一個木瓜；教材原用「一條」，中文量詞會依果形與語境選擇，不把量詞差異直接當成英文單複數錯誤。',
 '一片／一塊木瓜；slice 指切片，piece 指一塊。',
 'mango 的複數可作 mangos 或 mangoes。',
 '動詞三態：step–stepped–stepped。',
 '步入／走進……。',
 '走路時小心腳下；也可比喻小心言行。one’s 隨說話對象變化，不是叫人觀察某人的腳步。',
 '逐步地；一步一步地。',
 '字面可指邁出一步；take steps to V 表示採取措施／行動做某事。',
 '步伐或舞步不一致；也可比喻與他人的想法不一致。',
 '教材示範 write in ink 表示用墨水書寫，原英文正誤標記保留；with ink 不能當作普遍禁令，Smithsonian 第一手訪談逐字稿有 write with ink 的實際用例。',
 '去打獵；參加一次狩獵行動。',
 '尋找……；hunt for 後接要找的對象。',
 '尋找……的行動；hunt 在此是名詞。',
 '烘焙義賣活動。',
 '做漢堡用的小圓麵包。',
 '動詞三態：jam–jammed–jammed。',
 '交通阻塞；塞車。',
 '被困在車陣中；遇到塞車。',
 '陷入困境；遇到困難。',
 '舉辦／參加烤肉聚會；barbecue 在此是可數名詞。',
 '一份小羊排。',
 '如待宰羔羊；比喻毫無防備地面對危險。',
 'lamb 的字尾 b 不發音。',
 '森林火災。',
 '雨林；rain forest 與 rainforest 兩種寫法均可。',
 '在樹林／森林裡；wood 可用單數表示一片樹林，不是指在單一樹木內。',
 '動詞三態：hurry–hurried–hurried。',
 '快一點；趕快。',
 '匆忙地；in a hurry / in a rush 有冠詞 a，in haste 沒有冠詞 a。',
 '急於／匆忙地做某事；to 後接動詞原形。'
];assert.equal(explanations.length,52);explanations.forEach((explanationZh,index)=>add('LI-LV2U39-G'+String(index+1).padStart(3,'0'),{explanationZh},'Explain the viewed original construction in reviewer Chinese; preserve raw English pattern, source/order/questions and read_only mode.'));

const projected=structuredClone(unit);for(const p of patches)Object.assign(projected.learningItems.find(i=>i.learningItemId===p.id),p.after);const manifest={unit:'LV2-U39',baseCheckpoint:'4e71e3a822d401b7b4f2042a7c3689a7d85cfdd2',curriculumPath:path,sourcePath,sourceHash:hash(source),beforeHash:hash(unit),afterHash:hash(projected),hashMethod:'SHA-256 of JSON.stringify(parsed object), preserving property order',sourcePagesActuallyViewed:[345,346,347,348,349,350,351,352,353],printedRelatedWords:64,printedUnmappedSupplements:29,grammarExplanations:52,rawSourcePreserved:true,mainDictionaryQualification:'Raw source preserved. Speed form preferences, hippo abbreviation/plural and ink medium wording are qualified explicitly; no official identity is invented for the29 related supplements.',patches};write(manifestPath,manifest);
if(process.argv.includes('--apply')){for(const p of patches){const row=unit.learningItems.find(i=>i.learningItemId===p.id);for(const[k,v]of Object.entries(p.before))assert.deepEqual(row[k],v);Object.assign(row,p.after);}assert.equal(unit.template.deliveryMode,'text_only');assert(unit.learningItems.every(i=>i.practiceMode==='read_only'&&!i.illustration&&!i.originalExample&&!i.officialSenseId));assert.equal(hash(unit),manifest.afterHash);write(path,unit);}console.log(JSON.stringify({rows:patches.length,fields:patches.reduce((n,p)=>n+Object.keys(p.after).length,0),applied:process.argv.includes('--apply')}));
