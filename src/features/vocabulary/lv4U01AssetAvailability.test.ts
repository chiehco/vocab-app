import {expect,it} from 'vitest';
import {existsSync,readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import cards from './lv4U01ApprovedCards.json';

// Shared art is selected by the approved binding, including assets named for another unit.
it.each(cards)('ships the exact image bound to $displayWord',card=>{
 const file='public/'+card.illustration.path;
 expect(existsSync(file),file).toBe(true);
 const bytes=readFileSync(file);
 expect(bytes.subarray(0,4).toString()).toBe('RIFF');
 expect(bytes.subarray(8,12).toString()).toBe('WEBP');
 expect(card.illustration.captionEn.trim()).not.toBe('');
 expect(card.illustration.captionZh.trim()).not.toBe('');
});

it('retains the original approved shared establishment image bytes',()=>{
 const shared=cards.filter(card=>['establish','establishment'].includes(card.displayWord));
 expect(shared).toHaveLength(2);
 expect(new Set(shared.map(card=>card.illustration.path)).size).toBe(1);
 const bytes=readFileSync('public/'+shared[0].illustration.path);
 expect(createHash('sha256').update(bytes).digest('hex')).toBe('7cc4ba4656936cc95d1a7bb6647d9f89da99ba8f129842efc96ef776b2f55f63');
});
