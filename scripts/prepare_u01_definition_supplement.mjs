import {readFileSync,writeFileSync} from 'node:fs';
const words=JSON.parse(readFileSync('public/data/v1/words.json','utf8'));
const pig=words.find(w=>w.word==='pig');
const after='(n.) a farm animal with a broad snout, short legs, and a curly tail; '+pig.meaningEn;
const patch={dataset:'words',key:'wordId',id:pig.wordId,before:{meaningEn:pig.meaningEn},after:{meaningEn:after},
 reason:'圖句、中文及既有例句皆使用動物 pig，但原英英解釋只有金屬錠與像豬般生活，漏掉核心動物義。補回已有中文的動物義，保留其他既有解釋，不改原句或圖片；整詞draft保留。',
 evidence:'https://www.merriam-webster.com/dictionary/pig'};
writeFileSync('docs/unit-audit-20261105/LV1-U01-definition-supplement.json',JSON.stringify({unit:'LV1-U01',
 baseCommit:'29cfc684d7a11b07f09988c478d30358830f1951',patches:[patch]},null,2)+'\n');
