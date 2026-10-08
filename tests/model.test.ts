import {test} from 'node:test';
import assert from 'node:assert/strict';
import {create,demo,loadSensingDemo,isPilotLine,step,initial,fmt,remove,catalog,type Circuit,type Component} from '../src/model.ts';
const connect=(a:Component,ap:string,b:Component,bp:string,id='l')=>({id,from:a.id+':'+ap,to:b.id+':'+bp});
function basic(kind?:Parameters<typeof create>[0],reverse=false){const t=create('tank',0,0),p=create('pump',0,0);const components=[t,p],lines=[connect(t,'T',p,'T','suction')];let o:Component|undefined;if(kind){o=create(kind,0,0);components.push(o);lines.push(connect(p,'P',o,reverse?'B':'A','supply'),connect(o,reverse?'A':'B',t,'T','return'))}else lines.push(connect(p,'P',t,'T','supply'));return {c:{components,lines},t,p,o};}
function demoItems(){const c=demo();return {c,p:c.components.find(o=>o.kind==='pump')!,v:c.components.find(o=>o.kind==='valve43')!,cy:c.components.find(o=>o.kind==='cylinder')!,fc:c.components.find(o=>o.kind==='flowControl')!,rv:c.components.find(o=>o.kind==='relief')!,g:c.components.find(o=>o.kind==='gauge')!,fm:c.components.find(o=>o.kind==='meter')!};}
const flow=(c:Circuit,s:ReturnType<typeof step>,o:Component)=>Math.max(0,...c.lines.filter(l=>l.from.startsWith(o.id+':')||l.to.startsWith(o.id+':')).map(l=>Math.abs(s.lines[l.id]?.flow||0)));
test('pump directly to tank produces flow at low pressure',()=>{const {c,p}=basic();const s=step(c,initial(),0.1);assert.ok(s.ports[p.id+':P'].pressure<10);assert.ok(Math.abs(s.lines.supply.flow-6)<0.01);assert.equal(s.lines.suction.color,'suction');});
test('dead-headed pump reaches maximum pressure with static supply',()=>{const {c,p}=basic();c.lines=c.lines.filter(l=>l.id!=='supply');const g=create('gauge',0,0);c.components.push(g);c.lines.push(connect(p,'P',g,'P','blocked'));const s=step(c,initial(),0.1);assert.ok(Math.abs(s.ports[p.id+':P'].pressure-3000)<0.1);assert.equal(s.lines.blocked.flow,0);assert.equal(s.lines.blocked.color,'pressure');});
test('relief opens near its setting and sends flow toward tank',()=>{const {c,p,o}=basic('relief');const s=step(c,initial(),0.1);assert.ok(s.active[o!.id]);assert.ok(s.ports[p.id+':P'].pressure>=1500&&s.ports[p.id+':P'].pressure<1520);assert.ok(Math.abs(s.lines.return.flow-6)<0.1);assert.equal(s.lines.return.color,'return');});
test('2/2 valve changes the network immediately',()=>{const {c,p,o}=basic('valve22');let s=step(c,initial(),0);assert.equal(s.lines.supply.flow,0);assert.ok(s.ports[p.id+':P'].pressure>2999);o!.p.position=1;s=step(c,s,0);assert.ok(s.lines.supply.flow>5.9);assert.ok(s.ports[p.id+':P'].pressure<20);});
test('demo neutral, extension, restriction, end stroke and retraction',()=>{const {c,v,cy,fc,rv,g,fm}=demoItems();let s=step(c,initial(),0.1);assert.equal(s.motion[cy.id].speed,0);assert.ok(s.ports[g.id+':P'].pressure<30);v.p.position=1;s=step(c,s,0.1);assert.ok(s.motion[cy.id].speed>0);assert.ok(s.ports[g.id+':P'].pressure>500&&s.ports[g.id+':P'].pressure<1000);assert.ok(!s.active[rv.id]);assert.ok(flow(c,s,fm)>5.9);const fast=s.motion[cy.id].speed;fc.p.limit=2;s=step(c,s,0.1);assert.ok(s.motion[cy.id].speed<fast*0.5);assert.ok(Math.abs(flow(c,s,fm)-2)<0.01);assert.ok(Object.values(s.lines).some(l=>l.color==='metered'));assert.ok(s.active[rv.id]);for(let i=0;i<500;i++)s=step(c,s,0.05);assert.equal(s.motion[cy.id].position,1);s=step(c,s,0.1);assert.equal(s.motion[cy.id].speed,0);assert.ok(s.active[rv.id]);assert.ok(s.ports[g.id+':P'].pressure>=1500);assert.equal(flow(c,s,fm),0);v.p.position=-1;s=step(c,s,0.1);assert.ok(s.motion[cy.id].speed<0);assert.ok(s.motion[cy.id].position<1);assert.ok(s.ports[cy.id+':B'].pressure>s.ports[cy.id+':A'].pressure);});
test('insufficient pressure stalls cylinder',()=>{const {c,p,v,cy}=demoItems();p.p.maxPressure=200;v.p.position=1;const s=step(c,initial(),0.1);assert.equal(s.motion[cy.id].speed,0);assert.equal(s.motion[cy.id].position,0.25);});
test('cylinder retracts faster with annular area, reaches retract limit',()=>{const {c,v,cy}=demoItems();v.p.position=-1;let s=step(c,initial(),0.1);assert.ok(s.motion[cy.id].speed<0);for(let i=0;i<100;i++)s=step(c,s,0.1);assert.equal(s.motion[cy.id].position,0);s=step(c,s,0.1);assert.equal(s.motion[cy.id].speed,0);});
test('check passes forward and blocks reverse',()=>{let b=basic('check');let s=step(b.c,initial(),0);assert.ok(s.lines.supply.flow>5.9);b=basic('check',true);s=step(b.c,initial(),0);assert.equal(s.lines.supply.flow,0);assert.ok(s.ports[b.p.id+':P'].pressure>2999);});
test('tap and flow meter use shared line readings',()=>{const {c,p}=basic('meter');const g=create('gauge',0,0);c.components.push(g);c.lines.push(connect(p,'P',g,'P','tap'));const s=step(c,initial(),0);assert.ok(Math.abs(s.ports[g.id+':P'].pressure-s.ports[p.id+':P'].pressure)<0.1);assert.ok(Math.abs(s.lines.supply.flow-s.lines.return.flow)<0.001);});
test('disconnected circuits, invalid connections and cycles stay finite',()=>{const c:Circuit={components:[],lines:[{id:'invalid',from:'missing:A',to:'missing:B'}]};c.components.push(...Object.keys(catalog).map(k=>create(k as Parameters<typeof create>[0],0,0)));let s=initial();for(let i=0;i<100;i++)s=step(c,s,0.1);assert.ok(!JSON.stringify(s).includes('null'));assert.equal(s.lines.invalid.flow,0);});
test('branch flow conserves pump supply; restricted branch takes less',()=>{const {c,p,t}=basic();c.lines=c.lines.filter(l=>l.id!=='supply');const j=create('junction',0,0),a=create('flowControl',0,0),b=create('filter',0,0);a.p.limit=1;c.components.push(j,a,b);c.lines.push(connect(p,'P',j,'P','supply'),connect(j,'A',a,'A','branchA'),connect(j,'T',b,'A','branchB'),connect(a,'B',t,'T','returnA'),connect(b,'B',t,'T','returnB'));const s=step(c,initial(),0);assert.ok(Math.abs(s.lines.branchA.flow+s.lines.branchB.flow-6)<0.01);assert.ok(s.lines.branchA.flow<s.lines.branchB.flow);assert.ok(s.lines.branchA.flow<=1.001);});
test('speed changes time-dependent motion without changing steady values; zero dt pauses',()=>{const {c,v,cy}=demoItems();v.p.position=1;const a=step(c,initial(),0.05),b=step(c,initial(),0.1);assert.ok(Math.abs((b.motion[cy.id].position-0.25)-2*(a.motion[cy.id].position-0.25))<0.0001);assert.equal(a.ports[v.id+':P'].pressure,b.ports[v.id+':P'].pressure);assert.equal(step(c,a,0).motion[cy.id].position,a.motion[cy.id].position);});
test('moving preserves terminal identity; removing safely removes incident hoses',()=>{const {c,cy}=demoItems();const before=c.lines.map(l=>({...l}));cy.x+=100;cy.y+=40;assert.deepEqual(c.lines,before);const next=remove(c,cy.id);assert.ok(!next.lines.some(l=>l.from.startsWith(cy.id+':')||l.to.startsWith(cy.id+':')));assert.doesNotThrow(()=>step(next,initial(),0.1));});
test('display formatting has exactly one decimal place',()=>{assert.equal(fmt(2435.678),'2,435.7');assert.equal(fmt(0),'0.0');assert.equal(fmt(NaN),'0.0');});
test('motor rotates when supplied, blocks under excessive torque',()=>{const {c,p,o}=basic('motor');let s=step(c,initial(),0.1);assert.ok(s.motion[o!.id].rpm>0);assert.ok(s.motion[o!.id].angle>0);p.p.maxPressure=1;s=step(c,s,0.1);assert.equal(s.motion[o!.id].rpm,0);});
test('all 4/3 center configurations connect the expected ports',()=>{const {c,v,cy,g}=demoItems();for(const center of ['tandem','open','closed','float']){v.p.center=center;const s=step(c,initial(),0.1);assert.equal(s.motion[cy.id].speed,0);assert.ok(center==='open'||center==='tandem'?s.ports[g.id+':P'].pressure<30:s.ports[g.id+':P'].pressure>=1500);}});
test('pressure reducing valve sets downstream pressure and stalls an excessive load',()=>{const {c,v,cy,fc}=demoItems();fc.kind='reducing';fc.p.setting=800;v.p.position=1;let s=step(c,initial(),0.1);assert.ok(s.motion[cy.id].speed>0);assert.ok(s.ports[cy.id+':A'].pressure<=800);fc.p.setting=200;s=step(c,s,0.1);assert.equal(s.motion[cy.id].speed,0);});
test('accumulator accepts finite oil volume and discharges when pump stops',()=>{const {c,p,t}=basic();c.lines=c.lines.filter(l=>l.id!=='supply');const a=create('accumulator',0,0),j=create('junction',0,0),load=create('relief',0,0);c.components.push(a,j,load);c.lines.push(connect(p,'P',j,'P','supply'),connect(j,'A',a,'P','charge'),connect(j,'T',load,'A','load'),connect(load,'B',t,'T','return'));let s=initial();for(let i=0;i<50;i++)s=step(c,s,0.1);assert.ok(s.motion[a.id].charge>0);const before=s.motion[a.id].charge;p.p.running=false;load.p.setting=100;s=step(c,s,0.1);assert.ok(s.motion[a.id].charge<before);assert.ok(s.lines.return.flow>0);assert.ok(s.lines.charge.flow<0);});
test('single-acting cylinder extends from supply and returns under load',()=>{const t=create('tank',0,0),p=create('pump',0,0),v=create('valve32',0,0),cy=create('singleCylinder',0,0);const c={components:[t,p,v,cy],lines:[connect(t,'T',p,'T','suction'),connect(p,'P',v,'P','supply'),connect(v,'A',cy,'A','work'),connect(v,'T',t,'T','return')]};v.p.position=1;let s=step(c,initial(),0.1);assert.ok(s.motion[cy.id].position>0);v.p.position=0;s=step(c,s,0.1);assert.ok(s.motion[cy.id].speed<0);});
test('cyclic paths share one restriction capacity and remain deterministic',()=>{const {c,p,t}=basic();c.lines=c.lines.filter(l=>l.id!=='supply');const a=create('junction',0,0),b=create('junction',0,0),fc=create('flowControl',0,0),rv=create('relief',0,0);fc.p.limit=1;c.components.push(a,b,fc,rv);c.lines.push(connect(p,'P',a,'P','supply'),connect(a,'A',b,'A','path1'),connect(a,'T',b,'T','path2'),connect(b,'P',fc,'A','control'),connect(fc,'B',t,'T','return'),connect(p,'P',rv,'A','reliefIn'),connect(rv,'B',t,'T','reliefOut'));const s=step(c,initial(),0);assert.ok(Math.abs(s.lines.return.flow-1)<0.01);assert.ok(Math.abs(s.lines.return.flow+s.lines.reliefOut.flow-6)<0.01);assert.deepEqual(s,step(c,initial(),0));});
test('work-port flow direction and pressure/return colors swap on reversal',()=>{const {c,v,cy}=demoItems();const workB=c.lines.find(l=>l.from===v.id+':B'&&l.to===cy.id+':B')!;v.p.position=1;let s=step(c,initial(),0.1);assert.ok(s.lines[workB.id].flow<0);assert.equal(s.lines[workB.id].color,'return');assert.ok(s.ports[cy.id+':A'].pressure>s.ports[cy.id+':B'].pressure);v.p.position=-1;s=step(c,s,0.1);assert.ok(s.lines[workB.id].flow>0);assert.equal(s.lines[workB.id].color,'pressure');assert.ok(s.ports[cy.id+':B'].pressure>s.ports[cy.id+':A'].pressure);});
function pilotedPump(){
 const t=create('tank',0,0),main=create('variablePump',0,0),pilot=create('pump',0,0),reduce=create('reducing',0,0);
 reduce.p.setting=250;main.p.minStroke=0;
 const c:Circuit={components:[main,t,pilot,reduce],lines:[connect(t,'T',main,'T','mainIntake'),connect(main,'P',t,'T','output'),connect(t,'T',pilot,'T','pilotIntake'),connect(pilot,'P',reduce,'A','pilotSupply'),connect(reduce,'B',main,'X','pilot')]};
 return {c,main,pilot,reduce};
}
test('X pilot pressure controls swashplate and pump output in the same step',()=>{
 const {c,main,reduce,pilot}=pilotedPump();
 for(const [pressure,stroke] of [[0,0],[125,0.25],[250,0.5],[500,1],[900,1]]){
  reduce.p.setting=pressure;const s=step(c,initial(),0);
  assert.ok(Math.abs(s.stroke[main.id]-stroke)<0.001);
  assert.ok(Math.abs(s.lines.output.flow-6*stroke)<0.001);
  assert.equal(s.lines.pilot.flow,0);if(pressure>1)assert.equal(s.lines.pilot.color,'reduced');
 }
 pilot.p.running=false;assert.equal(step(c,initial(),0).stroke[main.id],0);
 c.lines=c.lines.filter(l=>l.id!=='pilot');assert.ok(step(c,initial(),0).lines.output.flow>5.99);
});
test('pilot start pressure, source order, and one motion integration remain deterministic',()=>{
 const {c,main,reduce}=pilotedPump();main.p.pilotStart=100;main.p.pilotFull=400;reduce.p.setting=250;
 const cy=create('cylinder',0,0);c.components.push(cy);c.lines=c.lines.filter(l=>l.id!=='output');c.lines.push(connect(main,'P',cy,'A','output'),connect(cy,'B',c.components.find(o=>o.kind==='tank')!,'T','exhaust'));
 const s=step(c,initial(),0.1);assert.ok(Math.abs(s.stroke[main.id]-0.5)<0.001);
 assert.ok(Math.abs(s.motion[cy.id].position-0.25-s.motion[cy.id].speed*0.1/12)<1e-9);
 c.components.reverse();const reordered=step(c,initial(),0.1);assert.ok(Math.abs(reordered.lines.output.flow-s.lines.output.flow)<1e-7);
 assert.equal(step(c,s,0).motion[cy.id].position,s.motion[cy.id].position);
 const self=pilotedPump();self.c.lines=self.c.lines.filter(l=>l.id!=='pilot');self.c.lines.push(connect(self.main,'P',self.main,'X','feedback'));
 assert.deepEqual(step(self.c,initial(),0.1),step(self.c,initial(),0.1));
});

