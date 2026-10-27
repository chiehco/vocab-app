import { expect, it } from 'vitest';
import type { WordRecord, SenseRecord } from '../../db/types';
import type { PracticeQuestion } from './model';
import { optionExplanation } from './optionExplanation';
import { approvedCurriculumCards } from '../vocabulary/approvedCurriculum';
const word = (text:string,meaningZh:string,pos='n.') => ({wordId:`QA-${text}`,word:text,wordVariants:[text],meaningZh,pos,posAll:[pos],status:'reviewed'} as WordRecord);
const options = ['sway','nowadays','dense','ferry'].map((text,i)=>({id:'ABCD'[i],text,rationaleZh:'此處應使用 ferry。'}));
const question: PracticeQuestion = {questionId:'CHOICE-CLOZE-ORIG-LV4U20-ferry',sourceType:'original_target_word_choice',targetWord:'ferry',targetMeaningZh:'渡輪',stem:'The _____ carries the travelers across the river.',sentenceEn:'The ferry carries the travelers across the river.',sentenceZh:'渡輪載旅客過河。',options,answer:'D'};
const words=[word('sway','搖擺；影響力；支配；搖動','n./v.'),word('nowadays','現在；現時；當今','adv.'),word('dense','密集的；濃厚的','adj.'),word('ferry','渡船；輪渡','n./v.')];
it('replaces repeated answer-only explanations with each actual option meaning and grounded contrast',()=>{
 const result=options.map(o=>optionExplanation(question,o,words,[]));
 expect(result.every(r=>r.source==='authored-context')).toBe(true);
 expect(new Set(result.map(r=>r.rationale)).size).toBe(4);
 expect(result[0].meaning).toContain('影響力');expect(result[1].meaning).toContain('當今');expect(result[2].meaning).toContain('濃厚的');
 expect(result[3].rationale).toContain('符合句意');expect(result[0].rationale).toContain('不能表示這種交通工具');
});
it('matches text after shuffling and changing option letters without changing correctness',()=>{
 const shuffled=[options[3],options[1],options[0],options[2]].map((o,i)=>({...o,id:'ABCD'[i]}));
 const q={...question,options:shuffled,answer:'A'};
 expect(optionExplanation(q,shuffled[0],words,[]).rationale).toContain('符合句意');
 expect(optionExplanation(q,shuffled[2],words,[]).meaning).toContain('搖擺');
});
it('keeps all public polysemous meanings and does not choose the first sense as the option meaning',()=>{
 const w=word('sway','搖擺；影響力；支配；搖動','n./v.');
 const senses=[{senseId:'QA-sway-1',wordId:w.wordId,word:w.word,senseOrder:1,sensePos:'v.',meaningZh:'搖動',status:'reviewed'},{senseId:'QA-sway-2',wordId:w.wordId,word:w.word,senseOrder:2,sensePos:'n.',meaningZh:'影響力',status:'approved'}] as SenseRecord[];
 const result=optionExplanation(question,options[0],[w],senses);
 expect(result.meaning).toContain('v. 搖動');expect(result.meaning).toContain('n. 影響力');expect(result.meaning).toContain('支配');
});
it('does not invent missing glosses or inherit a rationale for a different sentence or unknown option',()=>{
 const q={...question,sentenceEn:'A different context.',options:[...options,{id:'E',text:'zzunknown',rationaleZh:'此處應使用 ferry。'}]};
 const result=optionExplanation(q,q.options[4],[],[]);
 expect(result.meaning).toBe('字義尚未收錄');expect(result.rationale).toContain('尚無逐項語境解析');expect(result.source).toBe('question-context');
 expect(optionExplanation(q,options[0],words,[]).source).toBe('question-context');
});
it('uses an existing approved catalog/catalogue identity link without guessing other spelling changes',()=>{
 const approval=approvedCurriculumCards('catalog')[0];expect(approval).toBeDefined();
 const record={...word('catalogue','合成目錄義'),wordId:approval.officialWordId};
 const option={id:'X',text:'catalog',rationaleZh:'此處應使用 ferry。'};
 expect(optionExplanation(question,option,[record],[]).meaning).toContain('合成目錄義');
 expect(optionExplanation(question,{...option,text:'zzcatalog'},[record],[]).meaning).toBe('字義尚未收錄');
});
