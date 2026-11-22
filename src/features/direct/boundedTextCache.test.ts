import {expect,it} from 'vitest';
import {BoundedTextCache} from './boundedTextCache.testSupport';
it('bounds UTF-16 storage, refreshes LRU entries, and refuses oversized text',()=>{
 const cache=new BoundedTextCache(16,2);
 cache.set('a','甲乙丙');cache.set('b','xyz');expect(cache.get('a')).toBe('甲乙丙');
 cache.set('c','123');expect(cache.get('b')).toBeUndefined();expect(cache.get('a')).toBe('甲乙丙');
 cache.set('a','123456789');expect(cache.get('a')).toBeUndefined();expect(cache.get('c')).toBe('123');
});
it('enforces the entry limit independently of the byte budget',()=>{
 const cache=new BoundedTextCache(1024,1);cache.set('one','same');cache.set('two','same');
 expect(cache.get('one')).toBeUndefined();expect(cache.get('two')).toBe('same');
});
