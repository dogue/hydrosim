import {Component, State, fmt} from './model';
import type {SVGProps} from 'react';
import {annotationBounds,inversePoint} from './layout';

function UprightText({o,x=0,y=0,internal=false,...props}:SVGProps<SVGTextElement>&{o:Component;internal?:boolean}) {
 if(!internal){const anchor=inversePoint(o,{x:0,y:annotationBounds(o,symbolBounds(o)).bottom+20});x=anchor.x;y=anchor.y;}
 return <text {...props} x={x} y={y} transform={`translate(${x},${y}) scale(${o.flipX?-1:1},${o.flipY?-1:1}) rotate(${-(o.rotation||0)}) translate(${-Number(x)},${-Number(y)})`}/>;
}

const paper = '#f8fafc';
const arrow = (x1:number, y1:number, x2:number, y2:number) =>
  <path d={`M${x1} ${y1}L${x2} ${y2}`} markerEnd="url(#arrow)"/>;
const blocked = (x:number, side:'top'|'bottom') => {
  const edge = side === 'top' ? -23 : 23;
  const end = side === 'top' ? -12 : 12;
  return <path d={`M${x} ${edge}V${end}M${x-6} ${end}H${x+6}`}/>;
};

function valveIndex(o:Component) {
  const pos = Number(o.p.position);
  if(o.kind === 'valve43') return Math.max(0, Math.min(2, pos+1));
  if(o.kind === 'valve42') return pos < 0 ? 0 : 1;
  return pos === 0 ? 0 : 1;
}

// Symbols may extend beyond the active box when another spool position is selected.
export function symbolBounds(o:Component) {
  if(o.kind.startsWith('valve')) {
    const count = o.kind === 'valve43' ? 3 : 2;
    const left = -20-valveIndex(o)*40;
    const right = left+count*40;
    return {x:left-31, y:-38, width:right-left+40, height:76};
  }
  if(['relief','reducing'].includes(o.kind))return {x:-62,y:-55,width:124,height:92};
  if(['compensator','lsBypass'].includes(o.kind))return {x:-62,y:-38,width:124,height:82};
  if(o.kind==='shuttle')return {x:-52,y:-42,width:104,height:74};
  if(o.kind==='variablePump')return {x:-62,y:-74,width:124,height:106};
  if(o.kind === 'cylinder' || o.kind === 'singleCylinder') {
    return {x:-62, y:-32, width:190, height:64};
  }
  return {x:-62, y:-32, width:124, height:64};
}

function DirectionalValve({o}:{o:Component}) {
  const k = o.kind;
  const index = valveIndex(o);
  const count = k === 'valve43' ? 3 : 2;
  const left = -20-index*40;
  const right = left+count*40;
  const state = k === 'valve22' ? index ? 'OPEN' : 'CLOSED'
    : k === 'valve32' ? index ? 'SUPPLY' : 'RETURN'
    : k === 'valve43' && index === 1 ? String(o.p.center).toUpperCase()
    : Number(o.p.position) < 0 ? 'RETRACT' : 'EXTEND';
  return <>
    <title>Manual directional valve. Highlighted position is aligned with the connected ports.</title>
    {Array.from({length:count}, (_,i) => {
      const x = (i-index)*40;
      let passage;
      if(k === 'valve22') {
        passage = i === 0 ? <>{blocked(0,'top')}{blocked(0,'bottom')}</> : arrow(0,-23,0,23);
      } else if(k === 'valve32') {
        passage = i === 0
          ? <>{arrow(-10,-23,10,23)}{blocked(-10,'bottom')}</>
          : <>{arrow(-10,23,-10,-23)}{blocked(10,'bottom')}</>;
      } else if(k === 'valve43' && i === 1) {
        switch(o.p.center) {
          case 'tandem': passage = <>{blocked(-10,'top')}{blocked(10,'top')}<path d="M-10 23V3H10V23" markerEnd="url(#arrow)"/></>; break;
          case 'open': passage = <><path d="M-10 -23V23M10 -23V23M-10 0H10"/><circle cx="-10" r="2.3" fill="currentColor"/><circle cx="10" r="2.3" fill="currentColor"/></>; break;
          case 'float': passage = <>{blocked(-10,'bottom')}<path d="M-10 -23V-3H10M10 -23V23"/><circle cx="10" cy="-3" r="2.3" fill="currentColor"/></>; break;
          default: passage = <>{blocked(-10,'top')}{blocked(10,'top')}{blocked(-10,'bottom')}{blocked(10,'bottom')}</>;
        }
      } else {
        // Retract: P→B, A→T. Extend: P→A, B→T. Crossed paths have no junction dot.
        passage = i === 0
          ? <>{arrow(-10,23,10,-23)}{arrow(-10,-23,10,23)}</>
          : <>{arrow(-10,23,-10,-23)}{arrow(10,-23,10,23)}</>;
      }
      return <g key={i} transform={`translate(${x},0)`} data-spool-position={i} data-active={i===index}>
        <rect x="-20" y="-23" width="40" height="46" fill={i===index?'#dce9f7':paper}/>
        {passage}
      </g>;
    })}
    {k === 'valve22' ? <path d="M0 -35V-23M0 23V35"/> : <>
      <path d="M-30 -35V-29H-10V-23M-30 35V29H-10V23M30 35V29H10V23"/>
      {k !== 'valve32' && <path d="M30 -35V-29H10V-23"/>}
    </>}
    {/* A manual lever rather than spring-return actuators: controls retain their selected position. */}
    <g data-symbol-part="manual-lever"><path d={`M${left} 0H${left-9}L${left-22} -18`}/><circle cx={left-22} cy="-18" r="3" fill="currentColor"/></g>
    <path d={`M${right} 0H${right+7}`}/>
    <UprightText o={o} y="58">{state}</UprightText>
  </>;
}

