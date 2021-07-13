
export function catmull_rom(positions:number[][],resolution:number,alpha:number):number[][]{
  const EPSILON = 0.001;
  function get_t(t:number, p0:number[], p1:number[], alpha:number){
    let a = 0;
    for (let i = 0; i < p0.length; i++){
      a += Math.pow((p1[i]-p0[i]), 2.0);
    }
    let b = Math.pow(a, alpha * 0.5);
    return (b + t);
  }
  function cr_spline(p0:number[], p1:number[], p2:number[], p3:number[], resolution:number, alpha:number){
    //https://en.wikipedia.org/wiki/Centripetal_Catmull–Rom_spline
    let points : number[][] = [];
    if (p0[0] == p1[0] && p0[1] == p1[1]) {
      p0[0] += EPSILON;
    }
    if (p1[0] == p2[0] && p1[1] == p2[1]) {
      p1[0] += EPSILON;
    }
    if (p2[0] == p3[0] && p2[1] == p3[1]) {
      p2[0] += EPSILON;
    }
    let t0 = 0.0;
    let t1 = get_t(t0, p0, p1,alpha);
    let t2 = get_t(t1, p1, p2,alpha);
    let t3 = get_t(t2, p2, p3,alpha);

    for (let t=t1; t<t2; t+=((t2-t1)/resolution)){
        let f0 = (t1-t)/(t1-t0);
        let f1 = (t-t0)/(t1-t0);
        let a1 : number[]= [];
        for (let i = 0; i < p0.length; i++){
          a1.push(p0[i]*f0+p1[i]*f1);
        }
        let f2 = (t2-t)/(t2-t1);
        let f3 = (t-t1)/(t2-t1);
        let a2 : number[]= [];
        for (let i = 0; i < p1.length; i++){
          a2.push(p1[i]*f2+p2[i]*f3);
        }
        let f4 = (t3-t)/(t3-t2);
        let f5 = (t-t2)/(t3-t2);
        let a3 : number[]= [];
        for (let i = 0; i < p1.length; i++){
          a3.push(p2[i]*f4+p3[i]*f5);
        }
        let f6 = (t2-t)/(t2-t0);
        let f7 = (t-t0)/(t2-t0);
        let b1 : number[]= [];
        for (let i = 0; i < a1.length; i++){
          b1.push(a1[i]*f6+a2[i]*f7);
        }
        let f8 = (t3-t)/(t3-t1);
        let f9 = (t-t1)/(t3-t1);
        let b2 : number[] = [];
        for (let i = 0; i < a2.length; i++){
          b2.push(a2[i]*f8+a3[i]*f9);
        }
        let c : number[] = [];
        for (let i = 0; i < b1.length; i++){
          c.push(b1[i]*f2+b2[i]*f3);
        }
        points.push(c);
    }
    // console.log(p0,p1,p2,points);
    points.push(p2.slice());
    return points;
  }
  let curve = [];
  for (let i = 0; i < positions.length-1; i++){
    let p0 = positions[Math.max(i-1,0)].slice();
    let p1 = positions[i].slice();
    let p2 = positions[i+1].slice();
    let p3 = positions[Math.min(i+2,positions.length-1)].slice();
    let pts = cr_spline(p0,p1,p2,p3,resolution,alpha);
    curve.push(...pts);
  }
  // console.log(curve);
  return curve;
}


function isect_circ_line(cx:number,cy:number,r:number,x0:number,y0:number,x1:number,y1:number):number{
  //https://stackoverflow.com/a/1084899
  let dx = x1-x0;
  let dy = y1-y0;
  let fx = x0-cx;
  let fy = y0-cy;
  let a = dx*dx+dy*dy;
  let b = 2*(fx*dx+fy*dy);
  let c = (fx*fx+fy*fy)-r*r;
  let discriminant = b*b-4*a*c;
  if (discriminant<0){
    return null;
  }
  discriminant = Math.sqrt(discriminant);
  let t0 = (-b - discriminant)/(2*a);
  if (0 <= t0 && t0 <= 1){
    return t0;
  }
  let t = (-b + discriminant)/(2*a);
  if (t > 1 || t < 0){
    return null;
  }
  return t;
}

