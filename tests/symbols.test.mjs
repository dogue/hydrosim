import {test} from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {JSDOM} from 'jsdom';
import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
import {create,initial,catalog,ports} from '../src/model.ts';

const compiled=await build({entryPoints:['src/Symbol.tsx'],bundle:true,platform:'node',format:'cjs',jsx:'automatic',external:['react','react/jsx-runtime'],write:false});
const module={exports:{}};
new Function('require','module','exports',compiled.outputFiles[0].text)(createRequire(import.meta.url),module,module.exports);
const {Symbol}=module.exports;
function markup(o,s=initial()){return renderToStaticMarkup(React.createElement(Symbol,{o,s}));}
function drawing(o,s){return new JSDOM(`<svg xmlns="http://www.w3.org/2000/svg">${markup(o,s)}</svg>`).window.document;}
const activeBox=doc=>doc.querySelector('[data-active="true"]');

test('readouts and valve states clear port labels through every rotation and flip',()=>{
 for(const kind of Object.keys(catalog))for(const rotation of [0,90,180,270])for(const flipX of [false,true])for(const flipY of [false,true]){
  const o={...create(kind,0,0),rotation,flipX,flipY},doc=drawing(o);
  const transform=(x,y)=>{const a=rotation*Math.PI/180,c=Math.round(Math.cos(a)),s=Math.round(Math.sin(a));x*=flipX?-1:1;y*=flipY?-1:1;return {x:c*x-s*y,y:s*x+c*y}};
  const bottom=Math.max(...ports(kind).map(p=>transform(p.x,p.y).y));
  for(const text of doc.querySelectorAll('text')){
   if(text.textContent==='N₂')continue;
   const anchor=transform(Number(text.getAttribute('x')),Number(text.getAttribute('y')));
   assert.equal(Math.abs(anchor.x),0,`${kind} readout stays centered`);
   assert.ok(anchor.y>=bottom+40,`${kind} ${rotation} readout clears ports`);
  }
 }
});
test('reducing valve senses downstream B; relief senses upstream A; springs are solid',()=>{
 for(const kind of ['reducing','relief']){
  const o=create(kind,0,0),doc=drawing(o),pilot=doc.querySelector('[data-symbol-part="pressure-pilot"]');
  const port=ports(kind).find(p=>p.name===(kind==='reducing'?'B':'A'));
  const [x,y]=pilot.getAttribute('d').match(/^M(-?\d+) (-?\d+)/).slice(1).map(Number);
  assert.equal(Math.sign(x),Math.sign(port.x));assert.equal(y,port.y);assert.ok(Math.abs(x)>20&&Math.abs(x)<Math.abs(port.x));
  assert.equal(pilot.getAttribute('stroke-dasharray'),'4 3');
  assert.ok(!doc.querySelector('[data-symbol-part="adjustable-spring"] [stroke-dasharray]'));
 }
 const reducing=drawing(create('reducing',0,0)),relief=drawing(create('relief',0,0));
 assert.ok(reducing.querySelector('path[d="M-14 0L14 0"]'),'normal reducing passage is open and aligned');
 assert.ok(relief.querySelector('path[d="M-14 9L14 9"]'),'normal relief passage is offset and closed');
});
test('directional valves show every position and align the selected box with fixed ports',()=>{
 for(const kind of ['valve22','valve32','valve42','valve43']){
  const o=create(kind,0,0),positions=kind==='valve43'?[-1,0,1]:kind==='valve42'?[-1,1]:[0,1];
  for(const position of positions){o.p.position=position;const doc=drawing(o);assert.equal(doc.querySelectorAll('[data-spool-position]').length,kind==='valve43'?3:2);assert.equal(activeBox(doc).getAttribute('transform'),'translate(0,0)');}
 }
});
test('3/2 return routes A to T and blocks P; supply routes P to A and blocks T',()=>{
 const o=create('valve32',0,0);let box=activeBox(drawing(o));assert.ok(box.querySelector('path[d="M-10 -23L10 23"]'));assert.ok(box.querySelector('path[d="M-10 23V12M-16 12H-4"]'));
 o.p.position=1;box=activeBox(drawing(o));assert.ok(box.querySelector('path[d="M-10 23L-10 -23"]'));assert.ok(box.querySelector('path[d="M10 23V12M4 12H16"]'));
});
test('4/3 centers have distinct connectivity and all closed ports carry termination bars',()=>{
 const o=create('valve43',0,0);const centers={};
 for(const center of ['closed','tandem','open','float']){o.p.center=center;const box=activeBox(drawing(o));centers[center]=box.innerHTML;if(center==='closed')assert.equal(box.querySelectorAll('path').length,4);if(center==='open')assert.equal(box.querySelectorAll('circle').length,2);if(center==='float')assert.ok(box.querySelector('path[d="M-10 23V12M-16 12H-4"]'));}
 assert.equal(new Set(Object.values(centers)).size,4);
});
test('motor has inward triangles and cylinder rod protrudes even at full retraction',()=>{
 const motor=drawing(create('motor',0,0));assert.ok(motor.querySelector('[data-symbol-part="motor-triangles"] path').getAttribute('d').includes('L10 0'));assert.ok(motor.querySelector('[data-symbol-part="motor-triangles"] path').getAttribute('d').includes('L-10 0'));
 const o=create('singleCylinder',0,0),doc=drawing(o);const end=Number(doc.querySelector('[data-symbol-part="rod"]').getAttribute('d').match(/H(-?[\d.]+)/)[1]);assert.ok(end>50);
});
test('advanced symbols expose opposite pressure feedback and isolated shuttle seats',()=>{
 const pc=drawing(create('compensator',0,0));assert.ok(pc.querySelector('[data-symbol-part="external-load-pilot"]'));assert.ok(pc.querySelector('[data-symbol-part="compensation-feedback"]').getAttribute('d').startsWith('M32'));
 assert.ok(pc.querySelector('[data-symbol-part="reverse-check"]'));
 const ls=drawing(create('lsBypass',0,0));assert.ok(ls.querySelector('[data-symbol-part="compensation-feedback"]').getAttribute('d').startsWith('M-32'));
 const sh=drawing(create('shuttle',0,0));assert.ok(sh.querySelector('[data-symbol-part="shuttle-ball"]'));
});
test('export all library symbols and center conditions for visual review',async()=>{
 const variants=Object.keys(catalog).map(kind=>({o:create(kind,0,0),caption:catalog[kind]}));
 for(const center of ['closed','open','tandem','float']){const o=create('valve43',0,0);o.p.center=center;variants.push({o,caption:`4/3 ${center} center`});}
 for(const [kind,position] of [['valve22',1],['valve32',1],['valve42',-1],['valve43',-1],['valve43',1]]){const o=create(kind,0,0);o.p.position=position;variants.push({o,caption:`${catalog[kind]} / shifted`});}
 const cells=variants.map(({o,caption},i)=>`<g transform="translate(${160+(i%4)*280},${120+Math.floor(i/4)*165})"><text y="-76" text-anchor="middle" font-family="sans-serif" font-size="13">${caption}</text>${markup(o)}</g>`).join('');
 await mkdir('artifacts',{recursive:true});await writeFile('artifacts/symbol-review.svg',`<svg xmlns="http://www.w3.org/2000/svg" width="1120" height="${Math.ceil(variants.length/4)*165+45}"><rect width="100%" height="100%" fill="#f8fafc"/><defs><marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0L10 5L0 10Z" fill="#263543"/></marker></defs><style>.symbol text{fill:#526577;stroke:none;font:10px sans-serif;text-anchor:middle}</style>${cells}</svg>`);
});
