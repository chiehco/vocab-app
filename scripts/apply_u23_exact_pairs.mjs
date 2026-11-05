// Only three individually inspected U23 pairs; never replace a general-card default.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const prior='cf8fc0f86ab01365bc71f65c0ba0a25b834c0f9e';
const cardPath='src/features/vocabulary/lv1ReviewedImages.json',approvalPath='scripts/approvals/lv1-images-20260922.json';
const proofPath='docs/unit-audit-20261105/LV1-U23-exact-pair-review.json';
assert(!fs.existsSync(proofPath),'Pair receipt already exists; inspect rather than repeat.');
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const write=(p,v)=>fs.writeFileSync(p,JSON.stringify(v,null,2)+'\n');
const sha=v=>createHash('sha256').update(v).digest('hex');
const old=p=>JSON.parse(execFileSync('git',['show',prior+':'+p],{encoding:'utf8',maxBuffer:10*1024*1024}));
const cards=read(cardPath),approvals=read(approvalPath);
assert.deepEqual(cards,old(cardPath));assert.deepEqual(approvals,old(approvalPath));
const changes=[
 {id:'LV1-U23-50',path:'wordbeast/lv1-reviewed/LV1-U23-50-c4476d14caae.webp',publishedImageSha256:'a205d42a31e67d46ea93ad89149b84fc35562c3e0f1f2dd9f546df2a628cd94c',bytes:140328,reason:'Old native image raises a basketball and empty fist while trophy is on the ground; replacement visibly lifts the sole trophy overhead with both hands. Original caption unchanged.',assetCommit:'ab76da257068cac1085f04ba8ba57be8f6dc47a1',exampleIds:[]},
 {id:'LV1-U23-84',captionZh:'他總是被這張桌子的角絆到。',reason:'Trip-over means the foot catches and the person stumbles; 絆到 fixes 撞到 without asserting a fall or changing the table-corner English.',exampleIds:['EXff6b330f']},
 {id:'LV1-U23-97',captionZh:'他打算在大學研讀電腦科學。',reason:'Study computer science does not require a declared major or add an engineering specialization. Preserve the he-caption separately from the my-brother practice sentence.',exampleIds:['EXf7d6aec6']},
];
const ids=new Set(changes.map(c=>c.id));
const proof={priorCheckpoint:prior,state:'exact_pairs_saved_actual_app_reopen_pending',scope:'Only the three exact retained/published pairs. No formal identities, English, publication mode or general-card priority changes.',unchangedCards:723,unchangedCardRowsSha256:sha(JSON.stringify(cards.filter(c=>!ids.has(c.id)))),unchangedApprovalRowsSha256:sha(JSON.stringify(approvals.filter(c=>!ids.has(c.id)))),changes:[]};
for(const change of changes){
 const card=cards.find(c=>c.id===change.id),approval=approvals.find(c=>c.id===change.id);assert(card&&approval);
 const before={card:structuredClone(card),approval:structuredClone(approval)};
 assert.equal(sha(fs.readFileSync('public/'+card.illustration.path)),approval.publishedImageSha256);
 assert.equal(sha(card.illustration.captionEn+'\n'+card.illustration.captionZh),approval.textSha256);
 if(change.path){const bytes=fs.readFileSync('public/'+change.path);assert.equal(bytes.length,change.bytes);assert.equal(sha(bytes),change.publishedImageSha256);card.illustration.path=change.path;}
 if(change.captionZh)card.illustration.captionZh=change.captionZh;
 const afterApproval={...approval,publishedImageSha256:sha(fs.readFileSync('public/'+card.illustration.path)),textSha256:sha(card.illustration.captionEn+'\n'+card.illustration.captionZh),approvalSource:proofPath,previousApproval:before.approval};
 delete afterApproval.approvalSha256;
 Object.assign(approval,afterApproval);
 proof.changes.push({id:change.id,before,after:{card:structuredClone(card),approval:afterApproval},reason:change.reason,assetCommit:change.assetCommit??null,dimensions:[1254,1254],exampleIds:change.exampleIds,englishUnchanged:true,originalAssetRetained:true});
}
const examples=read('public/data/v1/examples.json');
// Preserve actual formal example identities even though illustration captions are separate sentences.
proof.changes[0].exampleIds=examples.filter(e=>e.word==='final').map(e=>e.exampleId);
proof.generalDefaults='Existing general final uses a distinct correct basketball-final image/caption and remains unchanged. Corner/study inherit only their exact corrected Chinese captions; formal English practice sentences remain separate.';
proof.pixelLimits='Original/native images inspected. Medium-well degree, exact table-corner geometry and crystal-symbol dietary chemistry remain separately limited, not blanket approved.';
write(proofPath,proof);
const receiptHash=sha(fs.readFileSync(proofPath));
for(const approval of approvals.filter(a=>ids.has(a.id)))approval.approvalSha256=receiptHash;
write(cardPath,cards);write(approvalPath,approvals);
console.log(JSON.stringify({changedPairRows:3,otherPairs:723,proof:proofPath,receiptSha256:receiptHash,generalPriorityChanged:false}));
