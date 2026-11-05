import {readFileSync,writeFileSync} from 'node:fs';
const read=p=>JSON.parse(readFileSync(p,'utf8')),source=read('output/unit-audit-20261105/LV1-U11-full-source.json'),before=read('output/unit-audit-20261105/U11-ui-before.json');
const notes=`Character holds a collar while the dog runs along the path by home; hopeful reaction is clear.
Character puzzles over cards at a table; initial difficulty is represented by expression, not a game rule proof.
Character writes again with two crumpled attempts beside the page.
Character stands dejected in a muddy flooded path during rain.
Birthday cake, candles and gift are presented to a happy recipient.
Hiker walks comfortably on a trail with scenery and backpack.
Character works over books and papers at a desk beneath a nighttime window.
Coach directs sweating trainees carrying a log, climbing and crawling.
Character cooks soup with recognizable vegetables; uncomplicated ingredients support a simple recipe.
Three clear pictorial steps show assembling a stool; finished stool appears below.
Relaxed character reads and drinks in a hammock.
Wild horses run across open grassland.
Character places a paper note on a refrigerator.
Childlike character plays with wet soil and puddles.
Cat sleeps on the kitchen floor.
Presenter shows a phone to a group of interested students.
Character records plant growth drawings while observing a plant through a magnifier.
Character writes in a notebook while seated in bed; notebook location/time is simplified.
Character steadies a shelf as a dish tilts and a ceiling lamp hangs askew.
Character observes a wriggling earthworm on damp soil.
Character handles rich soil beside healthy tomato plants and exposed roots.
Older character reads a picture book to a child in bed; exact kinship is supplied by caption.
Character has milk and groceries in a supermarket basket.
Character fishes beside a flowing river and nearby tent.
Character faces large piles of books and papers while working at a desk.
Character fills a car at a recognizable gasoline pump.
Children step from stone to stone across a shallow stream.
Several members around a table raise hands and smile in assent.
Gardener works with smiling companions; agreeable social behavior is supported.
Two characters propose different film pictures by a television; disagreement is clear, kinship/frequency are not pixel-proved.
Two characters shake hands across documents after discussion.
Two travelers react happily to meeting in an airport; chance is an abstract contextual relation.
Two characters struggle to move a large box through a doorway.
Host welcomes guests to an outdoor party with refreshments and lanterns.
Character approaches a singer holding a guitar on stage.
Hiker packs a raincoat beneath a mostly clear sky; exact likelihood is not numerically visible.
Character struggles to close an overfull suitcase zipper.
Two characters react to a tiny object; minor matter and later laughter are simplified in one frame.
Two upset characters contend over a computer screen.
Tired character gestures toward a paper pile at a nighttime desk; exact half and tomorrow are not separately visible.
Character inspects visibly worn shoe soles.
Friends congratulate a runner with a finish ribbon and cheering gestures.
Gloved fighter trains against a punching bag.
Child holds a toy anxiously in a car seat; restlessness is conveyed by posture.
Character arranges favorite photos in a vertical series on a paper sheet; a pictorial list is plausible, no text list is visible.
Character reaches beneath an old table toward a single copper-colored coin; denomination is not independently readable.
Buyer exchanges a bill for a used book; one-dollar denomination is caption context.
Hiker holds a compass near mountains and campsite; north depends on the caption/reference frame.
Birds migrate from snowy scenery toward warmer coast; south is not independently geographic proof.
Traveler considers mountains at dawn with compass and backpack; planning and east depend on context.
Child displays a shiny coin by a fountain; exact penny denomination is not independently readable.
Buyer presents bills for a basket of apples; five-dollar total cannot be inferred from unmarked bills.
Traveler visits older figures in a snowy mountain town; northern location/kinship are supplied by caption.
Character walks a warm-looking coast holding an unused jacket; region and season are contextual.
Character carries a box toward a coastal home; recent move, east and kinship are supplied by caption.
Temple sits across a river under a low sun; west depends on the orientation convention.
Character joins companions at a set dinner table.
Character compares shoes on a laptop and considers coins; online price-checking is clear.
King addresses island inhabitants with crown and cape; years of rule are contextual.
Character watches a projected cowboy western while eating popcorn.
Two friends join halves of a model car with tools beside them.
Older character shares a family photo album with children; priceless value is conveyed by care and interest.
Worker checks a blank price tag and vase before sale.
Judge announces from a raised bench while holding a document.
Dinner dishes are prepared and companions gather at the table.
Hiker enjoys sunny clear weather in the mountains.
Character strolls in a shopping mall with a cinema and clock in view.
Character draws a straight line along a ruler.
Leader gestures ahead as the group follows.
Cook prepares vegetable soup while companions set the table.
Reader reacts to a mystery book; identifying a killer is an abstract story event, not readable page text.
Buyer chooses sports shoes among displayed pairs; top brand rank is conveyed by selection, not readable branding.
Buyer considers several shoe sizes beside a foot measuring scale.
Character springs excitedly upward from a chair.
Coin rests at the bottom of a tall transparent jar.
Two characters meet beside a park fountain; exact noon is not visibly timed.
Deer leaps over a narrow stream, with a nearby observer.
Vegetable soup steams gently in a pot over a stove.
Character shapes a clay bowl on a pottery wheel with tools and finished bowls nearby.`.split('\n');
if(notes.length!==79||source.length!==79||before.length!==71)throw Error('U11 scope mismatch');
const pairing=new Set([35,40,72,73]);
const cards=source.map((c,i)=>{const ui=before.find(u=>u.id===c.id),missing=!!ui&&!ui.imageInfo.length,repair=missing||pairing.has(i+1);return{id:c.id,word:c.word,officialWordId:c.officialWordId,sourceImage:c.sourceImage,sourceImageSha256:c.sourceImageSha256,sourceUnitPublished:c.published,captionEn:c.captionEn,captionZh:c.captionZh,pixelReview:'agent actually viewed original PNG contact sheets (660px, every labeled original); actual card loading checked separately',observation:notes[i],originalPairState:'core_image_caption_consistent_with_explicit_visual_limits',generalBefore:ui?{hero:ui.hero,imageInfo:ui.imageInfo,screenshot:ui.heroScreenshot.replace('unit-audit/','unit-audit/u11-before/')}:null,generalCardRepair:repair,repairReason:missing?'Actual general card shows a missing-image placeholder.':i===39?'The actual resting-under-tree picture and remaining-report example use distinct senses of rest; bind the checked report pair without changing its sentence.':pairing.has(i+1)?'Bind the already authored concrete pair for the displayed singer opportunity, top shoe brands or shoe size instead of the loosely related doorway, steps or box-size symbol. The original metaphorical asset remains recoverable.':null,generalCardIntegration:repair?'reviewed_not_installed':ui?'existing_pair_checked_with_visual_limits':'no_official_dictionary_identity',unresolved:!ui?'Retained source supplement has no formal dictionary identity; no identity invented.':i===44?'Photos form a pictorial list; written names are not visible. Core listing concept supported with this explicit limitation.':null};});
writeFileSync('docs/unit-audit-20261105/LV1-U11-original-image-review.json',JSON.stringify({unit:'LV1-U11',sourcePairs:79,publishedSubset:41,existingGeneralNonPublishedPixelsViewed:8,publishedSourcePixelBasis:'All 79 source images actually viewed. Existing eight non-published general images also separately viewed. Exact path, caption, persistence and loaded-image checks are independent of source pixel review.',cards},null,2)+'\n');
console.log(JSON.stringify({missing:cards.filter(c=>c.generalCardRepair&&c.repairReason.startsWith('Actual general card')).length,pairings:4,total:cards.filter(c=>c.generalCardRepair).length}));