function PressureValve({o, active}:{o:Component;active:boolean}) {
  const reducing = o.kind === 'reducing';
  const sense = reducing ? 32 : -32;
  return <>
    <title>{reducing?'Normally open; downstream pressure B controls closing.':'Normally closed; upstream pressure A controls opening.'}</title>
    <path d="M-45 0H-20M20 0H45"/>
    <rect x="-20" y="-20" width="40" height="40" fill={active?'#fff0db':paper}/>
    {/* The reducing valve is open in its normal position; the relief passage is offset until it opens. */}
    {arrow(-14, reducing || active ? 0 : 9, 14, reducing || active ? 0 : 9)}
    <g data-symbol-part="adjustable-spring">
      <path d="M0 -20V-27L-6 -30L6 -34L-6 -38L6 -42L0 -45V-51"/>
      {arrow(-13,-27,13,-49)}
    </g>
    <path data-symbol-part="pressure-pilot" data-sensed-port={reducing?'B':'A'}
      d={`M${sense} 0V32H0V20`} strokeDasharray="4 3"/>
    <circle cx={sense} r="2.5" fill="currentColor" stroke="none"/>
    <UprightText o={o} y="53">{active&&!reducing?'RELIEVING · ':''}{fmt(Number(o.p.setting))} PSI</UprightText>
  </>;
}

