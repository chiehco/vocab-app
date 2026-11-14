import {readFileSync,writeFileSync} from 'node:fs';
const read=p=>JSON.parse(readFileSync(p,'utf8'));
const source=read('output/unit-audit-20261105/LV1-U09-full-source.json'),before=read('output/unit-audit-20261105/U09-ui-before.json');
const notes=`Character constructs a wooden bridge over a stream with planks and tools.
Orange and red autumn leaves fall around a character in a park.
Two sandwich halves are visible, one held by the character; half is clear, eating time is simplified.
Science building has an observatory dome and atom symbol; an actual telescope tube is not visible.
A fuller and a smaller vegetable basket contrast quantities; temporal change of one basket is simplified.
Hot-air balloon is aloft while a child watches; ascent is conveyed by its elevated position.
Character arranges toy cars on the floor near more cars in a box; exact before/after count is not shown.
Open cage and flying bird convey setting a bird free.
Worried shopper counts coins beside groceries.
Cook presents a festive roast dinner with a holiday decoration.
One adult cooks while another helps two children with written homework.
Character runs freely through an open field and gate.
Caped character flies freely in a wide sky.
Host indicates an empty seat at a dining table.
Broken old phone and a large coin pile convey costly repair.
Shopper compares shoes and money in a shoe shop.
Worried character holds an empty wallet beside a new phone and a large pile of coins.
Character eats cereal with coffee at a breakfast table; regularity comes from the caption.
Character walks with a work bag through an ordinary street.
Character gives flowers to a partner beside a celebratory cake; exact anniversary is supplied by the caption.
One small child plays with blocks while two adults look on.
Child uses a horseshoe magnet to pick up paper clips.
Character thinks of keys with a remembering/searching gesture; inability to recall exact location is conveyed by the sentence.
Character checks a horizontal shelf using a spirit level.
Audience sits on ground or picnic blankets near an outdoor music stage.
Character checks empty pockets while keys lie on the table behind.
One child swings while a second cheers nearby; plural kids are swinging is a literal quantity simplification.
Character descends stairs toward an underground train platform.
Photographer takes a friend's picture with a mountain village behind.
Character wipes the kitchen floor while a cat sleeps beside it.
Cook covers a small finger wound beside chopped vegetables and a knife.
Full diner declines an offered dessert beside an emptied plate.
Character rides a bicycle without assistance.
Artist paints an outdoor landscape on an easel.
Reusable cloth shopping bag contrasts with plastic bags.
Bakery workers prepare dough and bread with morning/evening imagery; exact weekday schedule is not independently visible.
Character celebrates a finished solar-system model; model detail is reasonably simplified.
Character opens a completely empty lunch box.
An open blossom supports a flower opened fully.
Child fits shaped pieces into the corresponding holes.
Traveler uses a phone beside a restaurant menu; exact translated words are simplified as pictures.
Character cannot reach an apple even while standing on a rock.
Heavy rock overloads a tiny toy sailboat in water.
Artist paints a village landscape; future sale is supplied by the caption.
Character arranges framed art among decorative plants and pottery.
Broken glass at a washing-up sink illustrates the mishap warned against by the caution sentence.
Small plane is on grass beside a windsock, supporting safe landing.
Three ill characters lie in bed while a fourth stands by the door; definite everyone-in-bed mismatch, repaired separately.
Window breaks into fragments; the specific ball cause is not visible and is not independently certified.
Falling ball and broken clay flowerpot clearly show smashing into pieces.
Tourist photographs a recognizable leaning tower.
Artist paints the visible valley landscape.
Bird lands gently on a garden fence.
Tired worker rests with a drink beside stacked work boxes.
Two glasses contain different juice amounts, with less in the smaller glass.
Character draws animal pictures in a notebook.
Worried character checks bus seats; precise confidence about leaving an umbrella comes from the sentence.
Character wears a thick jacket and scarf in wintry weather.
Child presents a drawing of a family.
Character paints a backyard fence with a brush and paint bucket.
Colorful flowers attract several butterflies.
Night-market food stall attracts customers eating and looking at food.
Character ties two parcels together using ribbon.
Character walks near homes and a river at sunset; dinner occurs outside the depicted instant.
Character gestures confidently beside a closed front door and key.
Smiling medal-wearing athlete crosses an open stadium gateway toward the foreground; entering direction remains uncertain.
Happy adult hugs a small returning friend beside the home doorway.
Character checks a closed door handle and lock again.
Character takes an umbrella while a dark cloud suggests possible rain.
Unsure traveler stands at a fork with alternative paths.
Character compares two keys beside a locked chest.
Character waits beside theater entrance doors; exact before-opening moment is simplified.
Character holds a ticket at a race gateway but walks toward the foreground; entry direction remains uncertain.
Character walks toward an outdoor exit from the theater seating area.
Viewer enjoys a funny television scene.
Character points toward the right side at a corner; incoming travel reference is not fully specified.
Speaker addresses seated listeners with emphatic gestures.
Character listens peacefully beside a window with nighttime rain.
Hiker sleeps in a tent beside boots and a backpack.
Front-facing character raises the glove on its own right side to catch a ball.
Guard protects a smaller child from an angry bully.
Shopper tries shoes on beside other sizes and shoe boxes.
Character hides behind a tree during play.
Traveler with a map reaches a barricaded dead-end road.
Child attempts to place a rectangular puzzle piece into a round hole.
Bookshop is on the screen-left side of the street.
Front-facing character carries a lantern on its own left side at night.
Character considers seaside and mountain vacation alternatives.
Museum guide presents a painting to visitors.
Character considers two different restaurant meals.
Character confidently chooses a sound bridge over a broken alternative.
Character stays indoors beside heavy rain at the window.
Traveler points to a station clock while a train is visible.
Character listens on headphones while stirring food in a kitchen.
Character eats a vegetarian bowl containing vegetables and tofu.
Journalist takes notes and holds a microphone while interviewing a medal-wearing athlete.`.split('\n');
if(notes.length!==96||source.length!==96||before.length!==81)throw Error('U09 scope mismatch');
const pending=new Set([66,73]);
const cards=source.map((c,i)=>{const ui=before.find(r=>r.id===c.id),missing=!!ui&&!ui.imageInfo.length;return {id:c.id,word:c.word,officialWordId:c.officialWordId,sourceImage:c.sourceImage,sourceImageSha256:c.sourceImageSha256,sourceUnitPublished:c.published,captionEn:c.captionEn,captionZh:c.captionZh,pixelReview:'agent actually viewed original PNG contact sheets (660px, every labeled image); actual unit/general cards opened separately',observation:notes[i],originalPairState:i===47?'confirmed_literal_mismatch_repair_pending':pending.has(i+1)?'key_action_direction_pending':'core_image_caption_consistent_with_recorded_visual_limits',generalBefore:ui?{hero:ui.hero,imageInfo:ui.imageInfo,screenshot:ui.heroScreenshot.replace('unit-audit/','unit-audit/u09-before/')}:null,generalCardRepair:missing,repairReason:missing?'Actual general card has a missing-image placeholder.':null,generalCardIntegration:missing?'reviewed_not_installed':ui?'existing_pair_core_consistent':'no_official_dictionary_identity',unresolved:!ui?'Existing NOID supplemental/form item; no official identity invented.':pending.has(i+1)?'Entry direction cannot be resolved reliably from the existing static scene; not marked passed.':i===47?'Replacement verified; exact integration and UI reopening still required.':null};});
writeFileSync('docs/unit-audit-20261105/LV1-U09-original-image-review.json',JSON.stringify({unit:'LV1-U09',sourcePairs:96,publishedSubset:51,existingGeneralNonPublishedPixelsViewed:14,publishedSourcePixelBasis:'Published-source images viewed as original PNG pairs; actual general/unit loaded paths verified separately. This is not a claim that every unchanged UI screenshot was independently viewed.',cards},null,2)+'\n');
console.log(JSON.stringify({sourcePairs:96,generalBefore:81,missing:cards.filter(c=>c.generalCardRepair).length,pendingDirections:[66,73]}));
