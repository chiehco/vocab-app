import { expect, it } from 'vitest';
import words from '../../../public/data/v1/words.json';
import senses from '../../../public/data/v1/senses.json';
import examples from '../../../public/data/v1/examples.json';
import media from '../../../public/data/v1/media.json';
import pack from '../../../public/data/v1/sa-pack.json';
import images from '../vocabulary/lv1ReviewedImages.json';

it('preserves the house identity and old verb ID while adding the approved noun and forms',()=>{
 const word=words.find(row=>row.wordId==='W000415')!;
 expect(word.word).toBe('house');expect(word.verbForms).toEqual({base:'house',past:'housed',pastParticiple:'housed',sourceRef:'user:house-meanings-20261026',status:'approved'});
 expect(senses.filter(row=>row.wordId===word.wordId).map(row=>[row.senseId,row.sensePos,row.meaningZh,row.status])).toEqual([
  ['W000415-1','v.','容納，收藏','approved'],['W000415-2','n.','房屋，房子','approved']]);
 expect(word.meaningZh).toBe('房子；住宅；機構；議院');
});
it('keeps prior example identities and binds house examples and artwork to the correct POS',()=>{
 const rows=examples.filter(row=>row.word==='house');expect(rows).toHaveLength(6);
 expect(rows.find(row=>row.exampleId==='EX86fa1c6b')?.sentenceEn).toBe('My grandparents have lived in the same house for over forty years.');
 for(const row of rows){const sense=senses.find(s=>s.senseId===row.senseId);expect(sense?.word).toBe('house');expect(row.sensePos).toBe(sense?.sensePos);}
 for(const id of ['EXcf4d13ee','EX9f66f905'])expect(rows.find(row=>row.exampleId===id)).toMatchObject({sensePos:'v.',senseId:'W000415-1'});
 expect(media.find(row=>row.assetId==='SA20260830_W000415')?.senseId).toBe('W000415-1');
 expect(images.find(row=>row.id==='LV1-U06-06')?.illustration.senseId).toBe('W000415-2');
});
it('ships the same house records in the complete dictionary and starter',()=>{
 for(const [full,starter] of [[words,pack.words],[senses,pack.senses],[examples,pack.examples],[media,pack.media]]){
  const own=(row:unknown)=>{const r=row as {word?:string;targetWord?:string};return r.word==='house'||r.targetWord==='house'};
  expect(starter.filter(own)).toEqual(full.filter(own));
 }
});
