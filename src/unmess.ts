export const HOLE_NONE = 0;
export const HOLE_AGGRESSIVE = 1;
export const HOLE_NONZERO = 2;
export const HOLE_EVENODD = 3;

type Pt = [number,number];
type Vtx = {
  xy:Pt,
  isects: Isect[],
  isects_map:Record<number,Isect>,
};
type Isect = {
  other:number,
  t:number,
  s:number,
  xy:Pt,
  side:number,
};
interface Trace_ret {
  poly:Pt[],
  used:Record<number,boolean>;
  used_isects:Record<string,boolean>;
  used_edges:Record<string,boolean>;
}


function disturb(poly:Pt[],epsilon:number=0.0001){
  for (let j = 0; j < poly.length; j++){
    poly[j][0] += (Math.random()*2-1)*epsilon;
    poly[j][1] += (Math.random()*2-1)*epsilon;
  }
}

function seg_isect(
  p0x:number, p0y:number, p1x:number, p1y:number, 
  q0x:number, q0y:number, q1x:number, q1y:number, 
  is_ray:boolean=false) : Isect{

  let d0x = ((p1x) - (p0x));
  let d0y = ((p1y) - (p0y));
  let d1x = ((q1x) - (q0x));
  let d1y = ((q1y) - (q0y));
  let vc = ((((d0x) * (d1y))) - (((d0y) * (d1x))));
  if ((vc) == (0)) {
    return null;
  }
  let vcn = ((vc) * (vc));
  let q0x_p0x = (q0x) - (p0x);
  let q0y_p0y = (q0y) - (p0y);
  let vc_vcn = vc/vcn;
  let t = ((((((((q0x_p0x)) * (d1y))) )) - ((((((q0y_p0y)) * (d1x))) )))) * vc_vcn;
  let s = ((((((((q0x_p0x)) * (d0y))) )) - ((((((q0y_p0y)) * (d0x))) )))) * vc_vcn;
  if (0 <= t && (is_ray || t < 1) && 0 <= s && s < 1){
    let ret : Isect = {t,s,side:null,other:null,xy:null};
    ret.xy = [p1x * t + p0x * (1-t), p1y * t + p0y * (1-t)];
    ret.side = pt_in_pl(p0x,p0y,p1x,p1y,q0x,q0y) < 0 ? 1 : -1;
    return ret;
  }
  return null;
}

function pt_in_pl(x:number,y:number,x0:number,y0:number,x1:number,y1:number) {
  let dx = x1-x0;
  let dy = y1-y0;
  let e  = (x-x0)*dy-(y-y0)*dx;
  return e;
}

function build_vertices(poly:[number,number][]):Vtx[]{
  let out : Vtx[] = [];
  let n = poly.length;
  for (let i = 0; i < n; i++){
    let p : Vtx = {xy:poly[i],isects:[],isects_map:{}}
    let i1 = (i+1+n)%n;
    let a = poly[i];
    let b = poly[i1];
    for (let j = 0; j < n; j++){
      let j1 = (j+1+n)%n;
      if (i == j || i == j1 || i1 == j || i1 == j1){
        continue;
      }
      let c = poly[j];
      let d = poly[j1];
      let xx : Isect;
      if (out[j]){
        let ox = out[j].isects_map[i];
        if (ox){
          xx = {
            t:ox.s,
            s:ox.t,
            xy:ox.xy,
            other:null,
            side:pt_in_pl(...a,...b,...c) < 0 ? 1 : -1,
          }
        }
      }else{
        xx = seg_isect(...a,...b,...c,...d);
      }
      if (xx){
        xx.other = j;
        p.isects.push(xx);
        p.isects_map[j] = xx;
      }
    }
    p.isects.sort((a,b)=>a.t-b.t);
    out.push(p);
  }
  return out;
}

function mirror_isects(verts: Vtx[]) : Record<string,[number,number]>{
  let imap : Record<string,[number,number]> = {};
  let n = verts.length;
  for (let i = 0; i < n; i++){
    for (let j = 0; j < verts[i].isects.length; j++){
      let id = pair_key(i,j);

      let k = verts[i].isects[j].other;
      let z = verts[k].isects.findIndex(x=>x.other==i);

      imap[id] = [k,z];
    }
  }
  return imap;
}