test('minimum stroke starts a self-piloted pump from a cold state',()=>{
 const c=demo(),pump=c.components.find(o=>o.kind==='pump')!,valve=c.components.find(o=>o.kind==='valve43')!;
 pump.kind='variablePump';c.lines.push(connect(pump,'P',pump,'X','selfPilot'));
 let s=step(c,initial(),0);
 assert.ok(s.stroke[pump.id]>=0.1);assert.ok(Math.abs(s.lines.l1.flow-0.6)<0.01);
 valve.p.position=1;s=step(c,initial(),0.1);
 const cy=c.components.find(o=>o.kind==='cylinder')!;
 assert.ok(s.stroke[pump.id]>0.999);assert.ok(s.motion[cy.id].speed>0);assert.ok(s.ports[pump.id+':X'].pressure>500);
 pump.p.running=false;s=step(c,s,0.1);assert.equal(s.lines.l1.flow,0);assert.equal(s.motion[cy.id].speed,0);
 pump.p.running=true;pump.p.minStroke=0;s=step(c,initial(),0.1);assert.equal(s.stroke[pump.id],0);assert.equal(s.lines.l1.flow,0);
});
test('minimum stroke respects settings and preserves manual operation',()=>{
 const {c,main,pilot}=pilotedPump();pilot.p.running=false;
 for(const percent of [0,10,30,100]){main.p.minStroke=percent;const s=step(c,initial(),0);assert.equal(s.stroke[main.id],percent/100);assert.ok(Math.abs(s.lines.output.flow-6*percent/100)<1e-6)}
 main.p.minStroke=NaN;assert.equal(step(c,initial(),0).stroke[main.id],0.1);
 c.lines=c.lines.filter(l=>l.id!=='pilot');assert.equal(step(c,initial(),0).stroke[main.id],1);
});

