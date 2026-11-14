import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync} from 'node:fs';

const definitions=[
  ['words','words.json','wordId'],['senses','senses.json','senseId'],
  ['examples','examples.json','exampleId'],['relations','relations.json','relationId'],
  ['morphemes','morphemes.json','rowId'],['notes','notes.json','noteId'],
  ['examPriorities','exam_priority.json','wordId'],['media','media.json','assetId'],
];
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
function inspect(rows,key){
  if(!Array.isArray(rows))throw new Error(`Expected an array for ${key}`);
  const seen=new Set(),duplicates=new Set(),invalid=[];
  rows.forEach((row,index)=>{
    const value=row[key];
    if(typeof value!=='string'||!value.length)invalid.push(index);
    if(seen.has(value))duplicates.add(value);
    seen.add(value);
  });
  return {rows:rows.length,uniqueKeys:seen.size,duplicateKeys:[...duplicates],invalidKeyRowIndexes:invalid};
}
const starterBytes=readFileSync('public/data/v1/sa-pack.json');
const starter=JSON.parse(starterBytes);
const result={checkedAt:new Date().toISOString(),scope:'Current full JSON files and local starter payload; this is primary-key structure validation, not a semantic audit.',starterSha256:hash(starterBytes),full:{},starter:{}};
for(const [table,file,key] of definitions){
  const bytes=readFileSync(`public/data/v1/${file}`);
  result.full[table]={file:`public/data/v1/${file}`,key,sha256:hash(bytes),...inspect(JSON.parse(bytes),key)};
  result.starter[table]={key,...inspect(starter[table],key)};
}
const failures=[...Object.values(result.full),...Object.values(result.starter)].filter(r=>r.duplicateKeys.length||r.invalidKeyRowIndexes.length);
result.failures=failures.length;
const output=process.argv[2];
if(output)writeFileSync(output,JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({starterSha256:result.starterSha256,full:Object.fromEntries(Object.entries(result.full).map(([k,v])=>[k,v.rows])),starter:Object.fromEntries(Object.entries(result.starter).map(([k,v])=>[k,v.rows])),failures:result.failures}));
if(failures.length)process.exitCode=1;
