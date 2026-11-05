import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const names=['write-boundary-python','write-boundary-vitest','public-checkpoint-regression','public-checkpoint-build','public-checkpoint-lint'];
const evidence={scope:'U01-U04 plus U02 sunrise follow-up',logs:{},fullSuite:'not_completed',
 sourceReferences:'source-art/LV1 references resolve through LV1_SOURCE_ART_ROOT; personal paths and private transfer identities are omitted from the public snapshot.',
 provenance:'A local recoverable copy retains original evidence. The first public checkpoint consolidates unshared audit commits to prevent private evidence in their ancestry from being published. Exact card changes, receipts, source hashes and the original fixed baseline are preserved.'};
for(const name of names){
 const rawPath=`output/unit-audit-20261105/${name}.log`,raw=readFileSync(rawPath);
 evidence.logs[name]={publicPath:`docs/unit-audit-20261105/validation/${name}.txt`,rawSha256:createHash('sha256').update(raw).digest('hex')};
 writeFileSync(evidence.logs[name].publicPath,raw.toString('utf8').replace(/\r\n/g,'\n').split('\n').map(l=>l.trimEnd()).join('\n').trimEnd()+'\n');
}
writeFileSync('docs/unit-audit-20261105/validation/public-checkpoint.json',JSON.stringify(evidence,null,2)+'\n');
