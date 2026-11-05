import {readFileSync,writeFileSync} from 'node:fs';
const read=p=>JSON.parse(readFileSync(p,'utf8')),source=read('output/unit-audit-20261105/LV1-U14-full-source.json'),before=read('output/unit-audit-20261105/U14-ui-before.json');
const notes=`Character searches under a raised sofa cushion for keys; searching action is clear.
Friends surround a happy surprised character with cake and gifts; birthday emotion is clear, classmate relationship is contextual.
Homesick character remembers an older woman cooking; exact grandmother relationship and move history are contextual.
Character presents a boxed wristwatch as a birthday gift; father identity is represented by imagined celebration.
Gift recipient looks emotionally touched at a dinner table with friends.
Reader sheds tears over a story, with affectionate imagery supporting a touching story.
Character notices a curtain moving with a small hidden silhouette; exact slight movement is simplified.
Character faces a puzzle with one unfilled gap and an imagined missing piece; completion is not pictured.
Children kick a ball across a playground.
Laughing character covers the mouth with a hand.
Character reacts to hot soup at a spoon and a reddened lip, supporting a burned lip without diagnosing severity.
Character waits inside a cafe while rain is visible outside; the later rain stopping is contextual, not contradicted by current rain.
Children play basketball on an outdoor court in a park.
Team plays volleyball across a net on a beach; after-school timing is contextual.
Runner drinks water beside a path after exercise; the exact mouthful quantity and run duration are contextual.
Character chooses a soft red lipstick beside a mirror, with party clothes imagined.
Office routine vignettes surround a confident worker; insider knowledge is contextual.
Children play with a ball outside beneath low evening sunlight.
Character builds a small plank bridge across a stream for companions.
Character measures a growing plant using a ruler; exact inches and growth history are not independently readable.
Character admires a broad mountain landscape.
Nervous newcomer stands apart from chatting students by a school; first-day status is contextual.
Camera-carrying visitors tour an old city street.
Reader sits under a good lamp with an eye-rest symbol; protection of eyesight is the sentence claim, not medical proof from pixels.
Adult gently rocks a baby in a rocking chair; relationship is contextual.
Stony path is visible, but the main narrative moves from angry separated characters to friendly reconciliation. Full 1254 original and actual unit screenshot were additionally viewed. Physical rocky-path core is present; exact difficulty walking is not directly depicted.
Character enjoys fresh air in a garden with post-rain puddles and a rainbow.
Three characters paint a fence white together.
Bird head is stuck in the narrow neck of a glass bottle.
Hiker enjoys cold lemonade beside hiking gear; exact refreshment judgment is contextual.
Character paints a garden fence white with a brush and paint bucket.
Worker paints a front door blue; hiring and yesterday are contextual.
Character colors a large red flower with crayons.
Character tries a silver-colored necklace beside a new dress and party shoes; exact metal composition is contextual.
Character wears a blue necktie at a decorated wedding setting.
Character carries a large heavy bag over one shoulder on a path.
Children watch boats while seated on a river bank.
Character tends tomatoes and roses in a garden; weekend frequency is contextual.
Character pours oil into a vegetable pan; olive identity is represented by olives nearby, always frequency is contextual.
Character waves away a visible fly buzzing near dinner in a kitchen.
Bank employee explains account paperwork and coins to a customer beside a bank building; exact document text is blank.
Gardener prunes roses in a backyard full of flowers.
Character waters flowers and tends a garden, supporting relaxing gardening; weekend frequency is contextual.
Character pours dark petroleum into a processing apparatus that yields fuel beside a vehicle; this is conceptual simplification, not an engineering diagram.
Cold wind blows leaves and a scarf while character pulls the jacket close.
Student solves a shape puzzle with an idea lightbulb; exact speed/intelligence is contextual.
Seated diner asks a waiter holding a bill folder; the bill text and spoken request are contextual.
Traveler carries a flight ticket and suitcase near an airplane; booking purpose and family visit are contextual.
Strong wind blows a hat away as character reaches after it.
Backpacked character follows a visibly winding mountain road.
Lanterns glow in evening light while characters light them.
Fresh flowers brighten a small kitchen beside a window.
Character adjusts a tablet brightness slider in bed; exact downward movement is simplified.
Dentist checks a patient's mouth in a dental chair; six-month frequency is contextual.
Older character places a checkbook in a drawer and turns a key; kinship and habitual storage are contextual.
Character uses a magnifier to inspect ground marks for clues.
Student studies a geometry-like book at night while a companion sleeps; tomorrow's exam is contextual.
Arriving character stands by a clock visibly indicating seven o'clock; exact-time sharp is supported.
Concerned student is reassured by a friend beside a test sheet; test result text is blank.
Teacher holds a class list and pupils raise hands at desks, supporting calling the roll.
Temperature-drop arrow and low thermometer accompany a sunset-to-night scene and shivering character.
Character sharpens pencils with a hand-held sharpener before study.
Two boxes are drawn the same size side by side.
Character struggles to cut a whole tomato with a knife, supporting dullness rather than a completed cut.
Worried character waits near an empty cat bowl and open door; missing-cat return history is contextual.
Character examines a large crack in an old stone bridge with concern.
Character camps beside a river under stars; exact entire-night duration is contextual.
Excited children open presents beside a Christmas tree in morning light.
Characters watch a movie late at night beside a dark window.
Character arrives at an office in early morning light; always frequency is contextual.
Character warms hands by a campfire beside a tent.
Children jump excitedly as a train arrives at a platform.
Older character happily receives a handmade heart card from children; exact grandmother relationship is contextual.
Character rides joyfully in a hot-air balloon.
Exciting football action shows a shot toward goal and cheering companions; final-minutes timing is contextual.
Hurried character speaks on a telephone while carrying paperwork beside a clock; later callback intention is contextual.
Briefcase-carrying character walks home along a sunset path; recent repeated frequency is contextual.
Character eats dinner while the sun is still low outside, supporting an early dinner for a sunset.
Family-like group packs a suitcase with beach items and a beach plan pictured; next-month timing and relationship are contextual.`.split('\n');
if(notes.length!==79||source.length!==79||before.length!==59)throw Error('Incomplete U14 scope');
const pairing=new Set([68,75]);
const cards=source.map((c,i)=>{const ui=before.find(u=>u.id===c.id),missing=!!ui&&!ui.imageInfo.length,repair=!!ui&&(missing||pairing.has(i+1));return{id:c.id,word:c.word,officialWordId:c.officialWordId,sourceImage:c.sourceImage,sourceImageSha256:c.sourceImageSha256,sourceUnitPublished:c.published,captionEn:c.captionEn,captionZh:c.captionZh,pixelReview:'agent actually viewed original PNGs in 20 labeled contact sheets, every image at about 660px; rocky also viewed at full 1254 and actual unit screenshot',observation:notes[i],originalPairState:i===25?'physical_core_present_main_narrative_intent_qualified':'core_image_caption_consistent_with_explicit_visual_limits',generalBefore:ui?{hero:ui.hero,imageInfo:ui.imageInfo,screenshot:ui.heroScreenshot.replace('unit-audit/','unit-audit/u14-before/')}:null,generalCardRepair:repair,repairReason:repair?(missing?'Actual general card showed a missing-image placeholder.':'Use the specific unchanged authored Christmas-present or exciting-football pair, with explicit bilingual caption; old generic image remains recoverable and is not called a false lexical illustration.'):null,generalCardIntegration:repair?'reviewed_not_installed':ui?'existing_pair_checked_with_visual_limits':'no_official_dictionary_identity',unresolved:i===25?'Physical rocky stones support the word; figurative friendship narrative dominates. Keep original approved path caption and record the specific depiction limit.':!ui?'Retained source supplement has no formal dictionary identity; no identity or publication invented.':null};});
writeFileSync('docs/unit-audit-20261105/LV1-U14-original-image-review.json',JSON.stringify({unit:'LV1-U14',sourcePairs:79,publishedSubset:23,existingGeneralNonPublishedPixelsViewed:7,publishedSourcePixelBasis:'All 79 original PNGs actually viewed in 20 labeled contact sheets; seven other existing general images separately viewed in two contact sheets. Rocky original additionally viewed at full size and in actual unit UI. Pixel checks remain separate from saved App reopens.',cards},null,2)+'\n');
console.log(JSON.stringify({missingBefore:cards.filter(c=>c.generalBefore&&!c.generalBefore.imageInfo.length).length,pairings:pairing.size,total:cards.filter(c=>c.generalCardRepair).length}));
