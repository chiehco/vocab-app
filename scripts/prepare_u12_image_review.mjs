import {readFileSync,writeFileSync} from 'node:fs';
const read=p=>JSON.parse(readFileSync(p,'utf8')),source=read('output/unit-audit-20261105/LV1-U12-full-source.json'),before=read('output/unit-audit-20261105/U12-ui-before.json');
const notes=`Character places a leafy seedling into garden soil beside a watering can.
Character carries a lantern on a dark moonlit path.
Character raises a hand while solving a wooden counting puzzle.
Traveler with luggage appears nervous in an unfamiliar town; foreign and first visit are contextual, not nationality visually proved.
Characters pick tea leaves on mountain plantation slopes.
Worker makes shoes at a bench with production conveyor and shoe shelves.
Lantern illuminates a narrow path through dark trees and rocks.
Heavy dark clouds gather above a worried character before a storm.
Character writes a paper reply beside an open envelope.
Character responds on a ringing telephone.
Character receives a letter at a mailbox with a pleased response.
Child asks an adult seated in an armchair for help; precise kinship and problem are contextual.
Traveler with luggage boards a plane at an island airport; domestic location is not independently shown.
Local character welcomes a backpacked visitor by a seaside village home; birthplace is supplied by caption.
Character saves a coin in a piggy bank while thinking about a laptop.
Character heats soup in a pot over a visible flame.
Character happily sits with a dog and rabbit.
Monkey swings on a vine in an enclosure watched from behind a zoo fence.
Coach with whistle and clipboard trains a sweating runner among cones.
Traveler asks a local character for directions with a map near a railway platform.
Character places coins into a large glass savings jar.
Electric heater glows beside a scarf-wearing character in a snowy-window room.
Character ladles steaming heated soup into a bowl.
Visitor watches a panda and elephant behind a zoo barrier.
Harnessed guide dog leads a cane-using character over a crossing under a green pedestrian signal.
Character grips a heavy door handle with both hands and effort; an open gap is visible. Pulling direction is simplified in a single frame.
Two adults share washing dishes and folding laundry; marital identity and daily frequency are contextual.
Farmer cultivates rows of vegetables beside a rice paddy and river landscape.
Character spreads arms beside a very wide river; safely swimming it is a contextual assessment.
Coach directs basketball dribbling practice around cones.
Character pushes a wooden hinged door with both hands. There is no elevator or push button; original button/elevator caption is visibly mismatched.
Two characters marry beneath a flower-covered garden arch.
Couple celebrates with cake, flowers and a wedding photo; another anniversary year is contextual.
Farmer harvests crops with a basket of vegetables and a rice bundle in a field.
Seller shows a car and keys to a happy buyer; exact transaction timing is simplified.
Character relaxes in a hammock beside a warm drink.
Character brushes hair near a mirror, with breakfast waiting on a table.
Character completes a wooden plane model with tools and wood shavings before a meal.
Old tree spreads branches across a garden above a character.
Character stretches a measuring tape across a door frame.
Worker digs the sides of a path with two carts waiting behind; widening intention is clear.
Character crosses a broad field of golden grass.
Driver proceeds on a visibly narrow cliffside road.
Shoe salesperson offers two shoe sizes to a customer beside boxed stock.
Character shops online for a phone case shown beside a shopping-cart icon.
Character comfortably plays a piano piece with a music score.
Character easily holds a box above the head with one hand.
Worried character passes a dark empty-looking house.
Haircut is being finished in a salon with mirror and trimmed hair on the floor; later family party is contextual.
Hairdresser carefully trims a seated character's hair with scissors and comb.
Two businesslike characters shake hands across documents at a table.
Character in rear classroom seat holds glasses and squints toward a blurred teacher and board, supporting poor eyesight.
Character practices piano beside a score; exact daily hour and after-dinner timing are contextual.
Artist proudly presents a completed landscape painting on an easel.
Runner crosses a red finish ribbon at the end of a path.
Bicycle dealer shows multiple bicycles to a customer in a shop.
Character waters a wilted potted plant with concern.
Character shares bread and water with three children in a sparse room; poverty is represented, not diagnosed by appearance alone.
Traveler boards a subway while cars queue on the adjacent road, supporting practical rush-hour transport.
Medical practitioner checks a patient's wrist with a clinical backdrop.
Character trips over a rock on a park path; the fall is represented as an ongoing stumble.
Two characters enjoy drinks at a small outdoor cafe beside a park; first romantic date is contextual.
Police officer reunites a child with two adults in a park; family relationships are caption context.
Character arrives at a home with a visible vegetable garden.
Guide shows children artwork and a sculpture in an art museum.
Traveler with passport and luggage stands at an airport with a departing plane.
Backpacked traveler journeys through mountain villages.
Character trips over a brick while holding a cup; droplets visibly leave the cup although most liquid is retained. Nearly spilled versus some spill remains a literal precision concern.
Police officer helps an older cane-using character cross a busy street.
Two characters discuss future plans over tea, with imagined travel and home scenery; exact night/time is contextual.
Two backpacked characters board the same bus at a bus stop; school and morning are contextual.
Older character offers freshly baked cookies on a plate to a child; exact grandparent identity and after-school timing are contextual.
Truck carries boxes along a rural road.
Traveler sadly looks at a family photograph beside luggage, supporting homesickness.
Backpacked character enjoys a familiar town night market with companions; hometown identity is contextual.
Graduate gives a speech from a lectern to an audience.
Two closely similar characters stand together with matching scarves, supporting twins looking alike.
Character dips a crisp round biscuit into warm tea.
Visitor brings flowers to an older patient in a hospital bed; exact grandparent identity is contextual.
Character considers a room-cleaning plan with broom, laundry and folded items illustrated as steps.
Character presents a handmade paper lantern with craft materials on the table.
Character turns on a radio while wearing headphones to listen.
Clinician applies a small bandage to a patient's arm in a neighborhood clinic.
Character swims happily in a pool beside towels and books; daily afternoon frequency is contextual.`.split('\n');
if(notes.length!==84||source.length!==84||before.length!==74)throw Error('Incomplete U12 scope');
const pairing=new Set([29,53]);
const cards=source.map((c,i)=>{const ui=before.find(u=>u.id===c.id),missing=!!ui&&!ui.imageInfo.length,repair=missing||pairing.has(i+1),push=i===30;
 const exactPush=c.examples.find(e=>e.exampleId==='EXc3772fba');
 return{id:c.id,word:c.word,officialWordId:c.officialWordId,sourceImage:c.sourceImage,sourceImageSha256:c.sourceImageSha256,sourceUnitPublished:c.published,sourceCaptionEn:c.captionEn,sourceCaptionZh:c.captionZh,captionEn:push?exactPush.sentenceEn:c.captionEn,captionZh:push?exactPush.sentenceZh:c.captionZh,pixelReview:'agent actually viewed original PNG contact sheets (660px, every labeled original); actual UI loading is separately recorded',observation:notes[i],originalPairState:push?'original_caption_mismatch_pending':i===67?'literal_spill_precision_pending':'core_image_caption_consistent_with_explicit_visual_limits',generalBefore:ui?{hero:ui.hero,imageInfo:ui.imageInfo,screenshot:ui.heroScreenshot.replace('unit-audit/','unit-audit/u12-before/')}:null,generalCardRepair:repair,repairReason:missing?(push?'Actual general card has no image. Bind the existing wooden-door image only to the unchanged heavy-door formal example EXc3772fba; the distinct original elevator caption remains unresolved.':'Actual general card shows a missing-image placeholder.'):pairing.has(i+1)?'Use the already authored specific river/piano pair instead of a general ribbon/ring-toss symbol; this is more concrete alignment, not a claim the old picture depicted the opposite concept.':null,generalCardIntegration:repair?'reviewed_not_installed':ui?'existing_pair_checked_with_visual_limits':'no_official_dictionary_identity',unresolved:push?'The retained unpublished original caption requires an elevator button. Its source image is a wooden door; no automatic unit publication and no rewritten original sentence.':i===67?'Cup remains held, but droplets are outside it. Preserve nearly-spilled caption and explicit literal precision limitation.':!ui?'Retained source supplement has no formal dictionary identity; no ID invented.':null};});
writeFileSync('docs/unit-audit-20261105/LV1-U12-original-image-review.json',JSON.stringify({unit:'LV1-U12',sourcePairs:84,publishedSubset:48,existingGeneralNonPublishedPixelsViewed:3,publishedSourcePixelBasis:'All 84 original PNGs actually viewed in 21 labeled contact sheets; all three other existing general-card images separately viewed. Pixel observations do not substitute for actual card reopen and persistence.',cards},null,2)+'\n');
console.log(JSON.stringify({missing:cards.filter(c=>c.generalCardRepair&&c.generalBefore&&!c.generalBefore.imageInfo.length).length,pairings:2,total:cards.filter(c=>c.generalCardRepair).length,originalUnresolved:cards.filter(c=>c.originalPairState.endsWith('pending')).map(c=>c.id)}));
