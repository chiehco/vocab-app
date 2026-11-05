import {readFileSync,writeFileSync} from 'node:fs';
const read=p=>JSON.parse(readFileSync(p,'utf8')),source=read('output/unit-audit-20261105/LV1-U13-full-source.json'),before=read('output/unit-audit-20261105/U13-ui-before.json');
const notes=`Two characters jointly lift a large heavy box; inability to lift it alone is represented by shared effort.
Driver offers a ride to a backpacked passenger near a railway station; tomorrow morning is contextual.
Reader looks puzzled with an open book and a bookmark; forgotten page and restarting are contextual mental actions.
Two characters carry books outside a library, supporting helping with books; exact spoken request is contextual.
Character hurries through visible heavy rain under an umbrella.
Character easily carries a backpack on a path; its exact weight and all-day duration are not visually measurable.
Helmeted rider sits on a horse; young age is stylized.
Small helper cleans a room with a larger character; exact sibling identity is contextual.
Nurse supports an older patient who is standing up; bed and clinical setting are visible.
Character jogs on a path with exercise clothing, supporting staying in shape; every morning is contextual.
Character places stored food in a basement with shelves; future emergency purpose is contextual.
Singer performs to an enthusiastic crowd, supporting a popular song; exact fan status is contextual.
Students share a study sheet at a desk, supporting helpful test tips.
Character illuminates a night path with a flashlight.
Character repairs a chair using a pocket multi-tool.
Distressed character drifts in a small boat without any visible oar, supporting helplessness.
Students gather with books at a round table to form a study group.
Character lends a bicycle with a thought about returning before dinner; exact agreement is contextual.
Character packs winter coats and scarves into a storage box beside summer clothing.
Character enjoys coffee at a small corner coffee shop.
Shopper compares two baskets of fruit at a market.
Character counts coins emptied from small bags into a combined pile.
Character walks carefully along a hospital corridor, supporting slowing down.
Character proudly presents a cleaned room and organized books; entire weekend duration is contextual.
Traveler in a hotel room sees Wi-Fi and breakfast symbols, supporting complete-with amenities.
Workers repair a portion of a roof beneath rain clouds. Some rain appears in the static frame; exact before-rain chronology is not independently shown.
Character tilts an empty water bottle beside hiking gear.
Character holds a completely empty basket.
Turtle moves along a garden path with a character watching.
Driver merges a car onto a highway with motion lines; speed change and merging route are simplified in one frame.
Student hurriedly eats breakfast beside a clock and schoolbag; frequent lateness is contextual.
Patient looks energetic after treatment with a clinician nearby; exact recovery speed is contextual.
Characters climb a hill to watch a low sunset.
Student faces a very large heap of homework on a desk, supporting figurative mountain.
Characters watch a television news presenter beside dinner dishes; exact daily frequency is contextual.
Character worries about friends' imagined reactions, supporting caring about their opinions.
Two characters carry lunch and drinks toward an open office or meeting room beside a clock, supporting grabbing a quick lunch before a meeting.
Character quickly closes windows as visible rain starts outside.
Characters stand on a hilltop looking over a broad valley.
Older character reads a newspaper while drinking coffee; every morning is contextual.
Character writes a shopping list with pictures on a small paper sheet.
Adult warns a child at a street crossing; exact mother relationship is contextual.
Shield and justice symbols protect a diverse group, supporting anti-discrimination law; the actual legal text is not pictured.
Older character walks on a park path with a healthy expression; daily frequency is contextual.
Backpacked character walks past a bakery and greets a baker on the way; school destination is contextual.
Character carefully carries a full bowl through a kitchen.
Careless painter swings a brush and spills paint.
Diverse characters celebrate together beneath festival flags, supporting racial diversity.
School group stands together beneath an anti-exclusion symbol, supporting opposition to racism.
Older character walks in a park with a smaller companion; grandmother identity and daily routine are contextual.
Character eats a bowl of fresh fruit and vegetables with more produce on the table.
Lion wears a crown in a jungle setting, supporting figurative king of the jungle.
Adult and child feed visible ducks by a park pond. A separate verified example-level artwork change already exists and is not overwritten here.
New student is warmly welcomed by classmates at a school, supporting belonging; speed of feeling accepted is contextual.
Insects gather around a crowned character's small throne, supporting a little kingdom.
Child wears queen costume and crown near a stage curtain; exact sibling identity and school production are contextual.
Character packs clothes, books and personal items into a suitcase beside moving boxes.
Car is stopped across a driveway with another character asking it to move.
Character leaves a parked car outside a supermarket; marked parking lines are visible.
Character lowers a line into a deep lake whose bottom is not shown in the image. No-one-ever-found is a contextual absolute, not independently proved.
Child shows a dress to a pleased older character; exact grandmother relationship and motivation are contextual.
Fallen tree blocks a narrow road.
Character has a marked parking space beside a train station.
Character takes a deep breath beside a stage curtain before entering the stage.
Teacher points to a chart filled with blue water and an arrow from the water surface to its bottom. This visibly teaches water depth, while unchanged caption specifies valley depth. Original and actual unit screenshot both checked; revision remains pending.
Two friends share drinks beside a lake, supporting deepening friendship; every-weekend history is contextual.
Adult stands in visibly ankle-shallow pool water and warns a child at the edge.
Friends enjoy food together on a picnic blanket.
Friendly neighbor smiles and waves beside a garden gate.
Character looks pleased with a freshly baked cake surrounded by family-like companions; exact family ties are contextual.
Character presents a room with soft colors and tidy shelves.
Friends enjoy a lakeside picnic, supporting a lovely experience.
Smiling character suggests a plan to approving friends, supporting agreeable personality.
Character walks among autumn-colored leaves in cool-weather clothing.
Child rides a horse at a farm; exact sibling identity and every-summer frequency are contextual.
Backpacked character waves to friends across a street before the crossing.
Child gently brushes a small pony beside a stable; after-lesson timing is contextual.
Wind bends tall grass into flowing wavy lines.`.split('\n');
if(notes.length!==78||source.length!==78||before.length!==60)throw Error('Incomplete U13 scope');
const pairing=new Set([20,31,37,59]);
const cards=source.map((c,i)=>{const ui=before.find(u=>u.id===c.id),missing=!!ui&&!ui.imageInfo.length,feed=i===52,repair=!feed&&(missing||pairing.has(i+1));
 return{id:c.id,word:c.word,officialWordId:c.officialWordId,sourceImage:c.sourceImage,sourceImageSha256:c.sourceImageSha256,sourceUnitPublished:c.published,captionEn:c.captionEn,captionZh:c.captionZh,pixelReview:'agent actually viewed original PNG contact sheets (660px, every labeled original); depth also viewed at full 1254 size and in actual unit UI',observation:notes[i],originalPairState:i===64?'original_caption_mismatch_pending':'core_image_caption_consistent_with_explicit_visual_limits',generalBefore:ui?{hero:ui.hero,imageInfo:ui.imageInfo,screenshot:ui.heroScreenshot.replace('unit-audit/','unit-audit/u13-before/')}:null,generalCardRepair:repair,repairReason:repair?(missing?'Actual general card shows missing-image placeholder.':'Use the specific authored coffee-shop, breakfast, lunch or car-parking pair; old independent image/caption is retained, not labeled a false lexical sense.'):null,generalCardIntegration:repair?'reviewed_not_installed':feed?'separate_verified_example_artwork_pending_integration':ui?'existing_pair_checked_with_visual_limits':'no_official_dictionary_identity',unresolved:i===64?'Valley depth source caption remains unchanged; the current chart shows water depth.':feed?'Exact separate artwork integration at commit 36a0e1074c1d8771ccd3ed1d171dd0064894ce84 is available; no duplicate image prepared here.':!ui?'Retained source supplement has no formal dictionary identity; no ID invented.':null};});
writeFileSync('docs/unit-audit-20261105/LV1-U13-original-image-review.json',JSON.stringify({unit:'LV1-U13',sourcePairs:78,publishedSubset:15,existingGeneralNonPublishedPixelsViewed:16,publishedSourcePixelBasis:'All 78 original PNGs actually viewed in 20 labeled contact sheets; all 16 other existing general-card images separately viewed. Depth original also viewed at full size and actual published unit screenshot. Pixel review and actual reopen/persistence are separate.',cards},null,2)+'\n');
console.log(JSON.stringify({missingBefore:cards.filter(c=>c.generalBefore&&!c.generalBefore.imageInfo.length).length,missingRepaired:cards.filter(c=>c.generalCardRepair&&!c.generalBefore.imageInfo.length).length,pairings:pairing.size,total:cards.filter(c=>c.generalCardRepair).length,pending:cards.filter(c=>c.unresolved&&c.officialWordId!=='NOID').map(c=>c.id)}));
