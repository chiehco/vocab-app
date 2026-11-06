import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8')),write=(p,v)=>fs.writeFileSync(p,JSON.stringify(v,null,2)+'\n'),hash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex'),path='src/features/direct/curriculumLV2Unit38.json',sourcePath='scripts/sources/LV2Unit38.json',manifestPath='docs/unit-audit-20261105/LV2-U38-curriculum-patches.json',unit=read(path),source=read(sourcePath),patches=[];
if(fs.existsSync(manifestPath))assert.equal(hash(unit),read(manifestPath).beforeHash,'Do not regenerate over applied data');
const add=(id,after,reason)=>{const row=unit.learningItems.find(i=>i.learningItemId===id);assert(row,id);after=Object.fromEntries(Object.entries(after).filter(([k,v])=>JSON.stringify(row[k])!==JSON.stringify(v)));if(!Object.keys(after).length)return;assert(!patches.some(p=>p.id===id));patches.push({id,sourcePage:row.sourcePage,before:Object.fromEntries(Object.keys(after).map(k=>[k,row[k]])),after,reason});};
const printed=[['airline','n.','航空公司'],['pursue','v.','追求；追逐'],['emotional','adj.','情緒的；情感的'],['passion','n.','熱情；熱愛'],['feelings','','feelings 為 feeling 的複數：感情；情緒'],['corruption','n.','腐敗；貪污'],['landslide','n.','山崩；滑坡'],['mudslide','n.','土石流'],['sweeper','n.','清掃者；清掃機'],['paint','v.','繪畫；塗漆'],['watercolor','n.','水彩畫'],['a drawing board','','畫板'],['draw','v.','畫'],['pastel','n.','粉彩筆；粉彩畫'],['novelist','n.','小說家'],['novelty','n.','新奇；新奇的事物'],['unusual','adj.','不尋常的'],['locomotive','n.','火車頭'],['tiresome','adj.','令人厭煩的'],['spaghetti','n.','義大利麵（不可數）'],['gem','n.','寶石'],['ruby','n.','紅寶石'],['pendant','n.','有垂飾的項鍊'],['power','n.','力量；權力；電力'],['strong','adj.','強壯的'],['powerless','adj.','無力的；無權的'],['proof','n.','證據'],['generosity','n.','慷慨'],['stingy','adj.','吝嗇的'],['calmness','n.','鎮定；平靜'],['nervous','adj.','緊張的'],['stormy','adj.','暴風雨的'],['week','n.','星期；週'],['weekend','n.','週末'],['weekly','adj./adv.','每週的；每週一次'],['dailies','','daily 的複數：日報'],['diaries','','diary 的複數：日記；日記簿'],['toothpaste','n.','牙膏'],['rusty','adj.','生鏽的'],['toffee','n.','太妃糖'],['sticky','adj.','黏的'],['lonely','adj.','孤單的；寂寞的'],['along','prep.','沿著'],['only','adj.','唯一的'],['solely','adv.','僅；只']];assert.equal(printed.length,45);assert.deepEqual(printed.map(([w])=>w),source.related.map(r=>r.word));
for(const[word,sensePos,meaning]of printed){const row=unit.learningItems.find(i=>i.displayWord===word&&i.sourceRole!=='main');assert(row,word);const after={sensePos,targetMeaningZh:meaning,chapterMeaningsZh:meaning};if(row.officialWordId)after.meaningSource='textbook_transcription';else assert.equal(row.meaningSource,'unmapped_supplement');add(row.learningItemId,after,'Supply the inspected printed related-word sense with reviewer Chinese phrasing; preserve null mappings and distinguish it from the full general-word dictionary.');}
for(const[word,meaning]of [['motorcycle','機車（教材以 250 c.c. 以上作分類；字典的一般英語詞義不限此排氣量）'],['scooter','小型機車；滑板車（教材列 50–250 c.c. 作機車分類；字典詞義不限此排氣量）']]){const row=unit.learningItems.find(i=>i.displayWord===word);assert(row);add(row.learningItemId,{targetMeaningZh:meaning,chapterMeaningsZh:meaning},'Keep the raw printed cc distinction in the immutable source while visibly separating that textbook classification from the directly read general dictionary meaning. No current vehicle-law classification is asserted.');}
const explanations=[
 '空服員。',
 '機組人員。',
 'flight deck 指駕駛艙；flight path 指飛行路徑。',
 '飛起；逃走。',
 '此處以一架飛機示範 an aircraft；aircraft 單複數同形。字典中的 aircraft 也包括直升機等航空器，不能把所有 aircraft 一概等同 airplane。',
 '兩架飛機；aircraft 的複數仍是 aircraft，不加 s。此處以 airplanes 示範飛機的複數。',
 '在 A 身上／裡面搜尋 B；A 是受搜查的人或地方，B 是要找的東西。',
 '搜尋；尋找……。',
 '前去尋找……。',
 '動詞三態：seek–sought–sought。',
 '設法／力求做某事。',
 '追趕某人；依語境也可指追求某人。',
 '激動地；充滿感情地。',
 '學校操場。',
 '在遊樂場裡。',
 '動詞三態：swing–swung–swung。',
 '盪鞦韆。',
 '正熱烈進行；處於全盛或活躍階段。',
 '熟悉並適應事情的節奏或做法。',
 '動詞三態：slide–slid–slid。',
 '滑下溜滑梯。',
 '對某事不加處理或追究；任其過去。',
 '玩蹺蹺板。',
 '動詞三態：sweep–swept–swept。',
 '贏得所有獎項或可取得的勝利。',
 '席捲／迅速掃過某地。',
 '把某地快速打掃一下。',
 '用拖把拖地。',
 'score 可指二十或約二十個，原稿的「左右」有詞典支持。接明確數字作二十計數單位時通常不加 s，如 two score；scores of 則表示大量，不能把所有用法都說成沒有複數。',
 '知道真相；了解實際情況。',
 '考試得高分／低分。',
 '撕裂／急速移動義的三態是 tear–tore–torn；與眼淚相關的另一讀音／用法應分開，不把這一組無條件套到全部同形詞。',
 '含著淚；流著淚。',
 '把……撕成碎片。',
 '撕碎／撕毀……。',
 '拆除……。',
 '油畫／水彩畫。',
 '回到起點重新構思或設計。',
 '對……感到厭倦。',
 '車子輪胎洩氣或爆胎。',
 '寶箱。',
 '一對耳環；earring 的複數是 earrings。',
 '對……造成損害。',
 '向某人證明……。',
 '結果證明是……。',
 '對某人慷慨／寬大。',
 '某人做某事很慷慨／寬宏大量；of sb 指做出該行為的人。',
 '保持鎮定。',
 '使某人平靜下來；鎮定下來。',
 '暴風雨前的平靜；也可比喻動盪或困難來臨前的暫時平靜。',
 '陽曆／陰曆。',
 '每天；以每日為頻率。',
 '教材偏好 keep a diary 表示記日記，原英文標記保留。此標記不能當作普遍禁令：British Council 實際使用 write a diary；也可說 write in a diary 或 write a diary entry。',
 '教材偏好 keep a journal 表示記日誌，原英文標記保留。此標記不能當作普遍禁令：British Council 教案實際使用 write a journal；也可說 write in a journal 或 write a journal entry。',
 '把 A 黏到 B 上。to／onto 後的 B 是黏貼位置，不是目的不定詞。',
 '字面是被黏在某物上；比喻注意力被牢牢吸引，如目不轉睛地看螢幕。',
 '一條／一管牙膏。',
 '動詞三態：stick–stuck–stuck。',
 '黏住某物；堅守／遵守某事。',
 '黏在一起；團結一致。',
 '別離開；留下。',
 '不打擾某人；讓某人獨處。',
 '更不用說……；別說……。'
];assert.equal(explanations.length,63);explanations.forEach((explanationZh,index)=>add('LI-LV2U38-G'+String(index+1).padStart(3,'0'),{explanationZh},'Explain the viewed original construction in reviewer Chinese, with explicit dictionary qualifications where needed. Preserve every original English pattern, page, order, question and read_only mode.'));

