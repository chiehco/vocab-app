import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync} from 'node:fs';
const path='src/features/vocabulary/auditedWordIllustrations.json',cards=JSON.parse(readFileSync(path,'utf8'));
assert.equal(cards.length,329);assert.ok(!cards.some(c=>c.officialWordId==='W000283'));
const media=JSON.parse(readFileSync('public/data/v1/media.json','utf8')).find(m=>m.assetId==='AXef4443f3');
assert.ok(media);assert.equal(media.captionZh,'這頂皇冠要很多錢，非常昂貴。');
const illustration={path:'wordbeast/lv1/W000283.png',captionEn:'This crown costs a lot of money and is very expensive.',captionZh:media.captionZh};
const hash=x=>createHash('sha256').update(x).digest('hex');
const proof={unit:'LV1-U18',scope:'One exact general legacy caption pair only. Text-only curriculum retains zero adopted images.',state:'exact_caption_prepared_not_ui_verified',previousRegistryHash:hash(JSON.stringify(cards)),cards:[{id:'LI-LV1U18-V045',word:'expensive',officialWordId:'W000283',pixelReview:'actually viewed original 1024 x 1024 PNG and labeled contact sheet',observation:'A jeweled crown is shown with many coins, supporting high cost. No phone is pictured. The formal phone sentence remains separate and unchanged.',captionEn:illustration.captionEn,captionZh:illustration.captionZh,captionSource:'Exact existing media caption AXef4443f3. English is an independently authored translation, not a textbook or examination quotation.',publishedImageSha256:hash(readFileSync('public/'+illustration.path)),imageDimensions:[1024,1024],imageUnmodified:true,formalPhoneExamplePreserved:'EX7c7366a9',sourceUnitPublished:false}]};
writeFileSync('docs/unit-audit-20261105/LV1-U18-original-image-review.json',JSON.stringify(proof,null,2)+'\n');
if(process.argv.includes('--apply')){cards.push({reviewId:'LI-LV1U18-V045',officialWordId:'W000283',aliases:['expensive'],illustration});writeFileSync(path,JSON.stringify(cards,null,2)+'\n');}
console.log(JSON.stringify({prepared:1,applied:process.argv.includes('--apply'),imageHash:proof.cards[0].publishedImageSha256}));