export function Symbol({o,s}:{o:Component;s:State}) {
  const k=o.kind, m=s.motion[o.id], active=Boolean(s.active[o.id]);
  let body;
  if(k==='tank') body=<><path d="M-32 -25V15H32V-25M0 -30V-5M-24 5H24"/><UprightText o={o} y="38">0.0 PSI</UprightText></>;
  else if(k==='pump'||k==='variablePump'||k==='motor') body=<>
    <path d="M-45 0H-26M26 0H45"/><circle r="26" fill={paper}/>
    {k==='motor' ? <g data-symbol-part="motor-triangles" fill="currentColor"><path d="M23 -8L10 0L23 8ZM-23 -8L-10 0L-23 8Z"/></g> : <path d="M7 -10L22 0L7 10Z" fill="currentColor"/>}
    {k==='variablePump'&&<><path data-symbol-part="pump-pilot" d="M0 -70V-58" strokeDasharray="4 3"/><rect x="-12" y="-58" width="24" height="18" fill={paper}/><path d="M-12 -52L0 -42L12 -52M0 -40V-28"/>{arrow(-28,28,28,-28)}</>}
    {k==='motor' ? <g transform={`rotate(${m?.angle||0})`}><path d="M-6 0H6M0 -6V6"/></g> : <circle cx="-10" r="4" fill={active?'#289967':'#9ba5b0'} stroke="none"/>}
    <UprightText o={o} y="49">{k==='motor'?`${fmt(m?.rpm||0)} RPM`:o.p.running?k==='variablePump'?`${fmt((s.stroke[o.id]||0)*100)}% STROKE`:'RUNNING':'STOPPED'}</UprightText>
  </>;
  else if(k==='cylinder'||k==='singleCylinder') {
    const x=-32+(m?.position??(k==='singleCylinder'?0:0.25))*64;
    body=<>
      <rect x="-50" y="-24" width="100" height="44" fill={paper} stroke="none"/>
      <path d="M50 -3V-24H-50V20H50V3M-40 30V20"/>
      {k==='cylinder'&&<path d="M40 30V20"/>}
      <path data-symbol-part="piston" d={`M${x} -22V18`} strokeWidth="3"/>
      <path data-symbol-part="rod" d={`M${x} -3H${x+92}V3H${x}`} strokeWidth="2.2"/>
      <UprightText o={o} y="51">{fmt((m?.position||0)*Number(o.p.stroke))} in</UprightText>
    </>;
  } else if(k.startsWith('valve')) body=<DirectionalValve o={o}/>;
  else if(k==='relief'||k==='reducing') body=<PressureValve o={o} active={active}/>;
  else if(k==='gauge') body=<><circle cy="-5" r="23" fill={paper}/><path d="M0 18V30"/>{arrow(0,-5,12,-19)}<circle cy="-5" r="2" fill="currentColor"/><UprightText o={o} y="-42">{fmt(s.ports[o.id+':P']?.pressure||0)} PSI</UprightText></>;
  else if(k==='accumulator') body=<>
    <rect x="-21" y="-29" width="42" height="50" rx="20" fill={paper}/>
    <rect x="-14" y={15-(m?.charge||0)*17} width="28" height={(m?.charge||0)*17} fill="#dc4144" stroke="none"/>
    <path d="M-21 -5H21M0 21V30"/><UprightText o={o} internal y="-12">N₂</UprightText>
  </>;
  else if(k==='junction') body=<><path d="M-40 0H40M0 0V30"/><circle r="5" fill="currentColor"/></>;
  else if(k==='cap') body=<path d="M0 30V0M-14 0H14M-14 -5H14"/>;
  else if(k==='meter') body=<><path d="M-45 0H-23M23 0H45"/><circle r="23" fill={paper}/><path d="M-13 -9L0 9L13 -9ZM-10 0H10"/></>;
  else if(k==='check') body=<>
    <path d="M-45 0H-7.3"/>
    <path data-symbol-part="check-seat" d="M4.7 -12L-7.3 0L4.7 12"/>
    <circle data-symbol-part="check-ball" cx={active?10:4} r="8" fill={active?'#dce9f7':paper}/>
    <path d={`M${active?18:12} 0H21L24 -5L28 5L32 -5L36 5L39 0H45`}/>
  </>;
  else if(k==='shuttle')body=<>
    <title>Higher pressure A or B connects to C; the ball seals the lower-pressure inlet.</title>
    <rect x="-28" y="-18" width="56" height="36" fill={paper}/>
    <path d="M-45 0H-22M22 0H45M0 -40V-18M-12 -10L-22 0L-12 10M12 -10L22 0L12 10"/>
    <circle data-symbol-part="shuttle-ball" cx={s.selected[o.id]==='B'?-12:12} r="7" fill={paper}/>
    <UprightText o={o} y="48">{s.selected[o.id]||'A'} → C</UprightText>
  </>;
  else if(k==='compensator'||k==='lsBypass')body=<>
    <title>{k==='compensator'?'Two-way regulator senses B against external X plus spring margin; optional reverse check.':'Three-way system bypass opens P to T above external load signal X plus spring margin.'}</title>
    <path d="M-45 0H-20M20 0H45"/><rect x="-20" y="-20" width="40" height="40" fill={paper}/>
    {arrow(-12,k==='lsBypass'&&!active?9:0,12,k==='lsBypass'&&!active?9:0)}
    <path data-symbol-part="compensation-feedback" d={k==='compensator'?'M32 0V-32H0V-20':'M-32 0V-32H0V-20'} strokeDasharray="4 3"/>
    <path data-symbol-part="external-load-pilot" d={k==='compensator'?'M-12 40V20':'M0 40V20'} strokeDasharray="4 3"/>
    <path d="M20 -14H24L27 -18L30 -10L33 -18L36 -10L39 -14H43"/>
    {k==='compensator'&&Boolean(o.p.reverseCheck)&&<g data-symbol-part="reverse-check"><path d="M-32 0V29H-9M7 29H32V0M-1 23L5 29L-1 35"/><circle cx="-3" cy="29" r="4" fill={paper}/></g>}
    <UprightText o={o} y="60">{k==='lsBypass'&&active?'BYPASS · ':''}{fmt(Number(o.p.margin))} PSI margin</UprightText>
  </>;
  else if(k==='compensatedFlow')body=<>
    <title>Adjustable metering orifice with a pressure compensator; A to B regulated flow.</title>
    <rect x="-32" y="-23" width="64" height="46" fill={paper}/><path d="M-45 0H-21M-9 0H4M24 0H45M-21 -10Q-5 0 -21 10M-9 -10Q-25 0 -9 10"/>
    {arrow(-27,18,-3,-18)}<rect x="4" y="-12" width="20" height="24" fill={paper}/>{arrow(7,0,21,0)}
    <path d="M28 0V18H14V12M-1 0V-18H14V-12" strokeDasharray="3 3"/>
    <UprightText o={o} y="47">{fmt(Number(o.p.limit))} GPM regulated</UprightText>
  </>;
  else if(k==='filter') body=<><path d="M-45 0H-25M25 0H45"/><path d="M0 -25L25 0L0 25L-25 0Z" fill={paper}/><path d="M0 -25V25" strokeDasharray="3 3"/></>;
  else if(k==='flowControl'||k==='restriction') body=<><path d="M-45 0H-8M8 0H45M-14 -14Q8 0 -14 14M14 -14Q-8 0 14 14"/>{k==='flowControl'&&arrow(-24,23,24,-23)}<UprightText o={o} y="47">{fmt(Number(o.p.limit))} GPM {k==='restriction'?'nominal':'limit'}</UprightText></>;
  return <g className="symbol" style={{color:'#263543'}} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round">{body}</g>;
}