const projected=structuredClone(unit);for(const p of patches)Object.assign(projected.learningItems.find(i=>i.learningItemId===p.id),p.after);const manifest={unit:'LV2-U38',baseCheckpoint:'ccec8402668d2c6ee27226a2b30d94d9ecaea21e',curriculumPath:path,sourcePath,sourceHash:hash(source),beforeHash:hash(unit),afterHash:hash(projected),hashMethod:'SHA-256 of JSON.stringify(parsed object), preserving property order',sourcePagesActuallyViewed:[336,337,338,339,340,341,342,343,344],printedRelatedWords:45,printedUnmappedSupplements:19,grammarExplanations:63,rawSourcePreserved:true,mainDictionaryQualification:'Motorcycle/scooter cc boundaries are preserved as printed textbook classifications with explicit dictionary qualifications. Write/keep diary/journal and score count are likewise distinguished from universal rules; all raw source and original patterns remain unchanged.',patches};write(manifestPath,manifest);
if(process.argv.includes('--apply')){for(const p of patches){const row=unit.learningItems.find(i=>i.learningItemId===p.id);for(const[k,v]of Object.entries(p.before))assert.deepEqual(row[k],v);Object.assign(row,p.after);}assert.equal(unit.template.deliveryMode,'text_only');assert(unit.learningItems.every(i=>i.practiceMode==='read_only'&&!i.illustration&&!i.originalExample&&!i.officialSenseId));assert.equal(hash(unit),manifest.afterHash);write(path,unit);}console.log(JSON.stringify({rows:patches.length,fields:patches.reduce((n,p)=>n+Object.keys(p.after).length,0),applied:process.argv.includes('--apply')}));
