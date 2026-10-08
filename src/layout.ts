import {ports,type Component} from './model';

export function orientation(o:Component) {
 return `rotate(${o.rotation||0}) scale(${o.flipX?-1:1},${o.flipY?-1:1})`;
}

export function transformPoint(o:Component,p:{x:number;y:number}) {
 const angle=(o.rotation||0)*Math.PI/180;
 const cos=Math.round(Math.cos(angle)),sin=Math.round(Math.sin(angle));
 const x=p.x*(o.flipX?-1:1),y=p.y*(o.flipY?-1:1);
 return {x:cos*x-sin*y,y:sin*x+cos*y};
}

export function placedPort(o:Component,p:{x:number;y:number;name:string}) {
 const normal=transformPoint(o,{x:Math.abs(p.y)>=30?0:Math.sign(p.x),y:Math.abs(p.y)>=30?Math.sign(p.y):0});
 return {...p,...transformPoint(o,p),nx:normal.x,ny:normal.y};
}

export function transformedBounds(o:Component,b:{x:number;y:number;width:number;height:number}) {
 const corners=[{x:b.x,y:b.y},{x:b.x+b.width,y:b.y},{x:b.x,y:b.y+b.height},{x:b.x+b.width,y:b.y+b.height}].map(p=>transformPoint(o,p));
 const x=Math.min(...corners.map(p=>p.x)),y=Math.min(...corners.map(p=>p.y));
 return {x,y,width:Math.max(...corners.map(p=>p.x))-x,height:Math.max(...corners.map(p=>p.y))-y};
}

// Reserve space for upright port names as well as the transformed symbol.
export function annotationBounds(o:Component,b:{x:number;y:number;width:number;height:number}) {
 const box=transformedBounds(o,b),ps=ports(o.kind).map(p=>placedPort(o,p));
 return {top:Math.min(box.y,...ps.map(p=>p.y-22)),bottom:Math.max(box.y+box.height,...ps.map(p=>p.y+22))};
}

export function inversePoint(o:Component,p:{x:number;y:number}) {
 const rotated=transformPoint({ ...o,rotation:-(o.rotation||0),flipX:false,flipY:false },p);
 return {x:rotated.x*(o.flipX?-1:1),y:rotated.y*(o.flipY?-1:1)};
}
