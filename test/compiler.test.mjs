import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {compile,parse,check} from '../src/compiler.mjs';

function run(source){const r=compile(source,{sourceMap:false});const logs=[];vm.runInNewContext(r.code,{console:{log:(...x)=>logs.push(x.join(' '))},Math,Array,Object,String,Number,Boolean,Error});return {r,logs};}

test('AST owns function + if + for',()=>{
  const ast=parse(`---bila:strict---\nhaml_sob f(x: Sob): Sob { neub(x>0){ trov_ved x; } kac { trov_ved 0; } } vil(bilb i=0;i<2;i++){ console.log(f(i)); }`).ast;
  assert.equal(ast.body[0].type,'FunctionDeclaration');
  assert.equal(ast.body[0].body.body[0].type,'IfStatement');
  assert.equal(ast.body[1].type,'ForStatement');
});

test('canonical BilaScript compiles and executes',()=>{
  const {logs,r}=run(`---bila:strict---\nhaml_sob tong(a: Sob,b: Sob): Sob { trov_ved a+b; } bilb ds: Magz<Sob>=[1,2]; ds.dayq(3); vil(bilb i=0;i<ds.dof_zail;i++){ neub(ds[i]>1){console.log(ds[i]);} } console.log(tong(4,5));`);
  assert.deepEqual(logs,['2','3','9']);
  assert.match(r.code,/function tong/);assert.match(r.code,/ds\.push\(3\)/);assert.match(r.code,/ds\.length/);
});

test('DOM and Web APIs pass through unchanged',()=>{
  const r=compile(`---bila:strict---\nbilb el=document.querySelector('#x'); el.addEventListener('click',()=>{ localStorage.setItem('x','1'); fetch('/api'); });`,{sourceMap:false});
  assert.match(r.code,/document\.querySelector/);assert.match(r.code,/addEventListener/);assert.match(r.code,/localStorage\.setItem/);assert.match(r.code,/fetch\('/);
});

test('modern syntax: arrow, spread, optional, nullish, destructuring',()=>{
  const r=compile(`---bila:strict---\nbilb [a,b]=[1,2]; bilb c=[... [a,b]]; bilb f=(x)=>x+1; console.log(c?.dof_zail ?? 0);`,{sourceMap:false});
  assert.match(r.code,/\[a, b\]/);assert.match(r.code,/\.\.\./);assert.match(r.code,/=>/);assert.match(r.code,/\?\./);assert.match(r.code,/\?\?/);
});

test('class and try/catch compile',()=>{
  const {logs}=run(`---bila:strict---\nlopx A { cong(a: Sob,b: Sob): Sob { trov_ved a+b; } } bilb a=moix A(); thuv { console.log(a.cong(2,3)); } chupr_layb(e) { console.log('ERR'); } cujb_cugl { console.log('END'); }`);
  assert.deepEqual(logs,['5','END']);
});

test('syntax diagnostics contain location',()=>{
  const r=check(`---bila:strict---\nbilb = 1;`);assert.equal(r.ok,false);assert.equal(r.diagnostics[0].code,'BILA-P001');assert.ok(r.diagnostics[0].line>=2);
});

test('source map v3 is emitted',()=>{
  const r=compile(`---bila:strict---\nbilb x=1;\nconsole.log(x);`,{sourceMap:true,sourceName:'x.bila',fileName:'x.js'});assert.equal(r.map.version,3);assert.deepEqual(r.map.sources,['x.bila']);assert.ok(r.map.mappings.length>0);
});

test('for-of and switch are AST-owned structural syntax',()=>{
  const src=`---bila---\nbilb s=0; vil (bilb x of [1,2,3]) { s += x; } switch(s){ case 6: console.log('OK'); zugk; default: console.log('BAD'); }`;
  const {logs,r}=run(src);assert.deepEqual(logs,['OK']);assert.match(r.code,/for \(var x of/);assert.match(r.code,/switch \(s\)/);
});

test('import/export module syntax compiles',()=>{
  const r=compile(`---bila:strict---\nnhapf { readFile as rf } tuk 'node:fs'; xadb haml_sob id(x: Sob): Sob { trov_ved x; }`,{sourceMap:false});
  assert.match(r.code,/import \{ readFile as rf \} from/);assert.match(r.code,/export function id/);
});

test('strict profile reports JavaScript keyword aliases with a location',()=>{
  const r=check(`---bila:strict---\nfunction sai_cu_phap() { return 1; }`);
  assert.equal(r.ok,false);
  assert.equal(r.diagnostics[0].code,'BILA-K001');
  assert.equal(r.diagnostics[0].line,2);
});

test('Unicode identifiers and canonical built-ins compile',()=>{
  const r=compile(`---bila:strict---\nbilb dữ_liệu=[1,4,9]; console.log(mony_Tolj.cano_bacf_hai(dữ_liệu[2]));`,{sourceMap:false});
  assert.match(r.code,/var dữ_liệu/);
  assert.match(r.code,/Math\.sqrt/);
});

test('unterminated input is returned as a parser diagnostic',()=>{
  const r=check(`---bila:strict---\nhaml_sob f() { bilb x = "oops; }`);
  assert.equal(r.ok,false);
  assert.equal(r.diagnostics[0].code,'BILA-P001');
  assert.match(r.diagnostics[0].message,/Chuỗi chưa đóng/);
});
