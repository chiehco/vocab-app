import assert from 'node:assert/strict';

/** An explicit evidence-run identity, never an arbitrary filesystem path. */
export function unitFixtureOutputDirectory(unit:string,run:unknown=undefined):string {
 assert.match(unit,/^U\d{2}$/);
 if(run===undefined)return `output/lv3-audit-20261107/${unit.toLowerCase()}-validation/`;
 assert.equal(unit,'U16','Versioned fixture run is restricted to U16');
 assert.ok(run==='u16-test05-retest-v1'||run==='u16-relations-retest-v1','Unknown fixture run; no fallback is allowed');
 if(run==='u16-relations-retest-v1')return 'output/lv3-audit-20261107/u16-validation-relations-retest-v1/';
 return 'output/lv3-audit-20261107/u16-validation-test05-retest-v1/';
}
