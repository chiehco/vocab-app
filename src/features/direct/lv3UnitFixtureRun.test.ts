import assert from 'node:assert/strict';
import {it} from 'vitest';
import {unitFixtureOutputDirectory} from './lv3UnitFixtureRun.testSupport';

for(const unit of ['U01','U03','U15','U16','U99'])it('preserves original default for '+unit,()=>{
 assert.equal(unitFixtureOutputDirectory(unit),`output/lv3-audit-20261107/${unit.toLowerCase()}-validation/`);
});
it('selects only the exact new U16 evidence directory',()=>{
 const result=unitFixtureOutputDirectory('U16','u16-test05-retest-v1');
 assert.equal(result,'output/lv3-audit-20261107/u16-validation-test05-retest-v1/');
 assert.notEqual(result,unitFixtureOutputDirectory('U16'));
});
for(const run of ['',null,false,0,'undefined','u16-test05-retest-v2','U16-test05-retest-v1',' u16-test05-retest-v1','u16-test05-retest-v1 ','../u16-validation','/tmp/evidence','C:/evidence','https://example.test','output/lv3-audit-20261107/u16-validation/','u16-test05-retest-v1/','u16-test05-retest-v1\\..'])it('rejects unknown or path-like run '+JSON.stringify(run),()=>{
 assert.throws(()=>unitFixtureOutputDirectory('U16',run));
});
for(const unit of ['U01','U15','U17','U99'])it('rejects U16 version for '+unit,()=>{
 assert.throws(()=>unitFixtureOutputDirectory(unit,'u16-test05-retest-v1'));
});
for(const unit of ['u16','U16/..','../U16','U016','U16 ',''])it('rejects malformed unit '+JSON.stringify(unit),()=>{
 assert.throws(()=>unitFixtureOutputDirectory(unit));
});

it('selects third run without changing old run',()=>{
 assert.equal(unitFixtureOutputDirectory('U16','u16-relations-retest-v1'),'output/lv3-audit-20261107/u16-validation-relations-retest-v1/');
 for(const u of ['U01','U15','U17'])assert.throws(()=>unitFixtureOutputDirectory(u,'u16-relations-retest-v1'));
 for(const r of ['u16-relations-retest-v2','u16-relations-retest-v1/','../u16-relations-retest-v1'])assert.throws(()=>unitFixtureOutputDirectory('U16',r));
});
