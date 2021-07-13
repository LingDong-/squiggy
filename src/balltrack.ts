import {bisect_angles, cwise,  cwise_crossdot, interp_angles} from "./common"


function seg_isect(
  p0x:number, p0y:number, p1x:number, p1y:number, 
  q0x:number, q0y:number, q1x:number, q1y:number) : boolean{

  let d0x = ((p1x) - (p0x));
  let d0y = ((p1y) - (p0y));
  let d1x = ((q1x) - (q0x));
  let d1y = ((q1y) - (q0y));
  let vc = ((((d0x) * (d1y))) - (((d0y) * (d1x))));
  if ((vc) == (0)) {
    return false;
  }
  let vcn = ((vc) * (vc));
  let q0x_p0x = (q0x) - (p0x);
  let q0y_p0y = (q0y) - (p0y);
  let vc_vcn = vc/vcn;
  let t = ((((((((q0x_p0x)) * (d1y))) )) - ((((((q0y_p0y)) * (d1x))) )))) * vc_vcn;
  let s = ((((((((q0x_p0x)) * (d0y))) )) - ((((((q0y_p0y)) * (d0x))) )))) * vc_vcn;

  if (0 <= t && t <= 1 && 0 <= s && s <= 1){
    return true;
  }
  return false;
}


export function balltrack(polyline:[number,number][],widths:number[],join:string='round',cap:string="round",join_resolution:number=2,miter_limit:number=2){
  let EPS = 0.001;
  let EPS2 = 0.001;

  if (!polyline.length){
    return [];
  }
  if (polyline.length < 2){
    let p = polyline[0].slice();
    p[0]+=EPS;
    polyline = polyline.concat([p as any]);
  }
  let angs : [number,number][] = [];
  let lens : number[] = [];
  for (let i = 0; i < polyline.length-1; i++){
    let a = polyline[i];
    let b = polyline[i+1];
    let dx = b[0]-a[0];
    let dy = b[1]-a[1];
    let l = Math.sqrt(dx*dx+dy*dy);

    
    let w0 = widths[i];
    let w1 = widths[i+1];
    let dw = w0 - w1;
    if (Math.abs(dw) > l-EPS){
      if (w0 < w1){
        widths[i+1] = w1 = w0+l-EPS;
      }else{
        widths[i+1] = w1 = w0-l+EPS;
      }
      dw = w0 - w1;
    }
    let a0 = Math.atan2(dy,dx);

    let ang = Math.acos(dw/l);
    angs.push([a0+ang,a0-ang]);

    lens.push(l);
  }
  // console.log(angs);

  let l0 : [number,number][] = [];
  let l1 : [number,number][] = [];
  for (let i = 0; i < polyline.length-1; i++){
    let a = polyline[i];
    let b = polyline[i+1];
    let w0 = widths[i];
    let w1 = widths[i+1];
    
    let [a0,a1] = angs[i];

    l0.push([a[0]+Math.cos( a0)*w0,a[1]+Math.sin( a0)*w0]);
    l1.push([a[0]+Math.cos( a1)*w0,a[1]+Math.sin( a1)*w0]);
    l0.push([b[0]+Math.cos( a0)*w1,b[1]+Math.sin( a0)*w1]);
    l1.push([b[0]+Math.cos( a1)*w1,b[1]+Math.sin( a1)*w1]);

  }


  
  let j0 : [number,number][][] = [[]];
  let j1 : [number,number][][] = [[]];
  for (let i = 1; i < polyline.length-1; i++){
    let a = polyline[i-1];
    let b = polyline[i];
    let c = polyline[i+1];

    let [cross,dot] = cwise_crossdot(...a,...b,...c);
    let subtle = (dot<EPS2);
    let major = subtle?0:( (cross>0)?1:-1 );
    // console.log(cross,dot,major);

    let do0 = true;
    let do1 = true;
    {
      let p0 = l1[(i-1)*2];
      let p1 = l1[(i-1)*2+1];
      let p2 = l1[i*2];
      let p3 = l1[i*2+1];

      if (seg_isect(...p0,...p1,...p2,...p3)){
        do0 = false;
      }
    }{
      let p0 = l0[(i-1)*2];
      let p1 = l0[(i-1)*2+1];
      let p2 = l0[i*2];
      let p3 = l0[i*2+1];
      
      if (seg_isect(...p0,...p1,...p2,...p3)){
        do1 = false;
      }
    }

    if (join != 'bevel' && (do1 || do0)){
      // console.log(join);
      if (join != 'miter'){ //round
        let step = Math.asin((join_resolution/2)/widths[i])*2;
        if (isNaN(step)){
          j1.push([]);
          j0.push([]);
          continue;
        }

        if (do0){
          let a0 = angs[i-1][1];
          let a1 = angs[i][1];
          
          let jj = [];
          let aa = interp_angles(a0,a1,step,(major==1)?1:0,1);
          aa.forEach(a=>{
            let dx = Math.cos(a)*widths[i];
            let dy = Math.sin(a)*widths[i];
            jj.push([b[0]+dx,b[1]+dy]);
          })
          // console.log(a0,a1,aa);
          j1.push(jj);
          if (!do1)j0.push([]);

        }
        if (do1){
          let a0 = angs[i-1][0];
          let a1 = angs[i][0];
          let jj = [];

          let aa = interp_angles(a0,a1,step,(major==-1)?-1:0,-1);
          aa.forEach(a=>{
            let dx = Math.cos(a)*widths[i];
            let dy = Math.sin(a)*widths[i];
            jj.push([b[0]+dx,b[1]+dy]);
          })
          // console.log(a0,a1,aa);
          j0.push(jj);
          if (!do0)j1.push([]);
        }
      }else{//miter
        
        if (do0){
          let a0 = angs[i-1][1];
          let a1 = angs[i][1];

          let [aa,ab] = bisect_angles(a0,a1,(major==1)?1:0);
          let w = Math.abs(widths[i]/Math.cos(ab));
          w = Math.min(widths[i]*miter_limit,w);
          let jj : [number,number][] = [[b[0]+w*Math.cos(aa),b[1]+w*Math.sin(aa)]]
          j1.push(jj);
          if(!do1)j0.push([]);

        }
        if (do1){
          let a0 = angs[i-1][0];
          let a1 = angs[i][0];
  
          let [aa,ab] = bisect_angles(a0,a1,(major==-1)?-1:0);
          let w = Math.abs(widths[i]/Math.cos(ab));
          w = Math.min(widths[i]*miter_limit,w);
          let jj : [number,number][] = [[b[0]+w*Math.cos(aa),b[1]+w*Math.sin(aa)]]
          
          
          j0.push(jj);
          if (!do0)j1.push([]);
        }
      }
    }else{
      j0.push([]);
      j1.push([]);
    }
  }
  let ll0 : [number,number][]= [];
  let ll1 : [number,number][]= [];
  for (let i = 0; i < l0.length/2; i++){
    ll0.push(...j0[i]);
    ll1.push(...j1[i]);
    
    ll0.push(l0[i*2]);
    ll0.push(l0[i*2+1]);
    ll1.push(l1[i*2]);
    ll1.push(l1[i*2+1]);

  }
  l0 = ll0;
  l1 = ll1;
  if (cap == 'round'){{
    let jj = [];
    let a = polyline[0];
    let b = polyline[1];
    let [a0,a1] = angs[0];
    let step = Math.asin((join_resolution/2)/widths[0])*2;
    let aa = interp_angles(a0,a1,step,1);
    if (!isNaN(step)){
      aa.forEach(z=>{
        let x = a[0] + widths[0]*Math.cos(z);
        let y = a[1] + widths[0]*Math.sin(z);
        jj.push([x,y]);
      });
    }
    l1 = jj.concat(l1);
  }{
    let jj : [number,number][] = [];
    let a = polyline[polyline.length-2];
    let b = polyline[polyline.length-1];
    let [a1,a0] = angs[polyline.length-2];

    let step = Math.asin((join_resolution/2)/widths[0])*2;
    let aa = interp_angles(a0,a1,step,1);
    // console.log(a0,a1,aa);
    if (!isNaN(step)){
      aa.forEach(z=>{
        let x = b[0] + widths[widths.length-1]*Math.cos(z);
        let y = b[1] + widths[widths.length-1]*Math.sin(z);
        jj.push([x,y]);
      });
    }
    l1.push(...jj);
  }}
  
  l0.reverse();
  let ret = l1.concat(l0);
  return ret;
}