test('shuttle selects the higher load pressure without feeding the lower inlet',()=>{
 const {c,p,t}=basic();c.lines=c.lines.filter(l=>l.id!=='supply');
 const low=create('reducing',0,0),high=create('reducing',0,0),sh=create('shuttle',0,0),g=create('gauge',0,0);low.p.setting=200;high.p.setting=700;
 c.components.push(low,high,sh,g);c.lines.push(connect(p,'P',low,'A','lowSupply'),connect(p,'P',high,'A','highSupply'),connect(low,'B',sh,'A','low'),connect(high,'B',sh,'B','high'),connect(sh,'C',g,'P','signal'));
 let s=step(c,initial(),0);assert.equal(s.selected[sh.id],'B');assert.ok(Math.abs(s.ports[g.id+':P'].pressure-700)<0.1);assert.ok(s.ports[low.id+':B'].pressure<201);assert.equal(s.lines.low.flow,0);
 low.p.setting=900;s=step(c,s,0);assert.equal(s.selected[sh.id],'A');assert.ok(Math.abs(s.ports[g.id+':P'].pressure-900)<0.1);
 c.lines.push(connect(sh,'C',t,'T','out'));s=step(c,s,0);assert.ok(s.lines.out.flow>0);assert.equal(s.lines.high.flow,0);
});
test('compensated flow stays steady as load changes and falls under starvation',()=>{
 const {c,v,cy,fc,p}=demoItems();fc.kind='compensatedFlow';fc.p.limit=2;fc.p.margin=100;v.p.position=1;
 for(const load of [500,4000,7000]){cy.p.load=load;const s=step(c,initial(),0);assert.ok(Math.abs(flow(c,s,fc)-2)<0.01)}
 p.p.flow=1;assert.ok(Math.abs(flow(c,step(c,initial(),0),fc)-1)<0.01);
 p.p.maxPressure=100;assert.equal(flow(c,step(c,initial(),0),fc),0);
});

