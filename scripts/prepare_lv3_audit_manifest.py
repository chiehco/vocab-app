"""Prepare reviewed LV3 proposals as a pending, unregistered candidate.

Read-only with respect to repository inputs, manifests and chain. The optional
CLI writes a NEW output directory only. This module never seals or applies.
"""
from __future__ import annotations
import argparse
import copy
import json
from pathlib import Path
import re
import lv3_audit_pipeline as p

FIELDS = {'dataset','path','key','id','field','beforePresent','beforeValue','afterValue','reason','sources','originFindingIds'}


def public_sources(value):
    if isinstance(value, str):
        p.require(not re.search(r'file:|(?:^|[^A-Za-z])[A-Za-z]:[/\\]|^/(?:Users|home)/', value, re.I),
                  'Local/private source path must be replaced by a public-safe source record')
    elif isinstance(value, dict):
        for child in value.values():
            public_sources(child)
    elif isinstance(value, list):
        for child in value:
            public_sources(child)


def compile_candidate(root, unit, accepted, capture):
    root = Path(root).resolve()
    p.assert_recovery_clear(root)
    paths = p.v1.input_paths(root)
    p.require(isinstance(capture, dict) and set(capture) == paths,
              'Independent capture must match exact pipeline input domain, not a broader map')
    initial = {path: p.safe_path(root, path).read_bytes() for path in paths}
    for path, digest in capture.items():
        p.require(p.byte_hash(initial[path]) == digest, 'Independent capture drift: ' + path)
    _, anchor, chain = p.load_chain(root)
    p.require(all(e['status'] == 'committed' for e, _, _ in chain), 'Unfinished predecessor candidate exists')
    parent_entry, parent, _ = chain[-1]
    p.verify_checkpoint(root, parent, anchor)
    ledger = p.read_json(root / p.DOCS / 'LV3-ledger.json')
    catalog = {'LV3-U' + str(x['unit']).zfill(2): x['source'] for x in ledger['units']}
    p.require(unit in catalog and unit not in {e.get('unit') for e, _, _ in chain}, 'Unknown or duplicate unit')
    p.require(accepted.get('unit', '').replace(' ', '-') == unit, 'Accepted unit mismatch')
    p.require(not any(accepted.get(k) for k in ('conflicts','noops','sourceGaps')), 'Unresolved proposal findings')
    p.validate_curriculum_identity(unit, catalog[unit], p.read_json(p.safe_path(root, catalog[unit])))
    proposals = accepted.get('proposals')
    p.require(isinstance(proposals, list) and proposals, 'No accepted fields')
    contracts = {
        'words': {'path':'public/data/v1/words.json','key':'wordId','rowsField':None},
        'examples': {'path':'public/data/v1/examples.json','key':'exampleId','rowsField':None},
        'notes': {'path':'public/data/v1/notes.json','key':'noteId','rowsField':None},
        'curriculum': {'path':catalog[unit],'key':'learningItemId','rowsField':'learningItems'},
        'grammarQuestions': {'path':catalog[unit],'key':'questionId','rowsField':'grammarQuestions'},
    }
    if unit == 'LV3-U16':
        contracts['senses'] = {'path':'public/data/v1/senses.json','key':'senseId','rowsField':None}
    documents, collections, patches, seen = {}, {}, {}, set()
    before_rows = accepted.get('beforeRows', {})
    for item in proposals:
        p.require(set(item) in (FIELDS, FIELDS | {'beforeRow'}), 'Unknown/missing proposal fields')
        name = item['dataset']
        p.require(name in contracts, 'Unsupported proposal dataset')
        col = contracts[name]
        p.require(item['path'] == col['path'] and item['key'] == col['key'], 'Proposal collection mismatch')
        p.require(isinstance(item['id'], str) and isinstance(item['field'], str), 'Invalid field identity')
        field = re.sub(r'^options\[id=([A-D])\]', r'options[\1]', item['field'])
        identity = (name, item['id'], field)
        p.require(identity not in seen, 'Duplicate/conflicting accepted field')
        prior = {f for n, rid, f in seen if (n, rid) == (name, item['id'])}
        p.require(not ((field == 'options' and any(f.startswith('options[') for f in prior))
                      or (field.startswith('options[') and 'options' in prior)),
                  'Overlapping aggregate and granular options fields')
        seen.add(identity)
        if col['path'] not in documents:
            documents[col['path']] = p.read_json(root / col['path'])
        collections[name] = copy.deepcopy(col)
        matches = [r for r in p.v1.rows(documents[col['path']], col['rowsField'])
                   if r.get(col['key']) == item['id']]
        p.require(len(matches) == 1, 'Nonunique proposal row')
        row = matches[0]
        full_before = item.get('beforeRow', before_rows.get(name, {}).get(item['id']))
        p.require(isinstance(full_before, dict) and full_before == row, 'Complete accepted before row mismatch')
        option = re.fullmatch(r'options\[([A-D])\]\.(text|rationaleZh)', field)
        owner, key = row, field
        if option:
            p.require(name == 'grammarQuestions', 'Options only allowed for grammar questions')
            found = [o for o in row.get('options', []) if o.get('id') == option[1]]
            p.require(len(found) == 1, 'Nonunique option')
            owner, key = found[0], option[2]
        present = key in owner
        p.require(isinstance(item['beforePresent'], bool) and present == item['beforePresent'],
                  'Before presence mismatch')
        p.require((owner[key] if present else None) == item['beforeValue'], 'Before field value mismatch')
        p.require(not present or owner[key] != item['afterValue'], 'No-op accepted field')
        p.require(isinstance(item['reason'], str) and item['reason'].strip(), 'Missing field reason')
        p.require(isinstance(item['sources'], list) and item['sources']
                  and all((isinstance(x, str) and x.strip()) or (isinstance(x, dict) and x)
                          for x in item['sources']), 'Missing field sources')
        if field not in {'verbForms', 'posAll', 'options'}:
            p.require(isinstance(item['afterValue'], str) and item['afterValue'].strip(), 'Invalid scalar proposal')
        elif field == 'posAll':
            p.require(isinstance(item['afterValue'], list) and item['afterValue']
                      and all(isinstance(x,str) and x.strip() for x in item['afterValue']), 'Invalid POS list')
        p.require(isinstance(item['originFindingIds'], list) and item['originFindingIds']
                  and all(isinstance(x,str) and x.strip() for x in item['originFindingIds']), 'Missing finding origins')
        public_sources(item['sources'])
        patch_key = (name, item['id'])
        if patch_key not in patches:
            patches[patch_key] = {'dataset':name,'path':col['path'],'key':col['key'],'id':item['id'],
                                  'before':copy.deepcopy(row),'after':{},'reason':'','evidence':[],'fieldEvidence':{}}
        patch = patches[patch_key]
        if option:
            patch['after'].setdefault('options', copy.deepcopy(row['options']))
            next(o for o in patch['after']['options'] if o['id'] == option[1])[key] = copy.deepcopy(item['afterValue'])
        else:
            patch['after'][field] = copy.deepcopy(item['afterValue'])
        patch['reason'] += (' ' if patch['reason'] else '') + item['reason']
        patch['fieldEvidence'][field] = [{'proposal':','.join(item['originFindingIds']),
            'originFindingIds':copy.deepcopy(item['originFindingIds']), 'reason':item['reason'],
            'sources':copy.deepcopy(item['sources']), 'beforePresent':present}]
        for source in item['sources']:
            url = source if isinstance(source,str) and source.startswith('https://') else source.get('url') if isinstance(source,dict) else None
            if url and url not in patch['evidence']:
                patch['evidence'].append(url)
    patch_list = list(patches.values())
    scope = {'schemaVersion':1,'unit':unit,'baseline':p.v1.BASELINE,'collections':collections,
             'rows':[{'dataset':x['dataset'],'id':x['id'],'beforeHash':p.sha(x['before']),
                      'after':copy.deepcopy(x['after'])} for x in patch_list]}
    staged = copy.deepcopy(documents)
    for patch in patch_list:
        col = collections[patch['dataset']]
        row = next(r for r in p.v1.rows(staged[col['path']], col['rowsField']) if r[col['key']] == patch['id'])
        row.update(copy.deepcopy(patch['after']))
    guards, fixtures = {}, {}
    for path, before in documents.items():
        guard = {'beforeHash':p.sha(before),'afterHash':p.sha(staged[path]),
                 'beforeByteHash':capture[path],'afterByteHash':p.byte_hash(p.serialize(staged[path]))}
        if p.byte_hash(p.serialize(before)) != capture[path]:
            ref = p.DOCS + '/fixtures/' + unit + '/' + capture[path] + '.json'
            guard['beforeFixture'] = ref
            fixtures[ref] = initial[path]
        guards[path] = guard
    manifest = {'schemaVersion':2,'unit':unit,'baseline':p.v1.BASELINE,
                'parentManifestHash':parent_entry['manifestHash'],'readiness':'pending_independent_before_capture',
                'scope':unit.replace('LV3-','')+'-scope.json','scopeHash':p.sha(scope),
                'collections':collections,'files':guards,'patches':patch_list,
                'unchangedInputs':{path:capture[path] for path in sorted(paths-set(guards)-p.DERIVED)},
                'derivedBefore':{path:capture[path] for path in sorted(p.DERIVED)},
                'beforeMeta':p.read_json(root / p.v1.DERIVED[0]),
                'beforePackMeta':p.read_json(root / p.v1.DERIVED[1])['meta'],
                'derivedAfter':None,'afterMeta':None}
    p.validate_manifest(manifest,scope)
    p.prepare_step(manifest,documents,scope)
    _, _, current_chain = p.load_chain(root)
    p.require([e for e, _, _ in current_chain] == [e for e, _, _ in chain], 'Concurrent parent chain change')
    p.require(p.v1.input_paths(root)==paths,'Concurrent input domain change')
    for path, content in initial.items():
        p.require(p.safe_path(root,path).read_bytes()==content,'Concurrent input change: '+path)
    p.assert_recovery_clear(root)
    summary = {'unit':unit,'fieldCount':len(seen),'rowCount':len(patch_list),'inputCount':len(paths),
               'captureMapHash':p.sha(capture),'acceptedProposalsHash':p.sha(accepted),'parentManifestHash':parent_entry['manifestHash'],
               'candidateManifestHash':p.sha(manifest),'status':'pending_only_not_registered_sealed_or_applied',
               'beforeFixtureCount':len(fixtures)}
    return manifest, scope, fixtures, summary


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root',type=Path,default=Path(__file__).resolve().parents[1])
    parser.add_argument('--unit',required=True)
    parser.add_argument('--accepted',type=Path,required=True)
    parser.add_argument('--capture',type=Path,required=True)
    parser.add_argument('--output',type=Path,required=True)
    args=parser.parse_args()
    root=args.root.resolve()
    output=(root/args.output).resolve()
    p.require(output.is_relative_to(root/'output') and not output.exists(),'Use a new repository output directory')
    relative=output.relative_to(root).as_posix()
    p.safe_path(root,relative)
    accepted_bytes,capture_bytes=args.accepted.read_bytes(),args.capture.read_bytes()
    accepted,capture=p.read_json(args.accepted),p.read_json(args.capture)
    p.require(args.accepted.read_bytes()==accepted_bytes and args.capture.read_bytes()==capture_bytes,
              'Concurrent proposal/capture artifact change')
    m,s,fixtures,summary=compile_candidate(root,args.unit,accepted,capture)
    p.require(args.accepted.read_bytes()==accepted_bytes and args.capture.read_bytes()==capture_bytes,
              'Concurrent proposal/capture artifact change')
    summary['acceptedFileSha256']=p.hashlib.sha256(accepted_bytes).hexdigest()
    summary['captureFileSha256']=p.hashlib.sha256(capture_bytes).hexdigest()
    p.safe_path(root,relative)
    p.require(not output.exists(), 'Output directory appeared during preparation')
    output.mkdir(parents=True,exist_ok=False)
    p.v1.dump(output/(args.unit.replace('LV3-','')+'-patches.json'),m)
    p.v1.dump(output/m['scope'],s)
    for path,content in fixtures.items():
        target=p.safe_path(output,path[len(p.DOCS)+1:])
        target.parent.mkdir(parents=True,exist_ok=True)
        target.write_bytes(content)
    p.v1.dump(output/'summary.json',summary)
    print(json.dumps(summary,ensure_ascii=False))


if __name__=='__main__':
    main()