function poly_area(poly:Pt[]){
  var n = poly.length;
  var a = 0.0;
  for(var p=n-1,q=0; q<n; p=q++) {
    a += poly[p][0] * poly[q][1] - poly[q][0] * poly[p][1];
  }
  return a * 0.5;
}

function check_concavity(poly:Pt[],idx:number){
  let n = poly.length;
  let a = poly[(idx-1+n)%n];
  let b = poly[idx];
  let c = poly[(idx+1)%n];
  let cw = pt_in_pl(...a,...b,...c) < 0 ? 1 : -1;
  return cw;
}

function ray_isect_poly(x0:number,y0:number,x1:number,y1:number,poly:Pt[]){
  let n = poly.length;
  let isects : Isect[] = [];
  for (let i = 0; i < poly.length; i++){
    let a = poly[i];
    let b = poly[(i+1)%n];
    let xx = seg_isect(x0,y0,x1,y1,...a,...b,true);
    
    if (xx){
      isects.push(xx);
    }
  }
  isects.sort((a,b)=>a.t-b.t);
  return isects;
}


function poly_is_hole(hole:Pt[],poly:Pt[],verify_winding:boolean=true,eps:number=0.0001){

  let ar = poly_area(hole);
  hole = ar > 0 ? hole.slice().reverse() : hole.slice();
  
  let i : number;
  for (i = 0; i < hole.length; i++){
    if (check_concavity(hole,i) < 0){
      break;
    }
  }
  if (i >= hole.length){
    return false;
  }
  let a = hole[(i-1+hole.length)%hole.length];
  let b = hole[i];
  let c = hole[(i+1)%hole.length];
  let m = [a[0]*0.5 + c[0]*0.5,  a[1]*0.5 + c[1]*0.5];
  
  let dx = m[0]-b[0];
  let dy = m[1]-b[1];
  let l = Math.sqrt(dx*dx+dy*dy);
  let ux = b[0]+dx/l*eps;
  let uy = b[1]+dy/l*eps;

  let isects : Isect[] = ray_isect_poly(ux,uy,m[0],m[1],poly);
  
  let ok = (isects.length % 2) == 0;
  
  if (verify_winding && ok){
    //https://en.wikipedia.org/wiki/Nonzero-rule
    let wind = 0;
    for (let j = 0; j <isects.length; j++){
      wind += isects[j].side;
    }
    ok = ok && (wind == 0);
  }
  return ok;
}

function pair_key(i:number,j:number){
  return i+','+j;
}

function quad_key(i:number,j:number,k:number,z:number){
  return i+','+j+','+k+','+z;
}


