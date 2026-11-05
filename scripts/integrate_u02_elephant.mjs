import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const read=p=>JSON.parse(readFileSync(p,'utf8')),write=(p,v)=>writeFileSync(p,JSON.stringify(v,null,2)+'\n');
const sha=p=>createHash('sha256').update(readFileSync(p)).digest('hex');
const id='LV1-U02-08',oldPath='wordbeast/lv1-reviewed/LV1-U02-08-d5dd7302b647.webp',newPath='wordbeast/lv1-reviewed/LV1-U02-08-7426b87a0d8e.webp';
const expected='445728d61fb0f9c4b7ca8cd52c9861a93d2c9baadd7d08644b5b1e4c7d15257f';
if(sha('public/'+newPath)!==expected||sha('public/'+oldPath)!=='4e05c2d51561a77fd81c7649ec3ab41a82842df48caec83a7706f5a57ec95375')throw Error('Unexpected asset bytes');
const manifestPath='src/features/vocabulary/lv1ReviewedImages.json',cards=read(manifestPath),card=cards.find(c=>c.id===id);
if(card.illustration.path!==oldPath||card.illustration.captionEn!=='The elephant used its trunk to spray water.')throw Error('Unexpected current pair; inspect before retry');
const approvalsPath='scripts/approvals/lv1-images-20260922.json',approvals=read(approvalsPath),record=approvals.find(c=>c.id===id);
const proofPath='docs/unit-audit-20261105/LV1-U02-elephant-review.json';
const proof={id,officialWordId:card.officialWordId,state:'locally_integrated_not_ui_verified',unchangedCaption:structuredClone(card.illustration),previousApproval:structuredClone(record),
 originalAsset:{path:oldPath,sha256:sha('public/'+oldPath),retained:true},newAsset:{path:newPath,sha256:expected,dimensions:[1254,1254],sizeBytes:122508,
  assetCommit:'9c4f44687b54fe2083fca7e2925baaf13e9503e2',gitBlob:'8c8bcab6e4a55a8f5b249043302fbe9106ffadfd'},
 pixelReview:{state:'agent actually viewed original compressed replacement WebP in this environment',observation:'One raised elephant trunk sprays water. The two extra gray tube-like appendages are absent; the mouth is normal. The four legs, apple-holding olive character, riverside setting and watercolor paper style remain.'},
 authorization:'User authorized repair of confirmed image errors while retaining the original sentence and recoverable originals.',uiVerification:null};
write(proofPath,proof);record.previousApproval=proof.previousApproval;
Object.assign(record,{sourceImage:newPath.split('/').pop(),sourceImageSha256:expected,publishedImageSha256:expected,
 approvalSource:proofPath,approvalSha256:sha(proofPath),repairBasis:'User-authorized agent correction of confirmed anatomy error; not a new per-image user approval.'});
card.illustration.path=newPath;write(manifestPath,cards);write(approvalsPath,approvals);
const indexPath='public/wordbeast/lv1-reviewed/index.html',html=readFileSync(indexPath,'utf8'),oldName=oldPath.split('/').pop();
if(html.split(oldName).length!==2)throw Error('Unexpected static overview occurrence');
writeFileSync(indexPath,html.replace(oldName,newPath.split('/').pop()));
console.log(JSON.stringify({id,state:proof.state,oldAssetRetained:true,captionUnchanged:true}));
