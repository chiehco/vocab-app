import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const read=p=>JSON.parse(readFileSync(p,'utf8')),write=(p,v)=>writeFileSync(p,JSON.stringify(v,null,2)+'\n'),hash=s=>createHash('sha256').update(s).digest('hex');
const root='docs/unit-audit-20261105/',proofPath=root+'LV1-verified-caption-translations.json',facts=read(root+'VERIFIED-TRANSLATION-SOURCES.json').facts;
const manifestPath='src/features/vocabulary/lv1ReviewedImages.json',registryPath='src/features/vocabulary/auditedWordIllustrations.json',approvalPath='scripts/approvals/lv1-images-20260922.json';
const published=read(manifestPath),registry=read(registryPath),approvals=read(approvalPath),changes=[];
let html=readFileSync('public/wordbeast/lv1-reviewed/index.html','utf8');
for(const fact of facts){const found=[];for(const [kind,cards]of [['published_unit',published],['audited_general',registry]])for(const card of cards){
 const illustration=card.illustration;if(illustration.captionEn!==fact.sentenceEn)continue;
 if(illustration.captionZh!==fact.before)throw Error('Unexpected paired caption drift '+fact.exampleId);
 const id=card.id??card.reviewId,expected=fact.exampleId==='EX51e703b4'?'LV1-U01-30':fact.exampleId==='EX66703666'?'LV1-U08-92':null;
 if(id!==expected)throw Error('Unverified extra caption pairing '+id);
 const previousIllustration=structuredClone(illustration),assetSha256=hash(readFileSync('public/'+illustration.path));illustration.captionZh=fact.after;
 const change={exampleId:fact.exampleId,id,kind,previousIllustration,currentIllustration:structuredClone(illustration),assetSha256,englishAndImageUnchanged:true,evidence:fact.evidence};
 if(kind==='published_unit'){const record=approvals.find(a=>a.id===id);change.previousApproval=structuredClone(record);record.previousApproval=structuredClone(record);record.textSha256=hash(illustration.captionEn+'\n'+illustration.captionZh);record.approvalSource=proofPath;record.repairBasis='User-authorized evidence-backed translation precision correction; not an image redraw or new per-image approval.';
  const tag='<article id="'+id+'">',start=html.indexOf(tag),end=html.indexOf('</article>',start)+10;
  if(start<0||end<10)throw Error('Missing exact overview article');
  const article=html.slice(start,end);if(article.split(fact.before).length!==3)throw Error('Expected exact alt and paragraph caption');
  html=html.slice(0,start)+article.replaceAll(fact.before,fact.after)+html.slice(end);
 }
 found.push(id);changes.push(change);
 }
 if(!found.length)changes.push({exampleId:fact.exampleId,kind:'no_exact_image_caption_mapping',reason:'No published or audited-general caption has this exact original English sentence; only the formal example translation changes.'});
}
if(changes.filter(c=>c.currentIllustration).length!==2)throw Error('Expected exactly two precise caption mappings');
write(proofPath,{state:'locally_synced_not_ui_verified',scope:'Only two exact Chinese caption mappings; original English and image bytes unchanged. Other three examples have no exact caption mapping.',changes});
for(const c of changes.filter(c=>c.kind==='published_unit'))approvals.find(a=>a.id===c.id).approvalSha256=hash(readFileSync(proofPath));
write(manifestPath,published);write(registryPath,registry);write(approvalPath,approvals);writeFileSync('public/wordbeast/lv1-reviewed/index.html',html);
console.log(JSON.stringify({captionMappings:2,formalExamplesWithoutExactCaption:3}));
