import { progressDb } from '../../db/progressDb';
import type { WordRecord, ExamPriorityRecord } from '../../db/types';
import { sortExamWordsByPriority } from '../../quiz/examScope';
import { learningItems } from '../direct/model';
import type { CustomGroup } from '../direct/model';

export function workspaceWords(words:WordRecord[],group:CustomGroup|undefined,level:string,query:string) {
  const ids=group ? new Set([...(group.wordIds??[]),...group.itemIds.flatMap(id=>{const item=learningItems.find(i=>i.learningItemId===id);return item?.officialWordId?[item.officialWordId]:[];})]) : undefined;
  const terms=query.trim().normalize('NFKC').toLowerCase().split(/\s+/).filter(Boolean);
  const ordered=ids ? [...ids].flatMap(id=>{const word=words.find(w=>w.wordId===id);return word?[word]:[];}) : words;
  return ordered.filter(w=>(level==='all'||w.level===level)&&terms.every(t=>`${w.word} ${w.meaningZh??''}`.normalize('NFKC').toLowerCase().includes(t)));
}
export interface WordList extends CustomGroup {returnTo:string}
// "Exam first" is an ordering choice in the workspace, not an S+A-only scope.
export function sortWorkspaceWords(words: WordRecord[], priorities: ExamPriorityRecord[]): WordRecord[] {
  const first = sortExamWordsByPriority(words, priorities);
  const firstIds = new Set(first.map(w => w.wordId));
  return [...first, ...words.filter(w => !firstIds.has(w.wordId)).sort((a,b) => a.word.localeCompare(b.word,'en'))];
}
export async function saveWordList(words:WordRecord[],name:string,returnTo:string) {
  if(!words.length||!/^\/(?:modes\/words(?:\?|$)|textbook\/LV[1-6]\/\d+$)/.test(returnTo))throw Error('沒有可用的字卡');
  const list:WordList={id:crypto.randomUUID(),name,wordIds:words.map(w=>w.wordId),itemIds:[],templateId:null,templateRevision:null,updatedAt:Date.now(),returnTo};
  await progressDb.settings.put({key:`word-list:${list.id}`,value:list});
  return list;
}
export async function readWordList(id:string):Promise<WordList|undefined> {
  const value=(await progressDb.settings.get(`word-list:${id}`))?.value as WordList|undefined;
  if(!value||value.id!==id||!Array.isArray(value.wordIds)||!value.wordIds.every(id=>typeof id==='string')||typeof value.name!=='string'||typeof value.returnTo!=='string'||!/^\/(?:modes\/words(?:\?|$)|textbook\/LV[1-6]\/\d+$)/.test(value.returnTo))return undefined;
  return value;
}
