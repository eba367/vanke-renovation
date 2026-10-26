'use strict';
const assert=require('node:assert/strict');
const {validate,readPayload,isReviewer}=require('./review-change.cjs');
const data={items:[{id:'A01',budget:100,notes:'',source:'',stage:'初选'}],optional:[{id:'X01',min:100,max:200}]};
const payload=(changes,base)=>({kind:'renovation_change_v1',id:'A01',optional:false,changes,base});
assert.equal(validate(data,payload({budget:200},{budget:100})).changes.budget,200);
assert.throws(()=>validate(data,payload({budget:200},{budget:99})),/原值已变化/);
for(const value of [-1,Infinity,NaN,1.2,10000001,'100']) assert.throws(()=>validate(data,payload({budget:value},{budget:100})));
for(const value of ['javascript:alert(1)','data:text/html,hi','https://user:pass@example.com']) assert.throws(()=>validate(data,payload({source:value},{source:''})));
assert.throws(()=>validate(data,payload(JSON.parse('{"__proto__":{"polluted":true}}'),JSON.parse('{"__proto__":""}'))));
assert.throws(()=>validate(data,payload({stage:'自动验收'},{stage:'初选'})));
assert.throws(()=>validate(data,{kind:'renovation_change_v1',id:'X01',optional:true,changes:{min:300},base:{min:100}}));
assert.deepEqual(readPayload('```json\n{"test":1}\n```'),{test:1});
assert.throws(()=>readPayload('```json\n{}\n```\n```json\n{}\n```'));
for(const permission of ['read','triage','none']) assert.equal(isReviewer(permission),false);
for(const permission of ['write','maintain','admin']) assert.equal(isReviewer(permission),true);
assert.equal({}.polluted,undefined);
const real=JSON.parse(require('node:fs').readFileSync('renovation.json','utf8'));
for (const optional of [false,true]) for (const item of optional?real.optional:real.items) {
  assert.equal(validate(real,{kind:'renovation_change_v1',id:item.id,optional,changes:{notes:'协作校验'},base:{notes:item.notes??''}}).item.id,item.id);
}
console.log('Security checks passed: valid edits, stale data, money, unsafe links, forbidden fields, stages, price ranges, parsing, reviewer roles.');
