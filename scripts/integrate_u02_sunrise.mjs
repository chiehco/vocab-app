import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const read=p=>JSON.parse(readFileSync(p,'utf8'));
const write=(p,v)=>writeFileSync(p,JSON.stringify(v,null,2)+'\n');
const oldPath='wordbeast/lv1-reviewed/LV1-U02-32-af5bdc9689ae.webp';
const newPath='wordbeast/lv1-reviewed/LV1-U02-32-972fd78d0fe4.webp';
const expected='fefa5b56747479f118879d64d67b32b8ef651e328b1efaa705e18cd49d2cbdde';
const sha=p=>createHash('sha256').update(readFileSync(p)).digest('hex');
if(sha('public/'+newPath)!==expected)throw Error('New sunrise bytes differ');
if(sha('public/'+oldPath)!=='1078eaf972da567a977c5a08bcc54b67ef65c7b705e5a96a880a77472d76c327')throw Error('Old sunbathing image changed');
const manifestPath='src/features/vocabulary/lv1ReviewedImages.json',cards=read(manifestPath);
const card=cards.find(c=>c.id==='LV1-U02-32');
if(card.illustration.path!==oldPath&&card.illustration.path!==newPath)throw Error('Unexpected current sun mapping');
if(card.illustration.captionEn!=='The sun rises in the east.')throw Error('Original sentence differs');
const approvalPath='scripts/approvals/lv1-images-20260922.json',approvals=read(approvalPath),record=approvals.find(r=>r.id===card.id);
const proofPath='docs/unit-audit-20261105/LV1-U02-sunrise-review.json';
const proof={id:card.id,officialWordId:card.officialWordId,state:'locally_integrated_not_ui_verified',
 unchangedCaption:card.illustration,previousApproval:record.previousApproval??structuredClone(record),
 originalAsset:{path:oldPath,sha256:sha('public/'+oldPath),retained:true},
 newAsset:{path:newPath,sha256:expected,gitBlob:'90828aadfa267153eb97618e1bbea53397b92628',assetCommit:'88d7b9a32f3ad661f039d190bcb3de52cce1080a',sizeBytes:142858,dimensions:[1254,1254]},
 pixelReview:{state:'actually viewed original compressed WebP in this environment',observation:'Half of the sun is at the distant horizon in morning light; mist and dewdrops support sunrise. An olive-green two-antenna character watches it. No sunbathing chair or midday sun.'},
 authorization:'User authorized repair of image/sentence mismatches while preserving the original sentence and recoverable originals.',
 otherExample:{exampleId:'EX3ebf8dd3',sentenceEn:'On summer afternoons, my grandfather likes to sun himself on the porch.',oldImageRetained:true,
  pairingState:'not_automatically_marked_paired',contract:'General-card image caption and all dictionary examples are separate. Current schema does not require or provide one image for every example; retained old image remains available for a future explicit example-level pairing.'},
 mappingScope:'Only LV1-U02-32 sunrise image/caption pair; general card inherits this exact pair. Other sun sentences are unchanged.',
 uiVerification:null};
proof.unchangedCaption={...card.illustration,path:oldPath};
write(proofPath,proof);
record.previousApproval=proof.previousApproval;
Object.assign(record,{sourceImage:newPath.split('/').pop(),sourceImageSha256:expected,publishedImageSha256:expected,
 approvalSource:proofPath,approvalSha256:sha(proofPath),repairBasis:'User-authorized agent correction of a verified image/caption mismatch; not a new per-image user approval.'});
card.illustration.path=newPath;
write(manifestPath,cards);write(approvalPath,approvals);
const indexPath='public/wordbeast/lv1-reviewed/index.html',html=readFileSync(indexPath,'utf8');
if(!html.includes(newPath.split('/').pop())){
 if(html.split(oldPath.split('/').pop()).length!==2)throw Error('Unexpected static index occurrence count');
 writeFileSync(indexPath,html.replace(oldPath.split('/').pop(),newPath.split('/').pop()));
}
console.log(JSON.stringify({id:card.id,newPath,sha256:expected,oldAssetRetained:true,sentenceUnchanged:true,state:proof.state}));