export function unmess(poly:Pt[],args:Record<any,any> ={}){
  args.disturb    ??= 0.0001;
  args.epsilon    ??= 0.0001;
  args.hole_policy??= HOLE_AGGRESSIVE;

  if (poly.length <= 3){
    return [poly];
  }
  if (args.disturb){
    disturb(poly,args.disturb);
  }

  let verts : Vtx[] = build_vertices(poly);
  let isect_mir : Record<string,[number,number]> = mirror_isects(verts);

  let n = poly.length;
  let used = {}; //set doesn't have union wtf
  let used_isects = {};
  let used_edges = {};
  
  function trace_outline(i0:number,j0:number,dir:number,is_outline:boolean,force_no_backturn:boolean=false) : Trace_ret{
    let local_used = {};
    let local_used_isects = {};
    let local_used_edges = {};
    let zero : [number, number] = null;
    let out : Pt[] = [];
    
    function trace_from(i0:number,j0:number,dir:number,prev:[number,number]) : boolean{
      // console.log(i0,j0,dir);

      if (zero == null){
        zero = [i0,j0];
      }else if (i0 == zero[0] && j0 == zero[1]){
        return true;
      }else if (zero[1] != -1 && j0 != -1){
        let q = verts[i0].isects[j0];
        if (q){
          let k = q.other;
          let z = verts[k].isects.findIndex(x=>x.other==i0);
          if (k == zero[0] && z == zero[1]){
            return true;
          }
        }
      }

      if (args.hole_policy != HOLE_AGGRESSIVE && prev){
        let edge_id = quad_key(...prev,i0,j0);
        if (used_edges[edge_id]){
          return false;
        }
        local_used_edges[edge_id] = true;
      }
      
      let p = verts[i0];
      let i1 = (i0+dir+n)%n;
      

      if (j0 == -1){
        if (args.hole_policy != HOLE_EVENODD && (!is_outline && (used[i0] || local_used[i0]))){
          return false;
        }
        local_used[i0] = true;
        out.push(p.xy);
        
        if (dir < 0){
          return trace_from(i1,verts[i1].isects.length-1,dir,[i0,j0]);
        }else if (!verts[i0].isects.length){
          return trace_from(i1,-1,dir,[i0,j0]);
        }else{
          return trace_from(i0,0,dir,[i0,j0]);
        }
      }else if (j0 >= p.isects.length){
        return trace_from(i1,-1,dir,[i0,j0]);
      }else{
        let id = pair_key(i0,j0);
        if (args.hole_policy == HOLE_AGGRESSIVE && !is_outline && (used_isects[id] || local_used_isects[id])){
          return false;
        }
        local_used_isects[id] = true;
        out.push(p.isects[j0].xy);

        let q = p.isects[j0];
        let [k,z] = isect_mir[id];

        local_used_isects[pair_key(k,z)] = true;
        
        let params : [number,number,number];
        if (q.side * dir < 0){
          params = [k,z-1,-1];
        }else{
          params = [k,z+1,1];
        }
        if ((args.hole_policy == HOLE_AGGRESSIVE || force_no_backturn) && !is_outline && params[2] != dir){
          return false;
        }
        return trace_from(...params,[i0,j0]);
      }
    }

    let success = trace_from(i0,j0,dir,null);
    if (!success || out.length < 3){
      return null;
    }
    return {
      poly:out,
      used:local_used,
      used_isects:local_used_isects,
      used_edges:local_used_edges,
    };
  }
  
  let xmin = Infinity;
  let amin = 0;
  for (let i = 0; i < n; i++){
    if (poly[i][0] < xmin){
      xmin = poly[i][0];
      amin = i;
    }
  }

  let cw = check_concavity(poly,amin);

  let out : Pt[][] = [];
  let ret : Trace_ret = trace_outline(amin,-1,cw,true);
  if (!ret){
    return [];
  }
  used = ret.used;
  used_isects = ret.used_isects;
  out.push(ret.poly);

  if (args.hole_policy != HOLE_NONE){
    let hole_starts : [number,number][] = [];
    for (let i = 0; i < n; i++){
      for (let j = 0; j < verts[i].isects.length; j++){
        let id = pair_key(i,j);
        let kz = pair_key(...isect_mir[id]);
        if (args.hole_policy != HOLE_AGGRESSIVE || (!used_isects[id] && !used_isects[kz])){
          hole_starts.push([i,j]);
        }
      }
    }
    // console.log(hole_starts);
    
    for (let i = 0; i < hole_starts.length; i++){
      let [k,z] = hole_starts[i];
      let ret = trace_outline(k,z,cw,false);
      // console.log(k,z,ret);
      if (ret){
        let ok = poly_is_hole(ret.poly,poly,args.hole_policy!=HOLE_EVENODD,args.epsilon);
        if (ok){
          out.push(ret.poly);
          Object.assign(used,ret.used);
          Object.assign(used_isects,ret.used_isects);
          Object.assign(used_edges,ret.used_edges);
          
        }
      }
    }
    if (args.hole_policy == HOLE_EVENODD ){
      for (let i = 0; i < hole_starts.length; i++){
        let [k,z] = hole_starts[i];
        let ret = trace_outline(k,z,-cw,false,true);
        if (ret){
          let ok = poly_is_hole(ret.poly,poly,false,args.epsilon);
          if (ok){
            out.push(ret.poly);
            Object.assign(used,ret.used);
            Object.assign(used_isects,ret.used_isects);
            Object.assign(used_edges,ret.used_edges);
          }
        }
      }
    }

  }

  return out;
}

