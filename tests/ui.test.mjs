import {test} from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {JSDOM,VirtualConsole} from 'jsdom';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
let source,css;
if(process.env.HYDROSIM_TEST_PRODUCTION==='1'){
 const html=await readFile('dist/index.html','utf8');
 const script=html.match(/<script[^>]*src="([^"]+)"/)[1];
 const stylesheet=html.match(/<link[^>]*href="([^"]+\.css)"/)[1];
 source=await readFile('dist/'+script.replace(/^\.\//,''),'utf8');
 css=await readFile('dist/'+stylesheet.replace(/^\.\//,''),'utf8');
}else{
 const result=await build({entryPoints:['src/main.tsx'],bundle:true,format:'iife',write:false,outdir:'/tmp/hydrosim-ui-test',jsx:'automatic',define:{'process.env.NODE_ENV':'"production"'}});
 source=result.outputFiles.find(x=>x.path.endsWith('.js')).text;
 css=result.outputFiles.find(x=>x.path.endsWith('.css')).text;
}
const errors=[];const virtualConsole=new VirtualConsole();virtualConsole.on('jsdomError',e=>errors.push(e.message));
const dom=new JSDOM('<!doctype html><html><head></head><body><div id="root"></div></body></html>',{url:'http://localhost/',runScripts:'outside-only',pretendToBeVisual:true,virtualConsole});
const {window:w}=dom;const doc=w.document;
let clock=w.performance.now(),nextFrame=0;const frames=new Map();w.requestAnimationFrame=f=>{frames.set(++nextFrame,f);return nextFrame};w.cancelAnimationFrame=id=>frames.delete(id);
w.SVGElement.prototype.getBoundingClientRect=function(){return {x:0,y:0,left:0,top:0,right:960,bottom:700,width:960,height:700}};
w.SVGElement.prototype.setPointerCapture=()=>{};
w.eval(source);const style=doc.createElement('style');style.textContent=css;doc.head.append(style);
const settle=()=>new Promise(r=>setTimeout(r,5));
async function waitFor(predicate){const deadline=Date.now()+2000;while(!predicate()&&Date.now()<deadline)await settle();assert.ok(predicate(),'UI update completed');}
async function advance(count=1){for(let i=0;i<count;i++){clock+=50;const q=[...frames.values()];frames.clear();for(const f of q)f(clock);await settle()}}
function click(element){assert.ok(element,'control exists');element.dispatchEvent(new w.MouseEvent('click',{bubbles:true}));}
function pointer(element,type,x=0,y=0){assert.ok(element);const e=new w.MouseEvent(type,{bubbles:true,clientX:x,clientY:y});Object.defineProperty(e,'pointerId',{value:1});element.dispatchEvent(e)}
function button(text,root=doc){return [...root.querySelectorAll('button')].find(x=>x.textContent===text||x.textContent.endsWith(text))}
function component(label){return doc.querySelector(`[data-component="${label}"]`)}
function input(label,value){const field=[...doc.querySelectorAll('.inspector label')].find(x=>x.textContent.includes(label));assert.ok(field,label);const el=field.querySelector('input');Object.getOwnPropertyDescriptor(w.HTMLInputElement.prototype,'value').set.call(el,value);el.dispatchEvent(new w.Event('input',{bubbles:true}));el.dispatchEvent(new w.Event('change',{bubbles:true}));}
function extension(){return Number(component('CYL1').querySelector('.symbol text').textContent.replace(' in',''));}
await new Promise(r=>setTimeout(r,100));
test('render and operate the demo end-to-end through real React controls',async()=>{
 assert.equal(doc.querySelectorAll('.component').length,9);assert.equal(doc.querySelectorAll('.hose').length,11);assert.equal(extension(),3);
 click(button('▶ Run'));await advance(3);assert.equal(extension(),3);assert.ok(component('FM1').textContent.includes('6.0 GPM'));
 click(button('Extend',component('DCV1')));await advance(10);const fast=extension();assert.ok(fast>3);assert.ok(component('PT1').textContent.includes('PSI'));
 pointer(component('FC1'),'pointerdown');pointer(doc.querySelector('svg.canvas'),'pointerup');await settle();input('Flow limit (GPM)','2');await settle();await advance(4);assert.ok(component('FM1').textContent.includes('2.0 GPM'));const before=extension();await advance(10);assert.ok(extension()-before<fast-3);
 const activeLines=[...doc.querySelectorAll('.hose')];assert.ok(activeLines.some(x=>x.querySelector('path:nth-of-type(2)').getAttribute('stroke')==='#bb930a'));
 // Faster simulation changes elapsed motion, then the relief carries all pump flow at the mechanical stop.
 const speed=doc.querySelector('select[aria-label="Simulation speed"]');speed.value='4';speed.dispatchEvent(new w.Event('change',{bubbles:true}));await settle();await advance(220);assert.equal(extension(),12);assert.ok(component('RV1').textContent.includes('RELIEVING'));assert.ok(component('FM1').textContent.includes('0.0 GPM'));
 click(button('Retract',component('DCV1')));await advance(10);assert.ok(extension()<12);
 click(button('Ⅱ Pause'));await settle();const stopped=extension();await advance(10);assert.equal(extension(),stopped);
 pointer(component('P1'),'pointerdown');pointer(doc.querySelector('svg.canvas'),'pointerup');await settle();click(button('Stop pump'));await settle();assert.ok(component('P1').textContent.includes('STOPPED'));click(button('Start pump'));await settle();
 assert.deepEqual(errors,[]);
});
test('component editing, dragging, connection creation, deletion and palette placement',async()=>{
 pointer(component('CYL1'),'pointerdown',750,80);pointer(doc.querySelector('svg.canvas'),'pointerup');await settle();input('Label','Training cylinder');await settle();assert.ok(component('Training cylinder'));
 const original=component('Training cylinder').getAttribute('transform');const hoses=[...doc.querySelectorAll('.hose path:nth-of-type(2)')].map(x=>x.getAttribute('d'));
 pointer(component('Training cylinder'),'pointerdown',750,80);pointer(doc.querySelector('svg.canvas'),'pointermove',790,100);pointer(doc.querySelector('svg.canvas'),'pointerup');await settle();assert.notEqual(component('Training cylinder').getAttribute('transform'),original);assert.equal(doc.querySelectorAll('.hose').length,11);assert.notDeepEqual([...doc.querySelectorAll('.hose path:nth-of-type(2)')].map(x=>x.getAttribute('d')),hoses);
 // Source/target drag feedback and new graph-terminal connection.
 click(button('Pressure tap',doc.querySelector('.palette')));await settle();const added=[...doc.querySelectorAll('.component')].at(-1);const source=component('P1').querySelector('[data-port$=":P"]');const target=added.querySelector('[data-port]');pointer(source,'pointerdown',200,300);await settle();assert.ok(doc.querySelectorAll('.port.compatible').length>0);doc.elementFromPoint=()=>target;pointer(doc.querySelector('svg.canvas'),'pointermove',400,240);pointer(doc.querySelector('svg.canvas'),'pointerup',400,240);await settle();assert.equal(doc.querySelectorAll('.hose').length,12);
 pointer(added,'pointerdown');pointer(doc.querySelector('svg.canvas'),'pointerup');await settle();doc.body.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Delete',bubbles:true}));await settle();assert.equal(doc.querySelectorAll('.component').length,9);assert.equal(doc.querySelectorAll('.hose').length,11);
 const canvas=doc.querySelector('svg.canvas');const drop=new w.Event('drop',{bubbles:true,cancelable:true});Object.assign(drop,{clientX:300,clientY:250,dataTransfer:{getData:()=> 'check'}});canvas.dispatchEvent(drop);await settle();assert.equal(doc.querySelectorAll('.component').length,10);
 pointer(doc.querySelector('.hose'),'pointerdown');await settle();click(button('Delete connection'));await settle();assert.equal(doc.querySelectorAll('.hose').length,10);
 click(button('Clear circuit'));await settle();assert.equal(doc.querySelectorAll('.component').length,0);click(button('Load demo'));await settle();assert.equal(doc.querySelectorAll('.component').length,9);
 assert.deepEqual(errors,[]);
});
test('variable pump exposes and connects its pilot control through the editor',async()=>{
 click(button('Variable pump',doc.querySelector('.palette')));await settle();
 const pump=[...doc.querySelectorAll('.component')].at(-1);const target=pump.querySelector('[data-port$=":X"]');assert.ok(target);
 input('Minimum stroke (%)','20');await settle();
 input('Full stroke pilot pressure (PSI)','1');await settle();
 pointer(component('P1').querySelector('[data-port$=":P"]'),'pointerdown');await settle();doc.elementFromPoint=()=>target;
 pointer(doc.querySelector('svg.canvas'),'pointermove',400,240);pointer(doc.querySelector('svg.canvas'),'pointerup',400,240);await settle();
 assert.ok(pump.textContent.includes('100.0% STROKE'));
 assert.equal([...doc.querySelectorAll('.hose')].at(-1).querySelector('path:nth-of-type(2)').getAttribute('stroke-dasharray'),'6 4');
 pointer(component('P1'),'pointerdown');pointer(doc.querySelector('svg.canvas'),'pointerup');await settle();click(button('Stop pump'));await settle();await waitFor(()=>pump.textContent.includes('20.0% STROKE'));
 click(button('Load demo'));await settle();assert.deepEqual(errors,[]);
});
test('operate and inspect the load-sensing example through React controls',async()=>{
 click(button('Load LS demo'));await settle();assert.equal(doc.querySelectorAll('.component').length,12);
 assert.ok(component('LS1').textContent.includes('BYPASS'));assert.ok(component('CYL1'));
 click(button('Extend',component('DCV1')));await settle();await waitFor(()=>component('FM1').textContent.includes('3.0 GPM'));
 pointer(component('CYL1'),'pointerdown');pointer(doc.querySelector('svg.canvas'),'pointerup');await settle();input('Resisting load (lbf)','6500');await settle();await waitFor(()=>component('FM1').textContent.includes('3.0 GPM'));
 pointer(component('PC1'),'pointerdown');pointer(doc.querySelector('svg.canvas'),'pointerup');await settle();await waitFor(()=>doc.querySelector('.inspector').textContent.includes('200.0 PSI'));
 pointer(component('OR1'),'pointerdown');pointer(doc.querySelector('svg.canvas'),'pointerup');await settle();input('Nominal flow (GPM)','1.5');await settle();await waitFor(()=>component('FM1').textContent.includes('1.5 GPM'));
 pointer(component('SH1'),'pointerdown');pointer(doc.querySelector('svg.canvas'),'pointerup');await settle();await waitFor(()=>doc.querySelector('.inspector').textContent.includes('Selected inletA'));
 const svg=doc.querySelector('svg.canvas').cloneNode(true);svg.setAttribute('xmlns','http://www.w3.org/2000/svg');svg.setAttribute('width','960');svg.setAttribute('height','700');const grid=svg.querySelector('g > .grid-bg');grid.setAttribute('x','-120');grid.setAttribute('y','-100');grid.setAttribute('width','1300');grid.setAttribute('height','1000');const style=doc.createElementNS('http://www.w3.org/2000/svg','style');style.textContent=css;svg.prepend(style);await writeFile('artifacts/ls-schematic.svg',svg.outerHTML);
 click(button('▶ Run'));await advance(8);assert.ok(extension()>3);click(button('Retract',component('DCV1')));await advance(3);assert.ok(component('SH1').textContent.includes('B → C'));
 click(button('Ⅱ Pause'));await settle();click(button('Load demo'));await settle();assert.deepEqual(errors,[]);
});
test('capture the SVG schematic for visual inspection',async()=>{
 click(button('Extend',component('DCV1')));click(button('▶ Run'));await advance(10);const svg=doc.querySelector('svg.canvas').cloneNode(true);svg.setAttribute('xmlns','http://www.w3.org/2000/svg');svg.setAttribute('width','960');svg.setAttribute('height','700');const grid=svg.querySelector('g > .grid-bg');grid.setAttribute('x','-120');grid.setAttribute('y','-100');grid.setAttribute('width','1300');grid.setAttribute('height','1000');const style=doc.createElementNS('http://www.w3.org/2000/svg','style');style.textContent=css;svg.prepend(style);
 await mkdir('artifacts',{recursive:true});await writeFile('artifacts/demo-schematic.svg',svg.outerHTML);await writeFile('artifacts/ui-snapshot.html',dom.serialize());assert.deepEqual(errors,[]);w.close();
});
