import {readFileSync,writeFileSync} from 'node:fs';
const read=p=>JSON.parse(readFileSync(p,'utf8'));
const source=read('output/unit-audit-20261105/LV1-U07-full-source.json'),before=read('output/unit-audit-20261105/U07-ui-before.json');
const notes=`Fruit stall at street corner displays fruit and a vendor.
Two old school friends compare a school photograph, supporting friendship since childhood.
Seated character by window watches pedestrians outside.
Brown bear is beside a tent in a night campsite.
Theater performer receives applause from an enthusiastic audience.
Learner tolerates a child's drumming while trying to study.
Older character smiles cheerfully during rain, supporting a cheerful attitude.
Traveler sits beside a plane window; booking time is reasonably omitted.
Child sings while family members applaud; born talent is conveyed by context.
Adult carries tools toward household work, supporting the participle borne.
Character stands beside a window watching rain.
Cat sits by doorway waiting.
Empty water bottle and shopping bag convey running out and buying more.
Plants receive water with sunlight visible.
Runner trains on a dawn path.
Owner serves and supervises a restaurant.
Driver uses an alternate riverbank route past a flooded blocked road toward a clock tower.
Charity volunteer serves warm bowls to a family in worn clothes.
Running traveler reaches a bus stop while the bus begins departing; timing is a simplified action scene.
Customer orders coffee and a sandwich from an aproned server.
Two stages show learning a route and confidently crossing a small bridge.
Toys are scattered around a worried child after play.
Character arranges books neatly on a shelf.
Customers show strong interest in a displayed handmade basket; market demand is supported.
Photos show dawn, daytime, sunset and night in chronological order.
Pointed-ear elf wraps a gift beside a fireplace.
Savings jar, bank setting and an additional coin support interest earned on savings.
Character happily makes a bed in a small bedroom.
Character listens from bed to a cow mooing outside at night.
Bright pinwheel attracts several interested children.
Character gardens with a trowel, pots and watering can.
Learner holds a guitar while an older player demonstrates.
Viewer watches an outer-space and black-hole documentary.
Two housemates wash and dry dishes in their kitchen.
Learner wears headphones while doing written homework.
Seated adult listens attentively while a child speaks.
Opened case contains a matching set of pens.
Several birds perch along a garden fence.
One character asks another for clarification with questioning gestures.
Customer buys bread at a market stall.
Character picks a few apples from a tree into a basket.
Character has only a few coins while looking at a car showroom.
Questioning character watches another's gesture with banana props; precise intended meaning is supplied by the sentence.
Child and grandparents plant a sapling together.
Learner works on homework before a prepared evening meal.
Two characters discuss a coffee shop; its actual proper name need not appear as lettering.
Character holds a candle and tests an unlit lamp during a blackout.
Two characters move an appointment marker to another calendar day.
Character phones a friend just inside the home doorway at night.
Powerful washing machine visibly agitates a load of clothes.
Official blocks a flooded road and stops pedestrians.
Character weighs travel choices represented by train ticket, walking boots and bicycle helmet.
Character has an umbrella under gathering clouds, supporting possible later rain.
Heavy snow buries a car and blocks safe driving.
Broken bridge makes a river crossing impossible.
Uniformed soldiers carry relief boxes and bottled water beside emergency tents; flood water itself is not directly shown.
Character presents cinema and grocery alternatives with an unconcerned expression.
Backpacked friends greet each other at a coffee shop after school.
Restaurant server brings a breakfast plate; a morning clock supports breakfast service without proving the entire daily schedule.
Household servant carries a tea tray into a dining room.
Server brings two plates of meals to seated customers.
Character tries a dark computer with an unplugged lead, conveying a power-on problem.
Two characters struggle together to carry a heavy box.
Learner struggles with language books and picture vocabulary cards.
Student and teacher discuss an open notebook after class.
Scientists listen and take notes at a plant-research presentation.
Rainbow appears above wet ground as rain ends.
Character with a rolled legal document protects a bird nest and woodland animals.
Encouraging adult supports a child jumping a small obstacle.
Character looks worried at their reflection in a mirror.
Arriving character enters an empty meeting room beside a clock; exact ten-minute lead time comes from the sentence.
Smiling character waters flowers while another observes a good mood.
Volcano gives off smoke and heat, indicating it remains active.
Stage actor's performance elicits both laughter and tears from the audience.
Child behaves calmly while visiting grandmother for tea.
Adult reunites a child with a waiting caregiver, supporting a kind deed.
Teacher praises pupils for queuing and putting litter into a bin during a bus trip.
Character picks up scattered clothes and books to clean a messy room.
Costumed actor rehearses lines from a script beside backstage clothes and curtains.
Actress bows on stage while the audience applauds.
Adult offers a replacement plant after a child's broken pot, supporting a second chance.
Child returns a wallet to a relieved adult.
Shivering character asks another to close an open window.
Character reaches across the dining table for salt.
Runner leads a group in a race.
Traveler boards a waiting train just in time.
Dance leader demonstrates moves to a group of students.
Team captain gives instructions around a football during a match.
Hiker carries an oversized heavy backpack up a mountain path.
Tenant pays rent to an adult holding the house key.
Part-time worker happily receives coins and an envelope after work.
Character divides money between savings and a house/rent model; exact half comes from the sentence.
Worker with tools receives payment for labor beside a repaired bench.`.split('\n');
if(notes.length!==93||source.length!==93||before.length!==78)throw Error('Scope mismatch');
const repairs={17:'Actual general card pairs a boxes-management image/Chinese caption with a flood-driver example. Use the already authored flood-route image and exact original caption; retain the boxes asset and all examples.',83:'Actual general-card English caption asks to open a door with full hands, but pixels show a cold person beside an open window. Use the existing authored closing-window/cold pair; preserve original sentences and old asset.'};
const cards=source.map((c,i)=>{const ui=before.find(r=>r.id===c.id),missing=!!ui&&!ui.imageInfo.length,reason=repairs[i+1];return {
 id:c.id,word:c.word,officialWordId:c.officialWordId,sourceImage:c.sourceImage,sourceImageSha256:c.sourceImageSha256,sourceUnitPublished:c.published,captionEn:c.captionEn,captionZh:c.captionZh,
 pixelReview:'agent actually viewed original PNG contact sheets (660px, every labeled image); App unit/general cards opened separately',observation:notes[i],originalPairState:'core_image_caption_consistent',
 generalBefore:ui?{hero:ui.hero,imageInfo:ui.imageInfo,screenshot:ui.heroScreenshot}:null,generalCardRepair:missing||!!reason,repairReason:missing?'Actual general card has a missing-image placeholder.':reason??null,
 generalCardIntegration:missing||reason?'reviewed_not_installed':ui?'existing_pair_core_consistent':'no_official_dictionary_identity',unresolved:!ui?'Existing NOID supplemental/form item; no official dictionary identity invented.':null};});
writeFileSync('docs/unit-audit-20261105/LV1-U07-original-image-review.json',JSON.stringify({unit:'LV1-U07',sourcePairs:93,publishedSubset:37,cards},null,2)+'\n');
console.log(JSON.stringify({originalPixelsViewed:93,existingGeneralPixelsViewed:before.filter(c=>c.imageInfo.length).length,missing:cards.filter(c=>c.repairReason?.startsWith('Actual general card has')).length,pairingRepairs:Object.keys(repairs).length,noDictionaryIdentity:cards.filter(c=>!c.generalBefore).length}));
