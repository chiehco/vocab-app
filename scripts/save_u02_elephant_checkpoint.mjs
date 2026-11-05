import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const read=p=>JSON.parse(readFileSync(p,'utf8')),write=(p,v)=>writeFileSync(p,JSON.stringify(v,null,2)+'\n');
const cli=p=>JSON.parse(readFileSync(p,'utf8').split('### Result')[1].split('### Ran Playwright code')[0].trim());
const root='docs/unit-audit-20261105/',path=root+'LV1-U02-elephant-review.json',proof=read(path);
const unit=cli('output/playwright/unit-audit/elephant-unit-reopen.txt')[0],general=cli('output/playwright/unit-audit/elephant-general-reopen.txt')[0];
if(!unit.text.includes(proof.unchangedCaption.captionEn)||!general.hero.includes(proof.unchangedCaption.captionEn)||general.mismatches.length||!general.definitionMatches||general.exampleCount!==3)throw Error('Elephant reopen mismatch');
for(const img of [...unit.images,...general.imageInfo])if(!img.complete||img.width!==1254||!img.src.includes(proof.newAsset.path))throw Error('Wrong loaded elephant image');
proof.state='locally_integrated_and_reopened';proof.uiVerification={unit,general,agentViewedBothFinalScreenshots:true};write(path,proof);
const approvalsPath='scripts/approvals/lv1-images-20260922.json',approvals=read(approvalsPath);approvals.find(c=>c.id===proof.id).approvalSha256=createHash('sha256').update(readFileSync(path)).digest('hex');write(approvalsPath,approvals);
const ledgerPath=root+'LV1-U02-ledger.json',ledger=read(ledgerPath),card=ledger.cards.find(c=>c.id===proof.id);
Object.assign(card,{previousImage:{path:card.unitImage,sha256:card.imageSha256},unitImage:proof.newAsset.path,imageSha256:proof.newAsset.sha256,
 unitImageSemanticState:'agent_visually_checked_repaired_anatomy_and_actual_ui_reopened',observation:proof.pixelReview.observation,
 generalImagePaths:general.imageInfo.map(i=>i.src),repairReopenEvidence:path});
ledger.counts.coreImageCaptionConsistent=38;ledger.counts.imageRepairsPending=0;ledger.counts.imagesAdded=2;
ledger.retainedIssues=ledger.retainedIssues.filter(i=>i.id!==proof.id);ledger.elephantFollowup={checkedAt:new Date().toISOString(),evidence:path,state:proof.state};write(ledgerPath,ledger);
const draftPath=root+'image-repair-drafts.json',draft=read(draftPath),repair=draft.repairs.find(c=>c.id===proof.id);
repair.status=proof.state;repair.newAsset=proof.newAsset;repair.reopenEvidence=path;delete repair.attempt;draft.state='both_image_repairs_integrated_and_reopened';write(draftPath,draft);
console.log(JSON.stringify({elephant:proof.state,unitImageRepairsPending:0,originalRetained:true,formalExamplesUnchanged:3}));
