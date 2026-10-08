export const catalog = {
 shuttle:'Shuttle valve', compensator:'Two-way pressure compensator', compensatedFlow:'Compensated flow control', lsBypass:'Load-sensing bypass regulator',
 tank:'Reservoir', pump:'Fixed pump', variablePump:'Variable pump', accumulator:'Accumulator', cylinder:'Double-acting cylinder', singleCylinder:'Single-acting cylinder', motor:'Hydraulic motor', valve22:'2/2 valve', valve32:'3/2 valve', valve42:'4/2 valve', valve43:'4/3 valve', relief:'Relief valve', reducing:'Pressure reducing valve', restriction:'Fixed orifice', flowControl:'Adjustable flow control', check:'Check valve', filter:'Filter', gauge:'Pressure tap', meter:'Inline flow meter', junction:'Junction / tee', cap:'Blocked port'
} as const;
export type Kind=keyof typeof catalog;
export type Component={id:string;kind:Kind;label:string;x:number;y:number;rotation?:number;flipX?:boolean;flipY?:boolean;p:Record<string,number|string|boolean>};
export type Line={id:string;from:string;to:string};
export type Circuit={components:Component[];lines:Line[]};
export type Reading={pressure:number;flow:number;color:string};
export type Motion={position:number;speed:number;rpm:number;angle:number;charge:number};
export type State={ports:Record<string,Reading>;lines:Record<string,Reading>;motion:Record<string,Motion>;stroke:Record<string,number>;selected:Record<string,string>;active:Record<string,boolean>};
export const colors:Record<string,string>={pressure:'#dc4144',return:'#287cc5',suction:'#289967',metered:'#bb930a',reduced:'#df792b',inactive:'#9ba5b0'};
export const fmt=(n:number)=> (Number.isFinite(n)?n:0).toLocaleString('en-US',{minimumFractionDigits:1,maximumFractionDigits:1});
export function ports(k:Kind):{name:string;x:number;y:number}[]{
 if(k==='shuttle')return [{name:'A',x:-45,y:0},{name:'B',x:45,y:0},{name:'C',x:0,y:-40}];
 if(k==='compensator')return [{name:'A',x:-45,y:0},{name:'B',x:45,y:0},{name:'X',x:-12,y:40}];
 if(k==='lsBypass')return [{name:'P',x:-45,y:0},{name:'T',x:45,y:0},{name:'X',x:0,y:40}];
 if(k==='valve22')return [{name:'A',x:0,y:-35},{name:'B',x:0,y:35}];
 if(k==='tank')return [{name:'T',x:0,y:-30}];
 if(['gauge','accumulator','cap'].includes(k))return [{name:'P',x:0,y:30}];
 if(k==='junction')return [{name:'P',x:-40,y:0},{name:'A',x:40,y:0},{name:'T',x:0,y:30}];
 if(k==='cylinder')return [{name:'A',x:-40,y:30},{name:'B',x:40,y:30}];
 if(k==='singleCylinder')return [{name:'A',x:-40,y:30}];
 if(k.startsWith('valve'))return [{name:'P',x:-30,y:35},{name:'T',x:30,y:35},{name:'A',x:-30,y:-35},...(k==='valve32'?[]:[{name:'B',x:30,y:-35}])];
 if(k==='variablePump')return [{name:'T',x:-45,y:0},{name:'P',x:45,y:0},{name:'X',x:0,y:-70}];
 if(k==='pump')return [{name:'T',x:-45,y:0},{name:'P',x:45,y:0}];
 return [{name:'A',x:-45,y:0},{name:'B',x:45,y:0}];
}
let serial=0;
export function create(kind:Kind,x:number,y:number):Component{
 const id=`c${++serial}`;const prefix:Partial<Record<Kind,string>>={shuttle:'SH',compensator:'PC',compensatedFlow:'CFC',lsBypass:'LS',tank:'T',pump:'P',variablePump:'VP',cylinder:'CYL',singleCylinder:'SC',relief:'RV',flowControl:'FC',valve43:'DCV',meter:'FM',gauge:'PT',motor:'M'};
 return {id,kind,label:`${prefix[kind]||kind.toUpperCase().slice(0,3)}${serial}`,x,y,p:{margin:200,referenceDrop:100,reverseCheck:true,flow:6,minStroke:10,pilotStart:0,pilotFull:500,maxPressure:3000,running:true,setting:1500,limit:6,bore:3,rod:1.5,stroke:12,load:kind==='motor'?200:4000,displacement:2,position:kind==='valve42'?1:0,center:'tandem',precharge:500,capacity:100}};
}
export function initial():State{return {ports:{},lines:{},motion:{},stroke:{},selected:{},active:{}}}
export function remove(c:Circuit,id:string):Circuit{return {components:c.components.filter(x=>x.id!==id),lines:c.lines.filter(x=>x.id!==id&&!x.from.startsWith(id+':')&&!x.to.startsWith(id+':'))}}
export function demo():Circuit{
 const items:[Kind,number,number,string][]=[['tank',140,500,'T1'],['pump',140,330,'P1'],['junction',330,330,'J1'],['relief',330,500,'RV1'],['gauge',330,170,'PT1'],['meter',500,330,'FM1'],['valve43',680,300,'DCV1'],['flowControl',590,150,'FC1'],['cylinder',750,80,'CYL1']];
 const components=items.map(([k,x,y,l])=>({...create(k,x,y),label:l})); const id=(i:number,p:string)=>components[i].id+':'+p;
 const pairs:[number,string,number,string][]=[[0,'T',1,'T'],[1,'P',2,'P'],[2,'A',5,'A'],[2,'T',3,'A'],[2,'P',4,'P'],[3,'B',0,'T'],[5,'B',6,'P'],[6,'T',0,'T'],[6,'A',7,'A'],[7,'B',8,'A'],[6,'B',8,'B']];
 return {components,lines:pairs.map(([a,p,b,q],i)=>({id:'l'+i,from:id(a,p),to:id(b,q)}))};
}
type Edge={a:string;b:string;r:number;threshold:number;cap:number;id:string;kind:string;ratio:number};
export function step(c:Circuit,old:State,dt:number):State{
 const controlled=c.components.filter(o=>o.kind==='variablePump'&&c.lines.some(l=>l.from===o.id+':X'||l.to===o.id+':X'));
 const advanced=c.components.some(o=>['shuttle','compensator','lsBypass'].includes(o.kind));
 if(!controlled.length&&!advanced)return solveStep(c,old,dt,{});
 // Solve pressure commands without advancing time; bounded relaxation also tolerates feedback loops.
 const minimum=(o:Component)=>{const value=Number(o.p.minStroke??10);return Math.max(0,Math.min(100,Number.isFinite(value)?value:10))/100};
 const strokes:Record<string,number>={};for(const o of controlled)strokes[o.id]=minimum(o);
 let signals=initial();
 for(let i=0;i<(advanced?48:32);i++){
  const snapshot=solveStep(c,old,0,strokes,signals);let error=0;
  for(const o of controlled){const pressure=snapshot.ports[o.id+':X']?.pressure||0;
   const start=Math.max(0,Number(o.p.pilotStart)||0),full=Math.max(start+1,Number(o.p.pilotFull)||500);
   const target=Math.max(minimum(o),Math.min(1,(pressure-start)/(full-start)));
   error=Math.max(error,Math.abs(target-strokes[o.id]));strokes[o.id]=(strokes[o.id]+target)/2;
  }
  if(advanced)for(const o of c.components)for(const port of ports(o.kind)){const key=o.id+':'+port.name;error=Math.max(error,Math.abs((snapshot.ports[key]?.pressure||0)-(signals.ports[key]?.pressure||0))/1000)}
  signals=snapshot;
  if(error<1e-7)break;
 }
 return solveStep(c,old,dt,strokes,signals);
}
function solveStep(c:Circuit,old:State,dt:number,strokes:Record<string,number>,signals:State=initial()):State{
 const s=initial();const edges:Edge[]=[];const tanks=new Set<string>();const pumps:Component[]=[];
 const number=(o:Component,key:string,min=0.01)=>Math.max(min,Math.min(1e6,Number.isFinite(Number(o.p[key]))?Number(o.p[key]):0));
 const add=(o:Component,a:string,b:string,r=1,threshold=0,cap=1e6,ratio=1,kind=o.kind)=>edges.push({a:o.id+':'+a,b:o.id+':'+b,r,threshold,cap,ratio,id:o.id,kind});
 for(const o of c.components){
  for(const p of ports(o.kind))s.ports[o.id+':'+p.name]={pressure:0,flow:0,color:'inactive'};
  const m=old.motion[o.id]||{position:o.kind==='singleCylinder'?0:0.25,speed:0,rpm:0,angle:0,charge:0};s.motion[o.id]={...m,speed:0,rpm:0};
  const k=o.kind;
  if(k==='tank')tanks.add(o.id+':T');
  else if(k==='pump'||k==='variablePump'){if(o.p.running)pumps.push(o)}
  else if(k==='accumulator'&&m.charge<1){tanks.add(o.id+':storage');add(o,'P','storage',100,number(o,'precharge')*(1+3*m.charge),2)}
  else if(k==='junction'){add(o,'P','A',0.01);add(o,'P','T',0.01)}
  else if(k.startsWith('valve')){
   const pos=Number(o.p.position);const center=o.p.center;
   if(k==='valve22'){if(pos!==0)add(o,'A','B');}
   else if(k==='valve32'){if(pos!==0)add(o,'P','A');else add(o,'A','T');}
   else if(pos!==0||k==='valve42'){if(pos>=0){add(o,'P','A');add(o,'B','T')}else{add(o,'P','B');add(o,'A','T')}}
   else {if(center==='tandem'||center==='open')add(o,'P','T');if(center==='float'||center==='open'){add(o,'A','T');add(o,'B','T')}}
  }else if(k==='cylinder'||k==='singleCylinder'){
   const area=Math.PI*number(o,'bore')**2/4;const ann=Math.max(area*0.05,area-Math.PI*number(o,'rod')**2/4);const pos=m.position;
   if(pos<0.999999)add(o,'A',k==='singleCylinder'?'virtual':'B',2,number(o,'load',0)/area,1e6,ann/area);
   if(k==='singleCylinder')tanks.add(o.id+':virtual');
   if(k==='cylinder'&&pos>0.000001)add(o,'B','A',2,number(o,'load',0)/ann,1e6,area/ann);
  }else if(k==='motor'){const threshold=number(o,'load',0)*2*Math.PI/number(o,'displacement');add(o,'A','B',2,threshold);add(o,'B','A',2,threshold)}
  else if(k==='shuttle'){
   const chosen=(signals.ports[o.id+':B']?.pressure||0)>(signals.ports[o.id+':A']?.pressure||0)+0.01?'B':'A';
   s.selected[o.id]=chosen;add(o,chosen,'C',0.1);
  }
  else if(k==='lsBypass')add(o,'P','T',2,(signals.ports[o.id+':X']?.pressure||0)+number(o,'margin'));
  else if(k==='compensator'){add(o,'A','B',1);if(o.p.reverseCheck)add(o,'B','A',1,3,1e6,1,'check')}
  else if(k==='compensatedFlow'){const limit=number(o,'limit',0);if(limit>0)add(o,'A','B',number(o,'margin')/Math.max(limit,0.01),0,limit)}
  else if(k==='relief')add(o,'A','B',2,number(o,'setting'));
  else if(k==='check')add(o,'A','B',1,3);
  else if(k==='reducing'){add(o,'A','B',4);}
  else if(k==='flowControl'||k==='restriction'){const limit=number(o,'limit',0);if(limit>0){const r=k==='restriction'?number(o,'referenceDrop')/limit:10,cap=k==='restriction'?1e6:limit;add(o,'A','B',r,0,cap);add(o,'B','A',r,0,cap)}}
  else if(k==='filter'||k==='meter') {add(o,'A','B',k==='filter'?4:0.1);add(o,'B','A',k==='filter'?4:0.1)}
 }
 for(const l of c.lines)if(s.ports[l.from]&&s.ports[l.to]){edges.push({a:l.from,b:l.to,r:0.1,threshold:0,cap:1e6,ratio:1,id:l.id,kind:'line'});edges.push({a:l.to,b:l.from,r:0.1,threshold:0,cap:1e6,ratio:1,id:l.id,kind:'line'})}
 // Bidirectional passive junctions and spool passages. Loads and check valves are explicitly directed.
 for(const e of [...edges])if(['junction','valve22','valve32','valve42','valve43'].includes(e.kind))edges.push({...e,a:e.b,b:e.a});
 const adj=new Map<string,Edge[]>();for(const e of edges)adj.set(e.a,[...(adj.get(e.a)||[]),e]);
 type Path={edges:Edge[];r:number;threshold:number;cap:number};
 function paths(start:string):Path[]{const result:Path[]=[];let visits=0;function visit(node:string,list:Edge[],seen:Set<string>,r:number,t:number,cap:number,ratio:number){if(++visits>4000||result.length>=128||list.length>c.components.length*3+4)return;if(tanks.has(node)){let limit=cap;
    list.forEach((e,i)=>{if(e.kind==='reducing'||e.kind==='compensator'){const o=c.components.find(o=>o.id===e.id)!;let resistance=0,load=0,ratio=1;for(const after of list.slice(i+1)){resistance+=after.r*ratio;load+=after.threshold;ratio*=after.ratio}limit=Math.min(limit,Math.max(0,((e.kind==='compensator'?(signals.ports[o.id+':X']?.pressure||0)+number(o,'margin'):number(o,'setting'))-load)/Math.max(0.1,resistance)))}});
    result.push({edges:list,r:Math.max(0.1,r),threshold:t,cap:limit});return}for(const e of adj.get(node)||[]){if(seen.has(e.b))continue;visit(e.b,[...list,e],new Set([...seen,e.b]),r+e.r*ratio,t+e.threshold,Math.min(cap,e.cap/ratio),ratio*e.ratio)}}visit(start,[],new Set([start]),0,0,1e6,1);return result}
 function solve(start:string,available:number,max:number){
  const ps=paths(start);const amounts=(p:number)=>{
   const qs=ps.map(path=>Math.min(path.cap,Math.max(0,(p-path.threshold)/path.r)));
   // Shared flow controls impose one capacity across every route that uses them.
   const limited=new Map<string,{cap:number;uses:[number,number][]}>();
   ps.forEach((path,i)=>{let ratio=1;for(const e of path.edges){if(e.cap<1e6){const key=e.id+':'+e.a;const v=limited.get(key)||{cap:e.cap,uses:[]};v.uses.push([i,ratio]);limited.set(key,v)}ratio*=e.ratio}});
   for(const {cap,uses} of limited.values()){const total=uses.reduce((sum,[i,ratio])=>sum+qs[i]*ratio,0);if(total>cap)for(const [i] of uses)qs[i]*=cap/total}
   return qs;
  };
  const demand=(p:number)=>amounts(p).reduce((sum,q)=>sum+q,0);
  let lo=0,hi=max;for(let i=0;i<50;i++){const mid=(lo+hi)/2;if(demand(mid)>=available-1e-9)hi=mid;else lo=mid}const pressure=(lo+hi)/2;
  // Static supply pressure also reaches taps and blocked terminals, without crossing loads or relief seats.
  const visited=new Set<string>();function staticPressure(n:string,p:number){if(visited.has(n)||tanks.has(n))return;visited.add(n);if(s.ports[n])s.ports[n].pressure=Math.max(s.ports[n].pressure,p);for(const e of adj.get(n)||[])if(e.threshold===0&&!['cylinder','singleCylinder','motor','relief','lsBypass','shuttle'].includes(e.kind)){const o=['reducing','compensator'].includes(e.kind)?c.components.find(o=>o.id===e.id):undefined;staticPressure(e.b,o?Math.min(p,o.kind==='compensator'?(signals.ports[o.id+':X']?.pressure||0)+number(o,'margin'):number(o,'setting')):p)}}staticPressure(start,pressure);
  const qs=amounts(pressure);for(const [index,path] of ps.entries()){const q=qs[index];if(q<1e-7)continue;let p=pressure,f=q;let returning=false;const working=path.edges.some(e=>['cylinder','singleCylinder','motor','relief','lsBypass','accumulator'].includes(e.kind));let excess=Math.max(0,pressure-path.threshold-q*path.r);
   for(const e of path.edges){let drop=e.threshold+f*e.r;if(['flowControl','restriction','reducing','compensator','compensatedFlow'].includes(e.kind)){drop+=excess;excess=0}const next=Math.max(0,p-drop);if(s.ports[e.a])s.ports[e.a].pressure=Math.max(0,p);if(s.ports[e.b])s.ports[e.b].pressure=next;
    if(e.kind==='line'){const l=c.lines.find(l=>l.id===e.id)!;const sign=l.from===e.a?1:-1;const read=s.lines[e.id]||{pressure:0,flow:0,color:'inactive'};read.flow+=f*sign;read.pressure=Math.max(read.pressure,(p+next)/2);read.color=returning?'return':working?'pressure':'inactive';s.lines[e.id]=read;}
    else {if(['cylinder','singleCylinder','motor','relief','lsBypass'].includes(e.kind))returning=true;s.active[e.id]=true;const o=c.components.find(o=>o.id===e.id)!;const m=s.motion[e.id];if(e.kind==='accumulator')m.charge=Math.min(1,m.charge+f*231/60*dt/number(o,'capacity'));if(e.kind==='cylinder'||e.kind==='singleCylinder'){const area=Math.PI*number(o,'bore')**2/4;const ann=Math.max(area*0.05,area-Math.PI*number(o,'rod')**2/4);m.speed+=(e.a.endsWith(':A')?1:-1)*f*231/60/(e.a.endsWith(':A')?area:ann)}if(e.kind==='motor')m.rpm+=(e.a.endsWith(':A')?1:-1)*f*231/number(o,'displacement');}
    if(s.ports[e.a])s.ports[e.a].flow+=f;if(s.ports[e.b])s.ports[e.b].flow-=f*e.ratio;p=next;f*=e.ratio;
   }
  }return {pressure,flow:Math.min(available,demand(pressure))};
 }
 for(const pump of pumps){const stroke=pump.kind==='variablePump'?(strokes[pump.id]??1):1;s.stroke[pump.id]=stroke;if(stroke<1e-8||number(pump,'flow',0)===0)continue;const start=pump.id+':P';const suction=paths(pump.id+':T');if(!suction.length)continue;const result=solve(start,number(pump,'flow',0)*stroke,number(pump,'maxPressure'));s.active[pump.id]=true;for(const e of suction[0].edges)if(e.kind==='line'){const l=c.lines.find(l=>l.id===e.id)!;s.lines[e.id]={pressure:0,flow:result.flow*(l.from===e.a?-1:1),color:'suction'}}}
 // A finite-volume accumulator charges from its node, and becomes a temporary pressure source when supply falls.
 for(const o of c.components.filter(o=>o.kind==='accumulator')){const m=s.motion[o.id],node=o.id+':P';const pre=number(o,'precharge');const stored=pre*(1+3*m.charge);const p=s.ports[node].pressure;const capacity=number(o,'capacity');if(p<stored&&m.charge>0&&dt>0){const available=Math.min(2,m.charge*capacity*60/231/Math.max(dt,0.001));const result=solve(node,available,stored);m.charge=Math.max(0,m.charge-result.flow*231/60*dt/capacity)}s.active[o.id]=m.charge>0;}
 for(const o of c.components){const m=s.motion[o.id];if(o.kind==='singleCylinder'&&m.speed===0&&m.position>0&&s.ports[o.id+':A'].pressure<1&&number(o,'load',0)>0){const area=Math.PI*number(o,'bore')**2/4;const returned=solve(o.id+':A',area*0.5*60/231,number(o,'load',0)/area);m.speed=-returned.flow*231/60/area;}
  const stroke=number(o,'stroke');m.position=Math.max(0,Math.min(1,m.position+m.speed*dt/stroke));if((m.position===1&&m.speed>0)||(m.position===0&&m.speed<0))m.speed=0;m.angle=(m.angle+m.rpm*6*dt)%360;
 }
 // Resolve pilot taps through hoses and shuttles after working pressures have been calculated.
 function signalPressure(key:string,seen=new Set<string>()):number{
  if(seen.has(key))return 0;const next=new Set([...seen,key]);
  const [id,port]=key.split(':');const o=c.components.find(o=>o.id===id);if(!o)return 0;
  if(o.kind==='tank')return 0;
  if(o.kind==='shuttle'&&port==='C')return Math.max(signalPressure(id+':A',next),signalPressure(id+':B',next));
  const peers=c.lines.flatMap(l=>l.from===key?[l.to]:l.to===key?[l.from]:[]);
  if(o.kind==='junction')peers.push(...ports(o.kind).filter(p=>p.name!==port).map(p=>id+':'+p.name));
  const terminal=port!=='X'&&!['shuttle','gauge','junction','cap'].includes(o.kind);
  if(terminal)return s.ports[key]?.pressure||0;
  return Math.max(0,...peers.map(p=>signalPressure(p,next)));
 }
 for(const o of c.components)for(const p of ports(o.kind))if(p.name==='X'||o.kind==='shuttle'||o.kind==='gauge'){
  const key=o.id+':'+p.name;s.ports[key].pressure=signalPressure(key);
 }
 for(const o of c.components.filter(o=>o.kind==='shuttle'))s.active[o.id]=s.ports[o.id+':C'].pressure>1;
 for(const l of c.lines){const a=s.ports[l.from],b=s.ports[l.to];const r=s.lines[l.id]||{pressure:Math.max(a?.pressure||0,b?.pressure||0),flow:0,color:'inactive'};
  if(r.color!=='suction'){r.color=Math.abs(r.flow)>0.001?(r.color==='return'?'return':r.color==='pressure'?'pressure':r.pressure>80?'pressure':'return'):(r.pressure>1?'pressure':'inactive');const source=r.flow>=0?l.from:l.to;const comp=c.components.find(o=>source.startsWith(o.id+':'));if(comp&&['flowControl','restriction','compensatedFlow','compensator'].includes(comp.kind)&&Math.abs(r.flow)>0.001)r.color='metered';if(comp?.kind==='reducing'&&Math.abs(r.flow)>0.001){r.color='reduced';} }
  if(isPilotLine(c,l)){r.pressure=Math.max(a?.pressure||0,b?.pressure||0);if(r.pressure>1)r.color='reduced';}
  s.lines[l.id]=r;
 }return s;
}