test('load-sensing example maintains margin, load-independent metering, reverses and relieves at stroke limit',()=>{
 const c=loadSensingDemo(),get=(kind:Component['kind'])=>c.components.find(o=>o.kind===kind)!;
 const pump=get('variablePump'),v=get('valve43'),cy=get('cylinder'),pc=get('compensator'),ls=get('lsBypass'),sh=get('shuttle'),orifice=get('restriction');
 let s=step(c,initial(),0);assert.equal(s.motion[cy.id].speed,0);assert.ok(s.ports[pump.id+':P'].pressure>200&&s.ports[pump.id+':P'].pressure<230);assert.ok(s.active[ls.id]);
 v.p.position=1;
 assert.equal(s.stroke[pump.id],0.75);assert.ok(isPilotLine(c,c.lines.find(l=>l.to===pump.id+':X')!));
 for(const load of [1000,4000,6500]){cy.p.load=load;s=step(c,initial(),0);assert.ok(Math.abs(s.ports[pc.id+':B'].pressure-s.ports[pc.id+':X'].pressure-200)<1);assert.ok(Math.abs(flow(c,s,orifice)-3)<0.03);assert.equal(s.selected[sh.id],'A');const output=8*s.stroke[pump.id];assert.ok(Math.abs(s.lines.l1.flow-output)<0.01);assert.ok(Math.abs(s.lines.ls7.flow+flow(c,s,orifice)-output)<0.01);assert.ok(load===1000?s.stroke[pump.id]===0.75:s.stroke[pump.id]>0.99)}
 cy.p.load=4000;orifice.p.limit=1.5;s=step(c,initial(),0);assert.ok(Math.abs(flow(c,s,orifice)-1.5)<0.03);
 s.motion[cy.id].position=1;s=step(c,s,0);assert.equal(s.motion[cy.id].speed,0);assert.ok(s.active[get('relief').id]);assert.equal(flow(c,s,orifice),0);
 v.p.position=-1;s=step(c,s,0.05);assert.ok(s.motion[cy.id].speed<0);assert.equal(s.selected[sh.id],'B');assert.ok(c.lines.filter(l=>l.from.startsWith(sh.id+':')||l.to.startsWith(sh.id+':')).every(l=>isPilotLine(c,l)));
 assert.equal(step(c,s,0).motion[cy.id].position,s.motion[cy.id].position);
 c.components.reverse();assert.ok(Math.abs(step(c,initial(),0).ports[pump.id+':P'].pressure-step({...c,components:[...c.components].reverse()},initial(),0).ports[pump.id+':P'].pressure)<1e-6);
});
