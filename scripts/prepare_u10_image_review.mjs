import{readFileSync,writeFileSync}from'node:fs';
const read=p=>JSON.parse(readFileSync(p,'utf8')),source=read('output/unit-audit-20261105/LV1-U10-full-source.json'),before=read('output/unit-audit-20261105/U10-ui-before.json');
const notes=`Two travelers follow a riverbank toward a stone bridge.
Teacher permits backpack-wearing pupils to leave through a classroom door into heavy rain.
Two riders cycle side by side on a quiet rural path; sibling identity is supplied by the sentence.
A cat reclines in a sunlit courtyard beside a reclining character.
Two characters turn away from a worried central character; distrust is conveyed, exact prior lie is supplied by caption.
Character puts a coin into a savings jar beside more coins; exact half and weekly frequency cannot be proved statically.
Character displays a rectangular parking pass beside a parked car and meter.
Teacher gestures stop at a pupil using a phone; collected phones lie in a basket.
Backpacked character checks the door handle while holding keys.
Accusing character points at another character holding a crumb-covered plate beside an emptied cake plate.
Children watch a hot-air balloon aloft above them.
Character waits at a clearly marked bus shelter while a bus approaches on an empty road.
Character holds a key confidently beside a closed door and keyhole.
Character plays among falling orange and red autumn leaves.
Pupil raises one hand at a desk in a classroom with a teacher.
Character signals quiet beside a sleeping baby in a crib.
Character packs pajamas and a toothbrush into a small travel bag; beach hat and towel support trip packing.
Several successive traveler positions depict wrong turns followed by arrival at a hotel.
Loaded heavy cart crosses a stone bridge in heavy wind and rain without collapse.
Busy worker reaches toward a phone while writing at a desk.
Doctor firmly points toward a bed while advising an unwell character to rest.
Athlete lifts a heavy loaded barbell overhead.
Character uses a front-loading washing machine full of clothes.
Character tastes a pale cup of tea beside plain water; weak flavor itself comes from caption.
Character braces a cracked old garden wall while heavy rain falls.
Whistle-wearing coach supports a worried athlete balancing on one foot on a low beam.
Character clears used bowls and plates from a dining table.
Character pulls a warm blanket over a sleeping baby.
Two characters share headphones and enjoy the same music; sister relationship is not pixel-proven.
Car occupies a marked parking space beside a shopping center; finally is a time/effort simplification.
Characters gather scattered clothing and books in a bedroom.
Confused traveler holds a map and asks a shopkeeper beside blank direction arrows.
Character recalls a hazy childhood bus trip while looking at a faded photograph.
Speaker addresses attentive listeners; enclosed room boundaries are omitted in the simple illustration.
Character observes soaked soil and puddles after rain; exact overnight timing is supplied by caption.
Characters run through heavy rain and lightning toward an open illuminated house door.
Hiker checks a phone on a mountain ridge with a distant antenna.
Character lifts a cloth to discover a box of old family photographs in an attic.
Character finds a key ring in a jacket pocket beside a coat rack.
Characters check stacks of report pages while placing pages in a folder.
Character opens a keepsake box for a surprised friend, illustrating disclosure of something private.
Character eats an ordinary breakfast at a table in a domestic room.
Children celebrate snow among plants in a mild-looking climate; local rarity cannot be proved from a single scene.
Basketball team plays and celebrates at a court; tournament-final status cannot be independently read from pixels.
Bird circles above garden trees while a character looks up.
Small propeller plane flies above a village.
Character hands one sheet from a stack of paper to another character.
Character pours steaming coffee into a cup.
Kind companion comforts a touched character who holds hands to the chest.
Night snow, cold character and thermometer support freezing conditions; exact numerical threshold is not visibly labeled.
Puppy sleeps beneath a chair while a character watches.
Character lifts a sofa cushion to find keys beneath it.
Tired hiker tips an empty water bottle with no water coming out.
Character hikes beside a river among trees and rocks.
Reporter holds a microphone beside a video camera outdoors in heavy rain.
Driver and friends pass illuminated night-market stalls in a car.
Athlete holds the chest at a race starting line, conveying awareness of a quick heartbeat.
Hiker examines steaming hot-spring water among forested rocks.
Wildflowers grow naturally beside a river while a character observes.
Reporter interviews a farmer with microphone and notes in storm-damaged farmland.
Traveler presents a boarding pass at an airport service counter while requesting compensation.
Character considers a bowl of soup and a plate of salad as two alternatives.
Several pupils celebrate with papers while one sad pupil looks at a paper separately.
Firefighter extinguishes a burning building at night while uninjured characters watch safely.
Traveler with luggage stands in a small seaside hotel bedroom; future plan is illustrated by the intended setting.
Car is parked on a private driveway beside a house.
Bus driver waits behind a pedestrian crossing while children cross in front.
Teacher accepts a worried pupil's homework paper; exact usual policy and lateness are supplied by caption.
Pianist performs at a grand piano for visibly delighted listeners.
Character watches colorful fireworks reflected in a river at night.
Family relaxes beside a lit fireplace with blankets and a cup.
Scientist observes planets through a telescope beside a water container; research question remains conceptual.
Lifeguard watches swimmers from a raised chair with rescue float and whistle.
Character observes a few broken branches left on the ground after a storm.
Character presents a spacious apartment containing a large dining table.
Original image shows closing a window beside a shivering character, contradicting opening a door with hands full.
Character waters wilted plants in hot sunlight; the warning not to neglect watering is illustrated through the consequence and corrective action.
Character looks across a lit nighttime city from the top of a tower.
Cook prepares vegetables and a steaming pot while family waits at the dinner table.
Friend shelters a distressed companion under an umbrella during rain.
Guide points to a museum and the rising sun while advising a small tour group; precise best visit time is contextual.
Character reads an open book in bed before sleep.
Reader selects books at a library; every-Saturday schedule is not pixel-proven.
Characters arrange cake, gifts, balloons and bunting for a birthday party.
Traveling companions help each other cross a stream, supporting strengthened friendship.
Neighbor helps carry a heavy grocery box toward another person's door.
Dog snarls toward distant strangers while a character holds it; prior fright is supplied by caption.
Two travelers greet outside a train station at a specific meeting place.
Character shows a recognizable cow photograph to a uniformed police officer taking notes.`.split('\n');
if(notes.length!==89||source.length!==89||before.length!==77)throw Error('U10 scope mismatch');
const cards=source.map((c,i)=>{const ui=before.find(u=>u.id===c.id),missing=!!ui&&!ui.imageInfo.length,repair=missing||[1,62].includes(i+1);return{id:c.id,word:c.word,officialWordId:c.officialWordId,sourceImage:c.sourceImage,sourceImageSha256:c.sourceImageSha256,sourceUnitPublished:c.published,captionEn:c.captionEn,captionZh:c.captionZh,pixelReview:'agent actually viewed original PNG contact sheets (660px, every labeled original); actual general/unit cards opened separately',observation:notes[i],originalPairState:i===75?'confirmed_door_window_mismatch_repair_pending':'core_image_caption_consistent_with_recorded_visual_limits',generalBefore:ui?{hero:ui.hero,imageInfo:ui.imageInfo,screenshot:ui.heroScreenshot.replace('unit-audit/','unit-audit/u10-before/')}:null,generalCardRepair:repair,repairReason:missing?'Actual general card has a missing-image placeholder.':i===0?'Legacy Chinese riverbank clue and automatic city-street example disagree; bind the already authored river/bridge source pair explicitly, preserving every formal example.':i===61?'Actual legacy image shows two apples while its displayed example concerns crowded railway platforms. Bind the independently checked authored soup/salad alternative pair; retain the platform example unchanged and do not claim it illustrated.':null,generalCardIntegration:repair?'reviewed_not_installed':ui?'existing_caption_pair_checked':'no_official_dictionary_identity',unresolved:!ui?'Existing NOID supplemental/form; no dictionary identity invented.':i===75?'Unit opening-door repair is verified as a separate asset; general mind must retain the already reviewed U07 closing-window pair.':null};});
writeFileSync('docs/unit-audit-20261105/LV1-U10-original-image-review.json',JSON.stringify({unit:'LV1-U10',sourcePairs:89,publishedSubset:35,existingGeneralNonPublishedPixelsViewed:20,publishedSourcePixelBasis:'Original source pixels viewed for all 89 pairs; actual loaded unit/general paths checked separately. No claim that every unchanged UI screenshot was independently viewed.',cards},null,2)+'\n');
console.log(JSON.stringify({sourcePairs:89,generalBefore:77,missing:cards.filter(c=>c.generalCardRepair&&c.repairReason.startsWith('Actual general card')).length,pairingRepairs:2,totalGeneralRepairs:cards.filter(c=>c.generalCardRepair).length}));