export function isPilotLine(c:Circuit,l:Line):boolean{
 if(l.from.endsWith(':X')||l.to.endsWith(':X'))return true;
 // Follow the signal branch through shuttle valves so the whole LS network is dashed.
 const seen=new Set<string>();const queue=[l.from,l.to];
 while(queue.length){const key=queue.pop()!;if(seen.has(key))continue;seen.add(key);if(key.endsWith(':X'))return true;
  const o=c.components.find(o=>key.startsWith(o.id+':'));if(o?.kind==='shuttle')queue.push(...ports(o.kind).map(p=>o.id+':'+p.name));
  if(o?.kind==='shuttle'||o?.kind==='gauge')for(const hose of c.lines){if(hose.from===key)queue.push(hose.to);if(hose.to===key)queue.push(hose.from)}
 }
 return false;
}

export function loadSensingDemo():Circuit{
 const c=demo();const find=(kind:Kind)=>c.components.find(o=>o.kind===kind)!;
 const pump=find('pump'),v=find('valve43'),cy=find('cylinder'),fc=find('flowControl'),tank=find('tank'),j=find('junction');
 // Keep enough minimum output for 3 GPM metering plus bypass flow and passage losses.
 pump.kind='variablePump';pump.label='VP1';pump.p.flow=8;pump.p.minStroke=75;v.p.center='closed';fc.kind='restriction';fc.label='OR1';fc.p.limit=3;fc.p.referenceDrop=200;fc.x=660;fc.y=140;cy.x=820;
 const pc={...create('compensator',490,140),label:'PC1'},sh={...create('shuttle',820,490),label:'SH1'},ls={...create('lsBypass',530,510),label:'LS1'};
 c.components.push(pc,sh,ls);c.lines=c.lines.filter(l=>!(l.from===v.id+':A'&&l.to===fc.id+':A'));
 const pairs:[Component,string,Component,string][]=[[v,'A',pc,'A'],[pc,'B',fc,'A'],[cy,'A',pc,'X'],[cy,'A',sh,'A'],[cy,'B',sh,'B'],[sh,'C',ls,'X'],[j,'P',ls,'P'],[ls,'T',tank,'T'],[sh,'C',pump,'X']];
 c.lines.push(...pairs.map(([a,p,b,q],i)=>({id:'ls'+i,from:a.id+':'+p,to:b.id+':'+q})));
 return c;
}
