import {HOLE_NONZERO, unmess} from "./unmess";
import {bisect_angles, rot_poly, convex_hull} from "./common"
import { balltrack } from "./balltrack";
import { stampdrag_ident, stampdrag_cust } from "./stampdrag";
import { field_disturb } from "./fielddisturb";
import { preprocess } from "./preproc";

export {
  preprocess, 
  unmess as __unmess,
  field_disturb as __field_disturb,
  balltrack as __balltrack, stampdrag_ident as __stampdrag_ident, stampdrag_cust as __stampdrag_cust,
  convex_hull as __convex_hull,
};

function get_cum_dist(polyline:[number,number][]):number[]{
  let ds : number[] = [0];
  let d = 0;
  for (let i = 1; i < polyline.length; i++){
    let a = polyline[i-1];
    let b = polyline[i];
    let dx = a[0]-b[0];
    let dy = a[1]-b[1];
    
    d += Math.sqrt(dx*dx+dy*dy);
    ds.push(d);
  }
  return ds;
}

export function tube_brush(func:Function,args0:Record<string,any>){
  if (!args0) args0 = {};
  return function (polyline:number[][],args:Record<string,any>){

    if (args.preprocess){
      polyline = preprocess(polyline,args.preprocess);
    }

    let widths : number[] = [];
    let xys:[number,number][] = polyline.map(x=>[x[0],x[1]]);
    let ds = get_cum_dist(xys);

    for (let i = 0; i < xys.length; i++){
      let r  : number;
      let r0 : number = null;
      let r1 : number = null;
      let [x,y] = xys[i];
      if (xys[i+1]){
        r0 = Math.atan2(xys[i+1][1]-y,xys[i+1][0]-x);
      }
      if (xys[i-1]){
        r1 = Math.atan2(y-xys[i-1][1],x-xys[i-1][0]);
      }
      if (r0 == null){
        r0 = r1;
      }
      if (r1 == null){
        r1 = r0;
      }
      r = bisect_angles(r0,r1)[0];
      let ret = func({
        i,
        d:ds[i],
        z:polyline[i][2],
        v:polyline[i][3]??(i?(ds[i]-ds[i-1]):ds[1]),
        t:ds[i]/ds[ds.length-1],
        x,y,r,
        dx:i?(polyline[i][0]-polyline[i-1][0]):0,
        dy:i?(polyline[i][1]-polyline[i-1][1]):0,
      });
      ret.w = ret.w?? 1;   
      ret.w = Math.max(0.001,ret.w);
      widths.push(ret.w);
    }

    // console.log(`let p = ${JSON.stringify(xys)}\nlet w = ${JSON.stringify(widths)}`);
    let o = balltrack(xys,widths,
      args0.join??'round',args0.cap??'round',
      args0.join_resolution??4,args0.miter_limit??2);

    if (args.out_intermediate){
      args.out_intermediate[0] = o;
    }

    if (!args.clean){
      return [o];
    }
    return unmess(o);
  }
}

export function stamp_brush(polygon:[number,number][],args0:Record<string,any>){
  if (!args0) args0 = {};
  if (args0.scale){
    polygon = polygon.map(x=>[x[0]*args0.scale,x[1]*args0.scale])
  }

  return function(polyline:number[][],args:Record<string,any>){
    if (args.preprocess){
      polyline = preprocess(polyline,args.preprocess);
    }
    if (!polyline.length){
      return [];
    }

    let xys:[number,number][] = polyline.map(x=>[x[0],x[1]]);
    let o = stampdrag_ident(xys,polygon);
    if (args.out_intermediate){
      args.out_intermediate[0] = o;
    }

    if (!args.clean){
      return [o];
    }
    return unmess(o);
  }
}


export function custom_brush(func:Function){
  return function(polyline:number[][],args:Record<string,any>){
    if (args.preprocess){
      polyline = preprocess(polyline,args.preprocess);
    }
    if (!polyline.length){
      return [];
    }

    let polygons : [number,number][][]= [];
    let xys:[number,number][] = polyline.map(x=>[x[0],x[1]]);
    let ds = get_cum_dist(xys);

    for (let i = 0; i < xys.length; i++){
      let r  : number;
      let r0 : number = null;
      let r1 : number = null;
      let [x,y] = xys[i];
      if (xys[i+1]){
        r0 = Math.atan2(xys[i+1][1]-y,xys[i+1][0]-x);
      }
      if (xys[i-1]){
        r1 = Math.atan2(y-xys[i-1][1],x-xys[i-1][0]);
      }
      if (r0 == null){
        r0 = r1;
      }
      if (r1 == null){
        r1 = r0;
      }
      r = bisect_angles(r0,r1)[0];
      let ret = func({
        i,
        d:ds[i],
        z:polyline[i][2],
        v:polyline[i][3]??(i?(ds[i]-ds[i-1]):ds[1]),
        t:ds[i]/ds[ds.length-1],
        x,y,r,
        dx:i?(polyline[i][0]-polyline[i-1][0]):0,
        dy:i?(polyline[i][1]-polyline[i-1][1]):0,
      });
      ret.w = ret.w?? 1;
      ret.h = ret.h?? ret.w;
      ret.r = ret.r?? 0;
      
      ret.w = Math.max(0.0001,ret.w);
      ret.h = Math.max(0.0001,ret.h);
      
      let p = ret.p.map((x: number[])=>[x[0]*ret.w,x[1]*ret.h]);
      p = rot_poly(p, ret.r);
      
      polygons.push(p);
    }

    let o = stampdrag_cust(xys,polygons);

    if (args.out_intermediate){
      args.out_intermediate[0] = polygons.map((y,i)=>y.map(x=>[x[0]+polyline[i][0],x[1]+polyline[i][1]]));
      args.out_intermediate[1] = o;
    }

    if (!args.clean){
      return [o];
    }
    field_disturb(o,0.1);
    return unmess(o,{hole_policy:HOLE_NONZERO});
  }
}
