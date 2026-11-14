import {readFileSync,writeFileSync} from 'node:fs';
const read=p=>JSON.parse(readFileSync(p,'utf8')),source=read('output/unit-audit-20261105/LV1-U15-full-source.json'),before=read('output/unit-audit-20261105/U15-ui-before.json');
const notes=`Crowded train carriage supports crowded rush-hour travel; usually is contextual frequency.
Jogger runs on a park path; weekend frequency is contextual. Extra shoes beneath a bench do not change the action.
Rain and a bag without an umbrella are contrasted with the umbrella left by a door at home.
Character remembers a family-like trip with Mount Fuji; first-trip and family relationships are contextual.
Character draws a pictorial shopping list on paper; drew is supported and is not changed to wrote.
Concerned passengers wait beside a clock at a bus stop. A late arrival and usual frequency cannot be measured from this still image.
Character walks a dog near home before a breakfast scene; frequency is contextual.
Characters dine at a restaurant; nearby and occasional frequency are contextual.
Character listens toward a dark attic; a sound cannot be independently heard from pixels.
Noticeboard shows a fire-evacuation picture; tomorrow and full written notice content are contextual.
Characters enjoy a chocolate cake. Rich taste and everyone loving it are sentence claims, not independently tasteable pixels.
Three characters make a sandcastle; one completed castle is visible. Plural castles and activity over time are not fully depicted, without a confirmed opposite action.
Character searches a bag beside a locked bicycle; missing-key concept is clear.
Character refuses a ride offered from a car; stranger identity is contextual.
Character consults a map in an unfamiliar street; familiarity cannot be independently established.
Three separated groups of three, five and seven stones match the visible example numbers.
Before/after weighing and body-size comparison support noticeable change; precise weight is unreadable and the character also changes stylized height.
Student tells a teacher about illness and absence with a sick-bed thought scene; future conditional timing is contextual.
Student in a rear classroom seat squints at a blurred distant board. Preserve the source sentence and do not invent a prescription or reason for that seat.
Character shivers under blankets on a snowy night, supporting low temperature.
Character sits in the middle section of a cinema facing the screen.
Two friends help one another with work; always and friendship history are contextual.
Character receives a birthday surprise with cake, friends and gifts.
Surprised greeting at a supermarket; old-friend relationship is contextual.
Team celebrates with a raised trophy; the causal importance of teamwork is contextual.
Adult-like character jogs in a park at sunrise; exact middle age and every-morning frequency are contextual.
Shocked character reads a message with an imagined friend travelling abroad; hearing and exact best-friend relationship are contextual.
Gift recipient laughs at an unexpected toy in a present box.
Character enjoys a quiet early morning while another sleeps indoors; soundlessness is represented by the calm scene.
Teacher and children count ten visible stones, supporting count to ten; spoken English is contextual.
Many pupils queue outside a classroom with papers; exact dozens and exam timing are contextual.
Characters lie on grass looking at white clouds; slow drift is represented by the scene, not directly measurable.
Character gestures for quiet beside a partly closed bedroom door and sleeping child. Static opening/closing direction is not established, and is not called a confirmed opposite.
Silent character sits among speaking meeting participants; whole-meeting duration and motivation are contextual.
Teacher points to one and three apples on a board, supporting countable one/many contrast.
Many stars fill a clear night sky; countless is a conventional large-number concept.
Crowd counts or cheers near lit fireworks. Exact pre-ignition timing is ambiguous because three fireworks already emit light; retain this unpublished no-ID source with a timing limitation.
Character opens an umbrella under dark clouds; the precautionary just-in-case situation is consistent.
Character carries a light backpack; the single book is not visible inside the closed bag.
Gray cat sleeps beside a window.
Character taps a door with a raised hand; lightness of the tap is represented conventionally.
White curtains admit sunlight into an otherwise dark room; the lightening effect is clear.
Character adjusts a reading lamp above an open book; exact brightness setting is unreadable.
Floor lamp gives a reading corner warm light, with a reader and resting cat.
Two characters light a candle in darkness; candle light is clear.
Character wears dark winter clothes beside a mirror and snowy window.
Black cat sits on a fence.
Three characters use flashlights in a dark room during a represented power outage.
Character wears a white collared shirt and black trousers at an interview doorway; this shirt is visibly collared.
Pale unwell character rests in bed while another checks the forehead. Illness is contextual, not a medical diagnosis from pixels.
White rabbit hops across a garden.
Adult-like character plants flowers in a garden with a child; exact mother relationship is contextual.
Character remembers an umbrella left on a departing bus.
Character ties hair with a rubber band beside a running path and water bottle.
Character slices bread with a knife.
Character eats salad with a fork.
Character calls across a busy road; the exact name spoken is not visible.
Wedding guests admire a bride and her dress; universal amazement is represented conventionally.
Flowers decorate a school entrance while characters garden and water them.
Neighbors wave and greet each other near a doorway; pleasant-surprise history is contextual.
Tired character rests beside companions moving boxes; exact completed-work history is contextual.
Original jacket front is fully open and both hands hold its sides, contradicting zipped up. Replacement WebP was separately actually viewed at full 1254: jacket front is closed and one hand holds the raised zipper pull; caption remains unchanged.
Character holds heated leftovers beside a microwave; heating before eating is supported by the scene.
Character wrapped in a blanket sits near a campfire in the mountains at night; cool temperature core is clear, summer season is contextual.
Character hangs towels outside under afternoon sunshine to dry.
Character enjoys and recommends music to companions; excellent taste is the sentence judgment.
Characters gather beside a fireplace for warmth.
Players stretch beside a football before a match; warm-up core is clear.
Character enjoys an evening breeze at sunset; refreshing sensation is a represented response.
Calm seated character breathes deeply beside a river.
Character puts wet towels into a front-loading appliance. Its controls do not independently distinguish a dryer from a washing machine; drying purpose is supplied by the caption.
Character warns another away from a visibly wet bench during rain.
Character presents a wool-like coat at a cleaning counter; exact fiber and dry-cleaning process cannot be established from pixels alone.
Character squeezes lemon juice into a soup pot.
Character experiences heavy snow near Japanese-style buildings; first-time travel history is contextual.
Character melts chocolate in a bowl beside cookies; school-fair purpose is contextual.
Character pours water from a jug into a glass.
Student asks another character for more time beside homework and a clock; request language and amount are contextual.
Character squints at a menu while glasses lie on the table. Failure to wear or remember the glasses is plausible; the image does not establish that they were left at home.
Small apartment is shown near a school; exact household relationship is contextual.
Young child holds a toy while an older character gestures against a scary screen; exact sibling relationship and movie/program distinction are contextual.
Only a few empty seats remain near a stage among occupied rows.
Character sings in a shower, with musical notes and morning light.
Taller character stands beside a shorter companion; exact older-brother relationship is contextual.
Adult measures a child against a height scale beside a birthday cake; exact family relationship is contextual.
Singer practices with a music stand and imagined concert; every-afternoon frequency is contextual.
Character wakes and stretches beside singing birds at an early-morning window.
Small plane flies above clouds and islands; destination is contextual.
Coach praises a team, with imagined training and shared work supporting dedication; always frequency is contextual.
Characters collect plastic litter in front of a globe, supporting protecting the planet and reducing waste.
Actor performs before a movie camera and director; famous and new-movie status are contextual.
Satellite-like camera and solar panels orbit Earth with transmission waves to a ground receiver and image screen.`.split('\n');
if(source.length!==92||notes.length!==92||before.length!==76)throw Error('Incomplete U15 scope');
const pairing=new Set([78,82,89]);
const cards=source.map((c,i)=>{const ui=before.find(u=>u.id===c.id),missing=!!ui&&!ui.imageInfo.length,repair=!!ui&&(missing||pairing.has(i+1));return{id:c.id,word:c.word,officialWordId:c.officialWordId,sourceImage:c.sourceImage,sourceImageSha256:c.sourceImageSha256,sourceUnitPublished:c.published,captionEn:c.captionEn,captionZh:c.captionZh,pixelReview:'agent actually viewed original PNGs in 23 labeled contact sheets, every original at about 660px; replacement fairly WebP separately viewed at full 1254',observation:notes[i],originalPairState:i===61?'confirmed_open_jacket_vs_zipped_up_mismatch':i===36?'countdown_timing_qualified':i===70?'appliance_type_not_independently_distinguishable':'core_image_caption_consistent_with_explicit_visual_limits',generalBefore:ui?{hero:ui.hero,imageInfo:ui.imageInfo,screenshot:ui.heroScreenshot.replace('unit-audit/','unit-audit/u15-before/')}:null,generalCardRepair:repair,repairReason:repair?(missing?'Actual general card showed a missing-image placeholder.':'Use a concrete bilingual source pair for the more-time request, few remaining seats or coach praise. Retain the prior generic image recoverably, without asserting that every older lexical illustration was false.'):null,generalCardIntegration:repair?'reviewed_not_installed':ui?'existing_pair_checked_with_visual_limits':'no_official_dictionary_identity',unresolved:i===61?'Exact published replacement is prepared and hash verified, but actual saved general/unit reopens still required.':i===36?'Ignition timing is ambiguous in this no-ID unpublished draft; do not silently change sentence or publish it.':!ui?'Retained supplement has no formal dictionary identity; no identity or publication invented.':null};});
writeFileSync('docs/unit-audit-20261105/LV1-U15-original-image-review.json',JSON.stringify({unit:'LV1-U15',sourcePairs:92,publishedSubset:23,existingGeneralNonPublishedPixelsViewed:14,publishedSourcePixelBasis:'All 92 original PNGs actually viewed in 23 labeled contact sheets; fourteen other existing general images actually viewed in four contact sheets. Fairly replacement separately viewed at full size. Pixel checks are distinct from saved App reopens.',cards},null,2)+'\n');
console.log(JSON.stringify({source:92,missingBefore:cards.filter(c=>c.generalBefore&&!c.generalBefore.imageInfo.length).length,pairings:3,repairs:cards.filter(c=>c.generalCardRepair).length}));
