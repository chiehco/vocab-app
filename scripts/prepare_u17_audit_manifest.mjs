import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,copyFileSync} from 'node:fs';
const read=p=>JSON.parse(readFileSync(p,'utf8'));
const data=Object.fromEntries(['words','examples','senses'].map(k=>[k,read(`public/data/v1/${k}.json`)]));
const proposals=read('output/unit-audit-20261105/U17-TEXT-CURRICULUM-CANDIDATES.json');
const patches=[],url=w=>'https://www.merriam-webster.com/dictionary/'+encodeURIComponent(w);
function add(dataset,key,id,after,reason,evidence){
 const row=data[dataset].find(r=>r[key]===id);assert.ok(row,id);
 after=Object.fromEntries(Object.entries(after).filter(([k,v])=>JSON.stringify(row[k])!==JSON.stringify(v)));
 if(!Object.keys(after).length)return;
 let p=patches.find(p=>p.dataset===dataset&&p.id===id);
 if(!p){p={dataset,key,id,before:{},after:{},reason,evidence};patches.push(p);}
 for(const[k,v]of Object.entries(after)){assert.ok(Object.hasOwn(row,k),id+':'+k);assert.ok(!(k in p.after)||JSON.stringify(p.after[k])===JSON.stringify(v),'Conflicting patch '+id+':'+k);p.before[k]=row[k];p.after[k]=v;}
 p.reason+=' '+reason;p.evidence+=' ; '+evidence;
}
for(const p of proposals.proposals.filter(p=>p.after!==null&&['formalWords','formalExamples'].includes(p.domain))){
 const dataset=p.domain==='formalWords'?'words':'examples',key=dataset==='words'?'wordId':'exampleId';
 const current=data[dataset].find(r=>r[key]===p.id);assert.equal(current[p.field],p.before,`Latest before differs: ${p.proposalId}`);
 add(dataset,key,p.id,{[p.field]:p.after},p.classification+': '+p.reasonZh,p.sourceURL.join(' ; '));
}
const word=(id,after,reason,evidence)=>add('words','wordId',id,after,reason,evidence??url(data.words.find(w=>w.wordId===id).word.split('/')[0]));
const old=id=>data.words.find(w=>w.wordId===id);
word('W000746',{meaningEn:old('W000746').meaningEn+'; (adv.) in second place; (n.) a person who assists or supports another.',meaningZh:'（名詞）秒；瞬間；第二名；支持者；（形容詞）第二的；（副詞）第二地',usagePatternZh:'一秒鐘（一會兒）；第二個……；等一下'},'Restore the existing adjective/adverb and retain the genuine supporter noun. Preserve headword POS.');
word('W000173',{meaningEn:old('W000173').meaningEn+'; (n.) an act of climbing or going up.'},'Add the already formal noun shown by a steep climb without deleting either verb sense.');
word('W000346',{meaningZh:'（名詞）禮物；贈予；天才；（另列動詞用法）賦予',usagePatternZh:'給某人的禮物；有……的天賦／有做……的天賦；生日禮物'},'Label the genuine related verb rather than delete it; explain the exact talent construction without literal grammar tokens.');
word('W000675',{meaningEn:old('W000675').meaningEn+'; (v.) to give, show, introduce or formally offer something; to aim a weapon.',meaningZh:'（名詞）現在；禮品；（動詞）瞄準；贈送；呈現；介紹；（形容詞）現在的',usagePatternZh:'目前；當前情況；給某人的禮物'},'Restore the formal verb missing from the summary and preserve the verified aiming sense.');
word('W000446',{meaningEn:old('W000446').meaningEn+'; something that brings happiness; (archaic transitive verb) to gladden.',meaningZh:'（名詞）歡喜；樂事；高興；（古及物動詞用法）使快樂'},'Keep the genuine historical causative verb explicitly separate from the noun. Do not expand headword POS.');
word('W000752',{meaningEn:old('W000752').meaningEn+'; (n.) a punishment formally ordered by a court.',meaningZh:'（名詞）句子；命題；判決；（動詞）宣判；判刑'},'Add the punishment noun printed in the textbook; retain the proposition and sentencing verb.');
word('W000179',{meaningZh:'（名詞）外套；外面覆蓋的一層；（動詞）給……穿外套；塗覆',usagePatternZh:'穿上／脫下外套；一層油漆；把某物塗在另一物的表面'},'The already formal coating verb appears in the exact source coat A with B and formal coated example.');
word('W000441',{meaningEn:old('W000441').meaningEn+'; (related verb) to put a jacket or protective covering on.',meaningZh:'（名詞）夾克；外套；護套；（另列動詞用法）給……穿夾克'},'Keep the inherited casing noun and jacket verb explicitly labeled; no headword POS change.');
word('W000515',{meaningEn:old('W000515').meaningEn+'; (v., chiefly US) to send by post; (separate noun) armor made from metal links or plates.',meaningZh:'（名詞）郵件；郵政；郵遞；盔甲；（動詞）郵寄'},'Restore the formal mailing verb while retaining genuine separate armor noun.');
word('W000261',{meaningZh:'（名詞）電子信函；（動詞）寄電子郵件',usagePatternZh:'發送／接收電子郵件；查看自己的電子郵件；寄電子郵件給某人；回覆電子郵件'},'Add the already formal email verb rather than describe only the electronic-message noun.');
word('W000796',{meaningEn:old('W000796').meaningEn+'; (v.) to move or extend along a winding course.',meaningZh:'（名詞）蛇；陰險的人；（動詞）曲折行進；迂迴'},'Restore the already formal winding verb from the original p155 constructions; keep both inherited nouns.');
word('W000789',{meaningEn:'(adj.) slender; very small in amount or likelihood; (related verb) take off weight; being of delicate or slender build',usagePatternZh:'保持／變得苗條；機會很小'},'Retain the genuine slimming verb and restore the selected adjective and slim-chance meaning.');
word('W000337',{meaningEn:old('W000337').meaningEn+'; (adj.) enjoyable or amusing; (related verb) to joke or play.',meaningZh:'（名詞）樂趣；玩笑；娛樂；（另列動詞用法）開玩笑'},'Keep the genuine related verb and explain the adjective printed in the textbook without changing formal POS.');
word('W000137',{meaningZh:'照相機；攝影機；（法律）法官的私人辦公室；暗箱'},'Qualify the independently verified camera² room noun, rather than remove it as unrelated.', 'https://www.dictionary.com/browse/camera ; U17-RARE-SUMMARY-VERIFICATION.json');
word('W000639',{meaningZh:'（名詞）相片；照片；（photograph 的比喻義）逼真的描繪；（動詞）照相'},'The historical figurative noun is verified for photograph; do not automatically extend it to the alternate photo head. Preserve the existing formal combined head.', 'U17-RARE-SUMMARY-VERIFICATION.json ; Webster scan printed p1625');
word('W000506',{meaningZh:'大聲的；（表達意見等）反覆而強烈的；喧吵的；高聲地',usagePattern:'a loud noise/voice; be loud; speak/laugh loud',usagePatternZh:'巨大的聲響／響亮的聲音；很大聲；大聲說話／笑'},'Qualify the persistent-emphatic opinion sense and use the existing formal loud adverb rather than silently switching the head to loudly.', 'https://www.wordsmyth.net/?ent=loud ; https://www.collinsdictionary.com/dictionary/english/loud');
word('W001655',{meaningZh:'（名詞）柱；杆；準星；郵件；（動詞）郵寄；張貼；發布'},'Retain every inherited noun and add the existing posting and mailing verbs.');
word('W001764',{meaningEn:'(n., American football) the defensive football players who line up behind the linemen; (adj.) being of second rank or importance or value; not direct or immediate'},'Label, rather than delete, the genuine football noun which is separate from the formal adjective.');
word('W000109',{usagePatternZh:'一瓶……；瓶裝水；嬰兒的奶瓶'},'Remove literal noun-token wording from a bottle of N while preserving all three groups.');
word('W003740',{usagePattern:'photography; the photography of N',usagePatternZh:'攝影；……的攝影'},'Do not imply that uncountable photography normally takes an indefinite article.');
word('W005122',{usagePattern:'caffeine; contain caffeine',usagePatternZh:'咖啡因；含有咖啡因'},'Use the existing mass noun in clear constructions.');
for(const[id,after]of [['EXf9081357',{sensePos:'n.'}],['EX96488501',{meaningHint:'不對勁的；有問題的'}],['EXec450963',{meaningHint:'錯誤的；不正確的'}]])add('examples','exampleId',id,after,'Narrow an existing composite POS or mixed nonempty hint to the unchanged wait-a-second / phone / answers context. Do not fill any empty hint.',url(data.examples.find(e=>e.exampleId===id).word));
for(const id of ['EXda67eaf4','EX5b4e27ea','EX55bde99e'])add('examples','exampleId',id,{status:'reviewed'},'Read the complete authored practice, Chinese, cloze and answer. The exam exercise label is not certified as an official question quotation.',url(data.examples.find(e=>e.exampleId===id).word));
for(const id of ['W000314-1','W000314-2','W000314-3','W000746-1','W000746-2','W000746-3','W000751-1','W000643-1','W000643-2']){
 const s=data.senses.find(s=>s.senseId===id);assert.equal(s.isExamSense,false);
 add('senses','senseId',id,{status:'reviewed',note:'2026-11-05：逐句核對本義、實際挖空詞與既有英中練習；僅本義的核查，不等於整詞全部義項或官方考題來源認證。'},'Review this existing non-exam sense against the unchanged examples and source definitions.',url(s.word));
}
copyFileSync('output/unit-audit-20261105/LV1-U17-full-source.json','output/unit-audit-20261105/LV1-U17-source-before.json');
writeFileSync('docs/unit-audit-20261105/LV1-U17-patches.json',JSON.stringify({baseCommit:'29cfc684d7a11b07f09988c478d30358830f1951',unit:'LV1-U17',originalSentencesPreserved:true,scope:'89 vocabulary occurrences, 53 usage items, 62 unique formal words and 91 unique formal examples read. Empty hints are not missing fields. Whole-word statuses and headword POS remain unchanged.',patches},null,2)+'\n');
console.log(JSON.stringify({patches:patches.length,byDataset:Object.fromEntries(['words','examples','senses'].map(k=>[k,patches.filter(p=>p.dataset===k).length]))}));