export function resample(polyline:number[][],step:number):number[][]{
  if (polyline.length <= 2){
    return polyline.slice();
  }
  polyline = polyline.slice();
  let out = [polyline[0].slice()];
  let next : number = null;
  let i = 0;
  while(i < polyline.length-1){
    let a = polyline[i];
    let b = polyline[i+1];
    let dx = b[0]-a[0];
    let dy = b[1]-a[1];
    let d = Math.sqrt(dx*dx+dy*dy);
    if (d == 0){
      i++;
      continue;
    }
    let n = ~~(d/step);
    let rest = (n*step)/d;
    let rpx = a[0] * (1-rest) + b[0] * rest;
    let rpy = a[1] * (1-rest) + b[1] * rest;
    for (let j = 1; j <= n; j++){
      let t = j/n;
      let x = a[0]*(1-t) + rpx*t;
      let y = a[1]*(1-t) + rpy*t;
      let xy = [x,y];
      for (let k = 2; k < a.length; k++){
        xy.push(a[k]*(1-t) + (a[k] * (1-rest) + b[k] * rest)*t);
      }
      out.push(xy);
    }

    next = null;
    for (let j = i+2; j < polyline.length; j++){
      let b = polyline[j-1];
      let c = polyline[j];
      if (b[0] == c[0] && b[1] == c[1]){
        continue;
      }
      let t = isect_circ_line(rpx,rpy,step,b[0],b[1],c[0],c[1]);
      if (t == null){
        continue;
      }
 
      let q = [
        b[0]*(1-t)+c[0]*t,
        b[1]*(1-t)+c[1]*t,
      ];
      for (let k = 2; k < b.length; k++){
        q.push(b[k]*(1-t)+c[k]*t);
      }
      out.push(q);
      polyline[j-1] = q;
      next = j-1;
      break;
    }
    if (next == null){
      break;
    }
    i = next;

  }

  if (out.length > 1){
    let lx = out[out.length-1][0];
    let ly = out[out.length-1][1];
    let mx = polyline[polyline.length-1][0];
    let my = polyline[polyline.length-1][1];
    let d = Math.sqrt((mx-lx)**2+(my-ly)**2);
    if (d < step*0.5){
      out.pop(); 
    }
  }
  out.push(polyline[polyline.length-1].slice());
  return out;
}


export function gauss_blur(polyline:number[][],axis:number=2,k:number=6):number[][]{
  let n = k*2+1;
  let s = 1/3;
  let c = 1/(Math.sqrt(2*Math.PI)*s);
  let yy = 0;
  let w : number[] =  [];
  for (let i = 0; i < n; i++){
    let x = i/(n-1) * 2 - 1;
    let y = c*Math.exp(-Math.pow(x/s,2)/2);
    yy += y;
    w.push(y)
  }
  for (let i = 0; i < n; i++){
    w[i]/=yy;
  }
  let q = [];
  for (let i = 0; i < polyline.length; i++){
    let z = 0;
    for (let j = -k; j < k; j++){
      let a = polyline[Math.min(Math.max(i+j,0),polyline.length-1)];
      z += a[axis]*w[j+k];
    }
    q.push(polyline[i].map((a,j)=>(j==axis?z:a)));
  }
  return q; 
}




function pt_seg_dist(p:[number,number], p0:[number,number], p1:[number,number]) :number {
  // https://stackoverflow.com/a/6853926
  let x = p[0];   let y = p[1];
  let x1 = p0[0]; let y1 = p0[1];
  let x2 = p1[0]; let y2 = p1[1];
  let A = x - x1; let B = y - y1; let C = x2 - x1; let D = y2 - y1;
  let dot = A*C+B*D;
  let len_sq = C*C+D*D;
  let param = -1;
  if (len_sq != 0) {
    param = dot / len_sq;
  }
  let xx:number; let yy:number;
  if (param < 0) {
    xx = x1; yy = y1;
  }else if (param > 1) {
    xx = x2; yy = y2;
  }else {
    xx = x1 + param*C;
    yy = y1 + param*D;
  }
  let dx = x - xx;
  let dy = y - yy;
  return Math.sqrt(dx*dx+dy*dy);
}

function approx_poly_dp(polyline:number[][], epsilon:number){
  if (polyline.length <= 2){
    return polyline;
  }
  let dmax   = 0;
  let argmax = -1;
  for (let i = 1; i < polyline.length-1; i++){
    let d = pt_seg_dist(polyline[i] as [number,number], 
                        polyline[0] as [number,number], 
                        polyline[polyline.length-1] as [number,number]);
    if (d > dmax){
      dmax = d;
      argmax = i;
    }  
  }
  let ret = [];
  if (dmax > epsilon){
    let L = approx_poly_dp(polyline.slice(0,argmax+1),epsilon);
    let R = approx_poly_dp(polyline.slice(argmax,polyline.length),epsilon);
    ret = ret.concat(L.slice(0,L.length-1)).concat(R);
  }else{
    ret.push(polyline[0].slice());
    ret.push(polyline[polyline.length-1].slice());
  }
  return ret;
}

export function preprocess(polyline:number[][],passes:any[]):number[][]{
  for (let i = 0; i < passes.length; i++){
    let pass = passes[i];
    if (pass.type == 'catmull-rom'){
      polyline = catmull_rom(polyline as any,pass.resolution??20,pass.alpha??0.5);
    }else if (pass.type == 'resample'){
      polyline = resample(polyline,pass.step??3);
    }else if (pass.type == 'gauss-blur'){
      polyline = gauss_blur(polyline,pass.axis??2,pass.k??6);
    }else if (pass.type == 'approx'){
      polyline = approx_poly_dp(polyline,pass.epsilon??1);
    }
  }
  return polyline;
}