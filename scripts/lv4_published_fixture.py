"""Exact content-only successor projection for immutable older-release fixtures."""
import copy,hashlib,json
from pathlib import Path
MANIFEST='docs/lv4-releases-20261122/U01.json'
PIN='b3e64bec21ee412d7ccaa468b5036a548bfc8ac9b562781b4a59335a6bc79818'
LAYERS=[('docs/lv4-releases-20261122/U02-assure.json','9454367917fc875b4ed6d32113d052c92c38a7763831c1ac1d080a7752990df5'),('docs/lv4-releases-20261122/U02.json','e3715fdbdf76b2d165327797bc2549ae00d8cfc9c902eaa3bda351ec3aaee292'),(MANIFEST,PIN)]
def encoded(value,indent=None):
 return json.dumps(value,ensure_ascii=False,indent=indent,separators=(',',':') if indent is None else None).encode()
def project(root,path,raw):
 authenticated=[]
 for name,pin in LAYERS:
  file=Path(root)/name
  if not file.exists():continue
  manifest=json.loads(file.read_text(encoding='utf-8-sig'))
  if hashlib.sha256(encoded(manifest)).hexdigest()!=pin:raise ValueError('LV4 manifest drift')
  authenticated.append((name,pin,manifest['files'].get(path)))
 for index,(name,pin,_) in enumerate(authenticated):
  earlier=[spec[key]for _,_,spec in authenticated[index+1:]if spec for key in ['beforeHash','afterHash']]
  raw=project_layer(root,path,raw,name,pin,earlier)
 return raw

def project_layer(root,path,raw,manifest_name,pin,earlier_hashes=()):
 file=Path(root)/manifest_name
 if not file.exists():return raw
 manifest=json.loads(file.read_text(encoding='utf-8-sig'))
 if hashlib.sha256(encoded(manifest)).hexdigest()!=pin:raise ValueError('LV4 manifest drift')
 spec=manifest['files'].get(path)
 if not spec:return raw
 raw=raw.replace(b'\r\n',b'\n');digest=hashlib.sha256(raw).hexdigest()
 if digest==spec['beforeHash']or digest in earlier_hashes:return raw
 if digest!=spec['afterHash']:raise ValueError('LV4 U01 complete file drift: '+path)
 value=json.loads(raw)
 def find(x,selector):
  if isinstance(x,list):return [r for v in x for r in find(v,selector)]
  if isinstance(x,dict):return ([x] if all(x.get(k)==v for k,v in selector.items()) else [])+[r for v in x.values() for r in find(v,selector)]
  return []
 for op in reversed(spec['operations']):
  rows=find(value[op['dataset']] if 'dataset'in op else value,op['selector'])
  if len(rows)!=1 or rows[0].get(op['field'])!=op['after']:raise ValueError('LV4 U01 field identity drift')
  if op.get('beforePresent',True):rows[0][op['field']]=copy.deepcopy(op['before'])
  else:del rows[0][op['field']]
 if 'beforeMeta'in spec:
  if path.endswith('sa-pack.json'):value['meta']=spec['beforeMeta']
  else:value=spec['beforeMeta']
 result=encoded(value,spec['indent'])+b'\n'
 if hashlib.sha256(result).hexdigest()!=spec['beforeHash']:raise ValueError('LV4 U01 restored file drift')
 return result
