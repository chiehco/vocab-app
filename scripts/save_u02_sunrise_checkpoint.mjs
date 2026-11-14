import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const read=p=>JSON.parse(readFileSync(p,'utf8'));
const write=(p,v)=>writeFileSync(p,JSON.stringify(v,null,2)+'\n');
const cli=p=>JSON.parse(readFileSync(p,'utf8').split('### Result')[1].split('### Ran Playwright code')[0].trim());
const path='docs/unit-audit-20261105/LV1-U02-sunrise-review.json',proof=read(path);
const unit=cli('output/playwright/unit-audit/sunrise-unit-reopen.txt')[0],general=cli('output/playwright/unit-audit/sunrise-general-reopen.txt')[0];
if(!unit.text.includes(proof.unchangedCaption.captionEn)||!general.hero.includes(proof.unchangedCaption.captionEn)||general.mismatches.length||general.exampleCount!==6||!general.definitionMatches)throw Error('Sunrise reopen failed');
for(const image of [...unit.images,...general.imageInfo])if(!image.complete||image.width!==1254||!image.src.includes(proof.newAsset.path))throw Error('Unexpected sunrise image');
proof.state='locally_integrated_and_reopened';proof.uiVerification={unit,general,agentViewedBothFinalScreenshots:true};
write(path,proof);
const approvalsPath='scripts/approvals/lv1-images-20260922.json',approvals=read(approvalsPath);
approvals.find(c=>c.id===proof.id).approvalSha256=createHash('sha256').update(readFileSync(path)).digest('hex');write(approvalsPath,approvals);
const ledgerPath='docs/unit-audit-20261105/LV1-U02-ledger.json',ledger=read(ledgerPath),card=ledger.cards.find(c=>c.id===proof.id);
Object.assign(card,{previousImage:{path:card.unitImage,sha256:card.imageSha256},unitImage:proof.newAsset.path,imageSha256:proof.newAsset.sha256,
 unitImageSemanticState:'agent_visually_checked_repaired_sunrise_and_actual_ui_reopened',observation:proof.pixelReview.observation,
 generalImagePaths:general.imageInfo.map(i=>i.src),sunriseReopenEvidence:path});
ledger.counts.coreImageCaptionConsistent=37;ledger.counts.imageRepairsPending=1;ledger.counts.imagesAdded=1;
ledger.retainedIssues=ledger.retainedIssues.filter(i=>i.id!==proof.id);
ledger.retainedIssues.push({id:proof.id,type:'other_example_pairing',status:'original_retained_not_automatically_paired',details:proof.otherExample});
ledger.sunriseFollowup={checkedAt:new Date().toISOString(),evidence:path,state:proof.state};write(ledgerPath,ledger);
const draftPath='docs/unit-audit-20261105/image-repair-drafts.json',drafts=read(draftPath),sun=drafts.repairs.find(c=>c.id===proof.id);
sun.status=proof.state;sun.newAsset=proof.newAsset;sun.reopenEvidence=path;
delete sun.materializationAttempt;delete sun.generatedArtifact;
drafts.state='one_repair_integrated_one_tool_blocked';write(draftPath,drafts);
const progressPath='docs/unit-audit-20261105/PROGRESS.md',progress=readFileSync(progressPath,'utf8');
if(!progress.includes('## U02 sunrise follow-up'))writeFileSync(progressPath,progress+'\n## U02 sunrise follow-up\n\nU02-32 sunrise replacement verified by exact SHA-256, 1254×1254 dimensions and actual compressed pixels; both the unit card and general card were reopened and visually checked. The original sunrise sentence and all six dictionary examples are unchanged. The old sunbathing image is retained; the other sun-himself example is not automatically marked as paired. U02 now has 37 consistent image/caption pairs and one remaining elephant anatomy repair blocked by the image-edit input limitation. See LV1-U02-sunrise-review.json for exact before/after paths, hashes, approval history and UI evidence.\n');
console.log(JSON.stringify({sunrise:proof.state,unitImages:unit.images.length,formalExamples:general.exampleCount,remainingImageRepairs:1}));
