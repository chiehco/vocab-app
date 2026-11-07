import { expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { SenseRecord, WordRecord } from '../../db/types';
import RecordedMeanings from './RecordedMeanings';
import { linkedSenseLabel, recordedMeanings, trustedVerbForms } from './meaningRecords';

const word = {wordId:'W999101',word:'zztest',pos:'n./v.',posAll:['n.','v.'],meaningZh:'原始摘要；未拆分內容',status:'reviewed'} as WordRecord;
const sense = (id:number,pos='n.',overrides:Partial<SenseRecord>={}) => ({senseId:`W999101-${id}`,wordId:word.wordId,word:word.word,senseOrder:id,sensePos:pos,meaningZh:`字義${id}`,status:'reviewed',answerForms:[],isExamSense:false,examEvidence:null,note:null,...overrides} as SenseRecord);
const render = (senses:SenseRecord[],record=word) => renderToStaticMarkup(<RecordedMeanings word={record} senses={senses}/>);

const wageForms = {base:'wage',past:'waged',pastParticiple:'waged',sourceRef:'https://www.collinsdictionary.com/dictionary/english/wage',status:'approved'};
const wage = {...word,wordId:'W002976',word:'wage(s)',wordVariants:['wage','wages'],status:'draft',verbForms:wageForms};

it('renders only the audited wage forms under the retained wage(s) display',()=>{
 expect(trustedVerbForms(wage)).toBe(wageForms);
 const html=render([],wage);
 expect(html).toContain('wage');expect(html).toContain('waged');
 expect(html).not.toContain('動詞三態尚未收錄');
});
it.each<[string,Partial<WordRecord>]>([
 ['wrong ID',{wordId:'W999101'}],
 ['wrong display',{word:'wages'}],
 ['case-changed display',{word:'Wage(s)'}],
 ['missing variants',{wordVariants:undefined}],
 ['missing plural',{wordVariants:['wage']}],
 ['wrong variants',{wordVariants:['wage','fake']}],
 ['duplicate variants',{wordVariants:['wage','wage']}],
 ['extra variant',{wordVariants:['wage','wages','fake']}],
 ['reordered variants',{wordVariants:['wages','wage']}],
 ['private word',{distributionScope:'private_only'}],
 ['restricted word',{distributionScope:'restricted'}],
 ['inactive word',{active:false}],
 ['rejected word',{status:'rejected'}],
 ['unknown word status',{status:'unknown'}],
])('rejects wage records with %s',(label,overrides)=>{
 expect(trustedVerbForms({...wage,...overrides})).toBeUndefined();
});
it.each<[string,Partial<NonNullable<WordRecord['verbForms']>>]>([
 ['display base',{base:'wage(s)'}],
 ['plural base',{base:'wages'}],
 ['case-changed base',{base:'Wage'}],
 ['wrong past',{past:'wages'}],
 ['wrong participle',{pastParticiple:'waging'}],
 ['empty past',{past:''}],
 ['fake source',{sourceRef:'https://example.com/wage'}],
 ['lookalike source',{sourceRef:'https://www.collinsdictionary.com.evil.test/dictionary/english/wage'}],
 ['wrong entry',{sourceRef:'https://www.collinsdictionary.com/dictionary/english/wages'}],
 ['unverified conjugation source',{sourceRef:'https://www.collinsdictionary.com/conjugation/english/wage'}],
 ['empty source',{sourceRef:' '}],
 ['draft verification',{status:'draft'}],
 ['reviewed but not approved',{status:'reviewed'}],
 ['unknown verification',{status:'verified'}],
])('rejects wage forms with %s',(label,overrides)=>{
 expect(trustedVerbForms({...wage,verbForms:{...wageForms,...overrides}})).toBeUndefined();
});
it('does not let malformed special identities fall back to matching display/base',()=>{
 for(const record of [
  {...wage,verbForms:{...wageForms,base:'wage(s)',sourceRef:'fake'}},
  {...wage,wordId:'OTHER',verbForms:{...wageForms,base:'wage(s)'}},
  {...wage,word:'wage'},
  {...wage,wordId:'OTHER',word:'WAGE(S)',verbForms:{...wageForms,base:'WAGE(S)'}},
 ]) expect(trustedVerbForms(record)).toBeUndefined();
});
it('keeps ordinary base matching and never trusts arbitrary word variants',()=>{
 const forms={base:'ZZTEST',past:'zztested',pastParticiple:'zztested',sourceRef:'synthetic:verified',status:'reviewed'};
 expect(trustedVerbForms({...word,verbForms:forms})).toBe(forms);
 expect(trustedVerbForms({...word,wordVariants:['wage','wages'],verbForms:wageForms})).toBeUndefined();
 for(const overrides of [{active:false},{distributionScope:'private_only'},{status:'rejected'}])
  expect(trustedVerbForms({...word,...overrides,verbForms:forms})).toBeUndefined();
});

it('shows all recorded senses across POS without exam/default selection or source mutation',()=>{
 const rows=[sense(1,'v.',{isExamSense:true}),sense(2)];const before=JSON.stringify(rows);
 const html=render(rows);expect(html).toContain('字義1');expect(html).toContain('字義2');
 expect(recordedMeanings(word,rows).map(r=>r.key)).toEqual(['W999101-2','W999101-1']);expect(JSON.stringify(rows)).toBe(before);
 expect(html).toContain('原始摘要；未拆分內容');expect(html).toContain('字義 · n. v.');
 expect(html).not.toContain('其他義項可能尚未整理');expect(html).not.toContain('尚未逐義整理');
});
it('keeps the whole unsplit summary for zero senses and does not hide a single sense',()=>{
 expect(render([])).toContain('原始摘要；未拆分內容');expect(render([sense(1)])).toContain('字義1');
 expect(render([],{...word,meaningZh:null})).toContain('字義尚未收錄');
});
it.each(['rejected','disabled','retired','unknown'])('does not expose %s rows or resurrect them as a summary',status=>{
 expect(render([sense(1,'n.',{status:status as SenseRecord['status'],meaningZh:word.meaningZh!})])).not.toContain(word.meaningZh!);
});
it('rejects private, inactive and other-word senses, and marks pending public rows',()=>{
 const rows=[sense(1,'n.',{distributionScope:'private_only'}),sense(2,'n.',{active:false}),sense(3,'n.',{wordId:'OTHER'}),sense(4,'v.',{status:'needs_check'}),sense(5,'n.',{distributionScope:'restricted'})];
 expect(recordedMeanings(word,rows).map(r=>r.key)).toEqual(['W999101-4']);expect(render(rows)).toContain('待核對');
});
it('does not resurrect a rejected meaning after Chinese display normalization',()=>{
 const record={...word,meaningZh:'裏面'};
 expect(render([sense(1,'n.',{status:'rejected' as SenseRecord['status'],meaningZh:'裏面'})],record)).not.toContain('裡面');
});
it.each([['zztest','zztested','zztested'],['zzgo','zzwent','zzgone']])('shows verified regular/irregular forms for %s', (base,past,pastParticiple)=>{
 const record={...word,word:base,verbForms:{base,past,pastParticiple,sourceRef:'synthetic:verified',status:'approved'}};
 const html=render([],record);for(const value of [base,past,pastParticiple])expect(html).toContain(value);expect(html).toContain('過去分詞');
});
it('never guesses forms from an exam answer or an unreviewed/partial record',()=>{
 expect(render([sense(1,'v.',{answerForms:['zztested']})])).toContain('動詞三態尚未收錄');
 expect(trustedVerbForms({...word,verbForms:{base:word.word,past:'x',pastParticiple:'',sourceRef:'x',status:'approved'}})).toBeUndefined();
 expect(trustedVerbForms({...word,verbForms:{base:word.word,past:'x',pastParticiple:'x',sourceRef:'x',status:'draft'}})).toBeUndefined();
});
it('only labels an exact public sense belonging to this word',()=>{
 const rows=[sense(1)];expect(linkedSenseLabel(word,rows,rows[0].senseId)).toBe('n. 字義1');expect(linkedSenseLabel(word,rows,'missing')).toBeUndefined();
 expect(linkedSenseLabel(word,[sense(1,'n.',{active:false})],rows[0].senseId)).toBeUndefined();
});
