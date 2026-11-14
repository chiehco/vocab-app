import {readFileSync,writeFileSync} from 'node:fs';
const read=p=>JSON.parse(readFileSync(p,'utf8'));
const source=read('output/unit-audit-20261105/LV1-U04-full-source.json'),before=read('output/unit-audit-20261105/U04-ui-before.json');
const notes=[
 '成人女性角色登門帶水果，孩子迎接；星期日與親屬身分為句子提供。','角色背包從鄉間小鎮方向走來，支持來自鄉間小鎮。','兩角色看電視鳥類自然節目。','夜市食物攤、吃麵與包子烤串，核心食物情境相符。','晨光下麵包店開門，鐘短針七、長針十二，七點清楚。','教室站凳掛大鐘，動作與場景清楚。','高鐵車內時計沙漏與窗外列車，兩小時為原句近似時間，不強求像素證實。','角色持日程本、舉一指示意稍等，旁沙漏，查行程一分鐘合理簡化。','角色思考並檢查報告及另一張紙，anything else抽象用法可理解。','鄰居門口贈一籃柳橙。','濕路水窪上開車，專注謹慎表情，雨後小心駕駛一致。','過街前角色左右看交通，支持危險提示句的安全對照，不要求畫出事故。','多名學生在有課本的桌前用電腦。','攜書背包角色在住宅與校舍旁，支持家附近大學生。','教師面向舉手學生，鼓勵提問核心一致。','戴眼鏡年長女性指導孩子桿餅乾麵團，烘焙教學一致。','晴朗夜空繁星及望遠鏡，數千為遠景象徵。','背包學生大隊健行，代表數百人參與；慈善目的與上週六為句子提供。','城市夜間大群人看煙火，支持數千人聚集的代表性簡化。','角色將舊書裝箱，捐贈為後續目的可省略。','孩子興奮指公園枝上藍橘小鳥。','腳印顯示折返回家，門內雨傘、雨中回頭角色，again核心清楚。','行李箱旁尚有幾樣物品待裝。','餐飲工作場景投幣儲蓄罐，旁手機，打工存錢核心一致。','雙手小心放花瓶於木桌。','角色以鮮豔蠟筆替圖畫著色。','雪景窗前角色穿藍色冬外套，防寒核心一致。','紅色洋裝角色在有氣球餐點的派對。','儲藏箱中泛黃舊信件，時間經過為靜態合理簡化。','臥室以滾筒刷柔綠牆壁。','成人製作並給較小角色三明治，for對象清楚。','兩角色室內，窗外大雨，因雨留屋內一致。','夕陽地平線，角色準備圍圍巾，日落後變涼的未來情境一致。','雨中一角色把傘提供給較小濕身角色，許可借傘清楚。','海邊角色玩球堆沙堡，玩得開心的time片語一致。','背書包角色在學校旁上公車，搭車上學清楚。'
];
if(notes.length!==source.length)throw Error('Scope mismatch');
const cards=source.map((c,i)=>{
 const ui=before.find(r=>r.id===c.id),missing=!ui.imageInfo.length,pairRepair=[9,28].includes(i+1);
 return {id:c.id,word:c.word,officialWordId:c.officialWordId,sourceOfficialWordId:c.sourceOfficialWordId,
  sourceImage:c.sourceImage,sourceImageSha256:c.sourceImageSha256,captionEn:c.captionEn,captionZh:c.captionZh,
  pixelReview:'agent actually viewed original PNG contact sheets (660px, every labeled image) and five published cards in actual UI',
  observation:notes[i],contactSheet:`output/unit-audit-20261105/sheets/U04/${String(Math.floor(i/4)*4+1).padStart(2,'0')}-${String(Math.min(Math.floor(i/4)*4+4,source.length)).padStart(2,'0')}.png`,
  generalCardRepair:missing||pairRepair,repairReason:missing?'actual general card displayed missing-image placeholder':pairRepair?(i+1===9?'existing fruit-choice illustration paired with forgot-meeting/or-else sentence':'legacy red painter sprite paired with a red-dress party sentence'):'existing exact image/caption retained',
  generalBeforeImagePaths:ui.imageInfo.map(i=>i.src),generalBeforeHeroScreenshot:`output/playwright/unit-audit/${c.id}-general-hero-before-art.png`,
  generalCardIntegration:'not_changed',sourceUnitPublished:c.published,draftUnitPublication:'unchanged'};
});
writeFileSync('docs/unit-audit-20261105/LV1-U04-original-image-review.json',JSON.stringify({reviewer:'Codex agent under user comprehensive review-and-fix authorization',unitDrafts:36,previouslyPublishedPairs:5,
 counts:{originalPairsViewed:36,actualPublishedCardsViewed:5,missingGeneralImages:17,generalPairingRepairs:2,localGeneralRepairs:19},cards,publication:{push:false,deploy:false,draftUnitEnrollment:false}},null,2)+'\n');
console.log(JSON.stringify({reviewed:36,repairIds:cards.filter(c=>c.generalCardRepair).map(c=>c.id)}));
