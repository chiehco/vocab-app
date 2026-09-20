import images from '../vocabulary/lv1ReviewedImages.json';
import { progressDb } from '../../db/progressDb';
import { contentDb } from '../../db/contentDb';
import { saveGroup } from './store';
import type { CustomGroup } from './model';

export const lv1ReviewedGroups = Array.from({ length: 15 }, (_, index) => {
  const unit = index + 1;
  const cards = images.filter(card => card.unit === unit);
  return {
    unit,
    templateId: `LV1-REVIEWED-IMAGES-U${String(unit).padStart(2, '0')}`,
    name: `LV1 Unit ${String(unit).padStart(2, '0')}（已核准）`,
    wordIds: [...new Set(cards.flatMap(card => card.officialWordId ? [card.officialWordId] : []))],
    pairCount: cards.length,
    supplements: cards.filter(card => !card.officialWordId).map(card => card.displayWord),
    galleryPath: `wordbeast/lv1-reviewed/index.html#unit-${String(unit).padStart(2, '0')}`,
  };
});

// An explicit user click adds templates; app startup never mutates personal groups.
// A transaction also prevents duplicates from concurrent clicks/tabs. Existing edits win.
export async function addLV1ReviewedGroups(units = lv1ReviewedGroups.map(group => group.unit)) {
  if (!units.length || units.some(unit => !lv1ReviewedGroups.some(group => group.unit === unit))) {
    throw new Error('無效的 Unit');
  }
  const templates = lv1ReviewedGroups.filter(group => units.includes(group.unit));
  const requiredIds = [...new Set(templates.flatMap(group => group.wordIds))];
  if ((await contentDb.words.bulkGet(requiredIds)).some(word => !word)) {
    throw new Error('字卡資料尚未載入完成，請稍後再試或重新開啟 App。');
  }
  return progressDb.transaction('rw', progressDb.customGroups, async () => {
    const existing = await progressDb.customGroups.toArray();
    const groups: CustomGroup[] = [];
    let added = 0;
    for (const template of templates) {
      let group = existing.find(group => group.templateId === template.templateId);
      if (!group) {
        group = { id: crypto.randomUUID(), name: template.name, itemIds: [], wordIds: [...template.wordIds],
          templateId: template.templateId, templateRevision: '20260920-approved-images', updatedAt: Date.now() };
        await saveGroup(group);
        added++;
      }
      groups.push(group);
    }
    return { groups, added };
  });
}
