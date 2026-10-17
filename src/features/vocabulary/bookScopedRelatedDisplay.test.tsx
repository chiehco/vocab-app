import 'fake-indexeddb/auto';
import { expect, it } from 'vitest';
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import VocabularyScreen from './VocabularyScreen';

function card(item: string, unit: number) {
 const html=renderToString(<MemoryRouter initialEntries={[`/vocabulary?level=LV6&unit=${unit}&item=${item}`]}><VocabularyScreen/></MemoryRouter>);
 const result=html.match(/<article[\s\S]*?<\/article>/)?.[0];
 expect(result).toBeDefined();
 return result!;
}

it('shows the checked book meaning with the original supplement marker',()=>{
 const feast=card('LI-LV6U01-V073',1);
 expect(feast).toContain('盛宴（私人的小型宴會）');
 expect(feast).toContain('教材收錄義');
 expect(feast).toContain('書上標記：比');
 expect(feast).not.toContain('既有一般字義');
 const household=card('LI-LV6U02-V098',2);
 expect(household).toContain('adj.');
 expect(household).toContain('家喻戶曉的');
 expect(household).toContain('書上標記：*');
 expect(household).not.toContain('既有一般字義');
});
