import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
const root='docs/unit-audit-20261105/validation/';mkdirSync(root,{recursive:true});
const rawEvidenceHashes=[];
for(const [from,to]of Object.entries({'tests.log':'initial-full-5s-timeouts.txt','tests-30s.log':'interrupted-full-30s.txt',
 'timeout-diagnostic.log':'single-timeout-diagnostic.txt','audit-regression.log':'first-audit-regression.txt',
 'u03-regression.log':'u03-regression.txt','u03-art-final-test.log':'u03-art-final-test.txt',
 'u03-final-lint.log':'u03-lint.txt','u03-final-build.log':'u03-build.txt'})){
 const path='output/unit-audit-20261105/'+from,raw=readFileSync(path);
 rawEvidenceHashes.push({rawPath:path,rawSha256:createHash('sha256').update(raw).digest('hex'),archivedPath:root+to});
 writeFileSync(root+to,raw.toString('utf8').replace(/\r\n/g,'\n').split('\n').map(line=>line.trimEnd()).join('\n').trimEnd()+'\n');
}
const cli=p=>JSON.parse(readFileSync(p,'utf8').split('### Result')[1].split('### Ran Playwright code')[0].trim());
const saved=cli('output/playwright/unit-audit/saved-content-verification-u03-full.txt');
const fullLoad=cli('output/playwright/unit-audit/full-content-load.txt');
writeFileSync(root+'saved-content-and-progress.json',JSON.stringify({savedContent:saved,isolatedFullLoad:fullLoad,
 rawEvidenceHashes,archivedLogFormatting:'line endings and trailing whitespace normalized; original raw log bytes retained at rawPath with recorded SHA256',
 fullSuite:'not_completed; initial default timeouts and later interrupted run retained',
 validation:{relatedRegression:'4 files / 17 tests passed',final18ImageRegistry:'2 tests passed (repeat of registry coverage)',lint:'passed',build:'passed; existing chunk-size warning'},
 commands:{lint:'npm run lint',build:'npm run build',regression:'npm test -- src/features/vocabulary/auditedWordIllustrations.test.ts src/features/vocabulary/lv1ReviewedImages.test.ts src/features/vocabulary/liveabcIntegration.test.ts src/db/recoveredUnitUpdate.test.ts --maxWorkers=1 --testTimeout=30000'},
 publication:{push:false,deploy:false},screenshots:'output/playwright/unit-audit; exact per-card links in ledgers'},null,2)+'\n');
