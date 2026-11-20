import type { LearningItem } from './model';
import { applyReviewedReading, type ReadingTable } from './reviewedReading';

const vocabulary: ReadingTable = {
  "LI-LV3U22-V002": ["n./vt.", "搖籃、發源地（名詞）；輕抱（及物動詞）"],
  "LI-LV3U22-V042": ["adj.", "勇敢的"],
  "LI-LV3U22-V043": ["n.", "勇氣"],
  "LI-LV3U22-V044": ["n.", "膽小；懦弱"],
  "LI-LV3U22-V045": ["vt.", "擁抱"],
  "LI-LV3U22-V048": ["adj.", "考古學的"],
  "LI-LV3U22-V050": ["n.", "保育人士"],
  "LI-LV3U22-V055": ["adv.", "深深地"],
  "LI-LV3U22-V057": ["adj.", "詳細的；深入的"],
  "LI-LV3U22-V059": ["vi.", "用餐、吃正餐"],
  "LI-LV3U22-V060": ["n.", "晚餐；正餐"],
  "LI-LV3U22-V061": ["n.", "英鎊"],
  "LI-LV3U22-V062": ["adj.", "一流的；最棒的"],
  "LI-LV3U22-V064": ["vt.", "使浸入"],
  "LI-LV3U22-V065": ["adj.", "沾滿肥皂的"],
  "LI-LV3U22-V068": ["adj.", "可消除的"],
  "LI-LV3U22-V070": ["vt.", "刪除"],
  "LI-LV3U22-V075": ["名詞片語", "加油站（美式）"],
  "LI-LV3U22-V076": ["名詞片語", "加油站（英式）"],
  "LI-LV3U22-V077": ["名詞片語", "食品雜貨店"],
  "LI-LV3U22-V083": ["n.", "不誠實"],
  "LI-LV3U22-V085": ["n.", "寶石"],
  "LI-LV3U22-V087": ["n.", "廢材料（尤指廢汽車）堆積場"],
  "LI-LV3U22-V092": ["n.", "展覽會；a book fair（書展）"],
  "LI-LV3U22-V093": ["名詞片語", "亂丟垃圾的人；討厭鬼"],
  "LI-LV3U22-V097": ["名詞片語", "購物商場"],
  "LI-LV3U22-V098": ["adj.", "不可思議的；了不起的（英式拼法）"],
  "LI-LV3U22-V107": ["n.", "小號手"],
  "LI-LV3U22-V108": ["n.", "哈密瓜"],
  "LI-LV3U22-V112": ["adj.", "快速的"],
};

const measurements: ReadingTable = {
  "LI-LV3U22-G022": ["美制液量：品脫（pint）", "1 品脫約 473 毫升。"],
  "LI-LV3U22-G023": ["美制液量：夸脫（quart）", "1 夸脫等於 2 品脫，約 946 毫升。"],
  "LI-LV3U22-G024": ["美制液量：加侖（gallon）", "1 加侖等於 4 夸脫，約 3.785 公升。"],
};

export function applyU22Reading(item: LearningItem): LearningItem {
  return applyReviewedReading(item, vocabulary, measurements);
}
