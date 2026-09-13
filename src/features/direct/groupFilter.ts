import { learningItems } from './model';
import type { CustomGroup } from './model';
import type { WordRecord } from '../../db/types';

export type GroupKind='all'|'cards'|'curriculum'|'empty';
export type GroupOrder='recent'|'name';
export const groupSize=(g:CustomGroup)=>g.itemIds.length+(g.wordIds?.length??0);
function groupTerms(g:CustomGroup,words:Map<string,WordRecord>) {
  return [...(g.wordIds??[]).map(id=>words.get(id)).filter(w=>!!w).map(w=>`${w.word} ${w.meaningZh??''} ${w.level}`),...g.itemIds.map(id=>learningItems.find(i=>i.learningItemId===id)).filter(i=>!!i).map(i=>`${i.displayWord??i.pattern} ${i.targetMeaningZh??i.explanationZh} LV3`)];
}
export function groupPreview(g:CustomGroup,words:WordRecord[]) {
  const byId=new Map(words.map(w=>[w.wordId,w]));
  return [...(g.wordIds??[]).slice(0,3).map(id=>byId.get(id)?.word??'字卡待下載'),...g.itemIds.slice(0,3).map(id=>{const i=learningItems.find(i=>i.learningItemId===id);return i?.displayWord??i?.pattern??'教材項目';})].slice(0,3).join('、');
}
export function filterGroups(groups:CustomGroup[],words:WordRecord[],query:string,kind:GroupKind,order:GroupOrder) {
  const terms=query.normalize('NFKC').trim().toLowerCase().split(/\s+/).filter(Boolean),byId=new Map(words.map(w=>[w.wordId,w]));
  return groups.filter(g=>{
    if(kind==='cards'&&!g.wordIds?.length || kind==='curriculum'&&!g.itemIds.length || kind==='empty'&&groupSize(g)!==0)return false;
    const haystack=[g.name,...(terms.length?groupTerms(g,byId):[])].join(' ').normalize('NFKC').toLowerCase();
    return terms.every(t=>haystack.includes(t));
  }).sort((a,b)=>(order==='name'?a.name.localeCompare(b.name,'zh-TW',{numeric:true}):b.updatedAt-a.updatedAt)||a.id.localeCompare(b.id));
}
