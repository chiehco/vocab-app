import {readFileSync,writeFileSync} from 'node:fs';
const read=p=>JSON.parse(readFileSync(p,'utf8'));
const source=read('output/unit-audit-20261105/LV1-U08-full-source.json'),before=read('output/unit-audit-20261105/U08-ui-before.json');
const notes=`Character considers telephoning before choosing between alternatives.
One character comforts another, supporting kindness.
An elderly character is accompanied by another character at the church entrance.
Two friends consider visiting a museum after their lunch.
Many people crowd a night market.
Characters communicate with pronoun-style message bubbles; exact grammatical reference comes from the caption.
Character enjoys a televised talk show with a distinctive presenter.
Character plays piano at dusk before a prepared meal.
Several differently prepared noodle dishes show different kinds of noodles.
Children enjoy swings and a slide at a playground.
Playful puppy turns toward its tail in the garden.
Basketball player dunks in front of teammates, supporting the best-player caption.
Breakfast contrasts a tired character with an energetic one.
Characters prefer violin playing and headphone listening respectively.
Two characters wear similarly striped shirts; identity as twins is supplied by the sentence.
One diner passes salt to another at a meal.
Cooler evening weather is supported by dusk and warm clothing.
Child takes out trash after an evening meal.
Party host considers whether an invited friend will arrive.
Doctor indicates a child's growth; milk and sunlight support the nutrition context.
Grandmother tends plants in a garden.
Gardener sows rows of sunflower seeds.
Student imagines a future career as a doctor.
Closed factory and a calendar support joblessness over a period.
Character examines a broken washing machine.
Character plans arrival before noon followed by a telephone call.
Character adds sugar to coffee.
Office setting and nine-o'clock clock support starting work at nine.
Character waits at a bus stop without an arriving bus.
Character nearly forgets an umbrella at a doorway.
Friends greet each other at an airport.
New puppy joins a household.
Volcano-project student asks for additional time, shown by two clocks.
Official gives a recycling lesson to pupils.
Ribbon-cutting ceremony marks the official library opening.
Uniformed officer is beside aircraft in a training setting.
Heavy traffic and an airport are visible; exact near-miss timing and the identity of the airborne aircraft cannot be established from a static image.
Character has fallen from a bicycle at night.
Character celebrates winning a lottery.
An empty train seat and searching traveler support a lost phone.
Friend waits while another searches for keys.
At-home practice contrasts with speaking before an audience.
Winner holds a trophy overhead.
Team members react sadly after a loss.
Losing competitor shakes hands with the winner.
Lost kitten shelters beneath a bench.
News coverage records a charity event.
Author celebrates publication with a newly printed book.
Two people move apart from others for a private conversation.
Before-and-after portraits show a man's aging.
A cheerful expression while entering supports an air of happiness.
Map and destination thought bubble support a meeting place.
Aging adult continues jogging.
Airplane flies over clouds at sunrise.
Small aircraft lands after stormy weather.
Family waits at an airport; an exact two-hour duration is supplied by the caption.
Hiker travels farther along a path; yesterday's exact distance is not visible.
Barista considers moving from part-time work toward a career.
Leading climber has gone farthest among companions.
Cabin lies at the far end of a lake.
School and library are close together.
Library occupies a central position among campus buildings; exact geographic center is simplified.
Campfire embers and a cold night support a dying fire.
Cafe stands near a cinema.
Shopkeeper closes a shutter before an approaching storm.
Dog approaches a boy holding bread.
Shops surround a central square.
Viewer sits in a middle theater row.
Natural dye is prepared in a pot; chemical alternatives are crossed out.
Empty battery and a phone's photographs convey a dead phone battery.
Stern adult warns a child beside dangerous river rapids.
Empty basket supports completely emptied; the subsequent cleaning sequence comes from the caption.
Village mourners grieve a teacher's death.
Child learns to ride a bicycle with adult help.
Many pupils attend a class.
Grandfather uses family photographs to describe family history.
Language-study imagery supports learning.
Elderly character reads a book beside more books and an attentive child.
Classmates share an umbrella.
Students sort leaves into groups by color and shape.
Family watches a historical drama showing an ancient emperor.
Visitors admire an old historic building.
Historian studies maps, old books and a town picture.
Children walk together across a bridge.
Character admires real flowers in a vase.
Viewer enjoys a film on television at night.
Nurse draws a red cross on a map to indicate a hospital.
Parent and child wait at a red pedestrian crossing signal.
Traveler considers alternative paths at a crossroads.
Original red arrow turns left while the only bakery is on the opposite branch; confirmed destination-direction mismatch, replaced separately without changing the caption.
World-travel thought contrasts with remaining in the familiar town.
Successive baking practice and calendars lead to opening a bakery.
Dinosaur film effects look realistic to an impressed viewer.
Promised gift is delivered, supporting being true to one's word.
Disguised traveler presents an identity card, supporting false identity.
Glowing ice cave looks unreal in morning light.
Grateful character thanks a helper carrying heavy moving boxes.`.split('\n');
if(notes.length!==97||source.length!==97||before.length!==85)throw Error('Unexpected U08 scope');
const cards=source.map((c,i)=>{const ui=before.find(r=>r.id===c.id),missing=!!ui&&!ui.imageInfo.length;return {id:c.id,word:c.word,officialWordId:c.officialWordId,sourceImage:c.sourceImage,sourceImageSha256:c.sourceImageSha256,sourceUnitPublished:c.published,captionEn:c.captionEn,captionZh:c.captionZh,pixelReview:'agent actually viewed original PNG contact sheets (660px, every labeled image); intersection also viewed at original size; App unit/general cards opened separately',observation:notes[i],originalPairState:i===89?'confirmed_direction_mismatch_repair_pending':'core_image_caption_consistent',generalBefore:ui?{hero:ui.hero,imageInfo:ui.imageInfo,screenshot:ui.heroScreenshot}:null,generalCardRepair:missing,repairReason:missing?'Actual general card has a missing-image placeholder.':null,generalCardIntegration:missing?'reviewed_not_installed':ui?'existing_pair_core_consistent':'no_official_dictionary_identity',unresolved:!ui?'Existing NOID supplemental/form item; no official dictionary identity invented.':i===89?'Replacement asset verified separately; UI reopening still required.':null};});
writeFileSync('docs/unit-audit-20261105/LV1-U08-original-image-review.json',JSON.stringify({unit:'LV1-U08',sourcePairs:97,publishedSubset:22,existingGeneralPixelsViewed:50,cards},null,2)+'\n');
console.log(JSON.stringify({originalPixelsViewed:97,generalCardVisits:85,missing:cards.filter(c=>c.generalCardRepair).length,noDictionaryIdentity:12}));
