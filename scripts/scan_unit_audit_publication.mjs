import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
const committed=execFileSync('git',['diff','--name-only','29cfc684d7a11b07f09988c478d30358830f1951','HEAD'],{encoding:'utf8'}).trim().split('\n');
const pending=execFileSync('git',['status','--porcelain','-uall'],{encoding:'utf8'}).split('\n').filter(Boolean).map(l=>l.slice(3));
const candidates=[...new Set([...committed,...pending])].filter(p=>!p.startsWith('output/')&&!p.startsWith('.')&&!p.includes('__pycache__')&&!p.endsWith('.webp')&&!p.endsWith('.png')&&p!== 'scripts/scan_unit_audit_publication.mjs');
const rules={privatePath:/(?:[A-Z]:[\\/]+Users[\\/]+|\/home\/oai\/|\/mnt\/data\/)/g,libraryIdentity:/(?:libfile_[a-z0-9]+|file_[0-9a-f]{24,})/g,internalCollaboration:/(?:source_thread_id|codex_delegation|plugin:\/\/|sourceThreadId)/g};
const findings=[];
for(const p of candidates){let s;try{s=readFileSync(p,'utf8')}catch{continue}for(const [rule,re]of Object.entries(rules)){const matches=[...s.matchAll(re)];if(matches.length)findings.push({path:p,rule,count:matches.length});}}
console.log(JSON.stringify({filesScanned:candidates.length,findings},null,2));
if(findings.length)process.exitCode=1;
