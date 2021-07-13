export function lowest_y(plist:[number,number][]):number{
  let mi = 0;
  let mv = Infinity;
  for (let i = 0; i < plist.length; i++){
    if (plist[i][1] < mv){
      mv = plist[i][1];
      mi = i;
    }
  }
  return mi;
}
export function highest_y(plist:[number,number][]):number{
  let mi = 0;
  let mv = -Infinity;
  for (let i = 0; i < plist.length; i++){
    if (plist[i][1] > mv){
      mv = plist[i][1];
      mi = i;
    }
  }
  return mi;
}
export function cwise(p1x:number, p1y:number, p2x:number, p2y:number, p3x:number, p3y:number):number{
  return (p2x - p1x)*(p3y - p1y) - (p2y - p1y)*(p3x - p1x)
}

export function cwise_crossdot(p1x:number, p1y:number, p2x:number, p2y:number, p3x:number, p3y:number):[number,number]{
  let dx0 = p2x - p1x;
  let dy0 = p2y - p1y;
  let dx1 = p3x - p1x;
  let dy1 = p3y - p1y;
  let dx2 = p3x - p2x;
  let dy2 = p3y - p2y;
  let d0 = Math.hypot(dx0,dy0);
  let d1 = Math.hypot(dx1,dy1);
  let d2 = Math.hypot(dx2,dy2);
  // dx0 /= d0; dy0 /= d0; dx1 /= d1; dy1 /= d1;
  let cross = dx0*dy1-dy0*dx1;
  let dot = Math.abs((dx0*dx2+dy0*dy2)/(d0*d2) - 1);
  return [cross,dot];
}


export function convex_hull(plist:[number,number][]) : [number,number][]{
  let N = plist.length;
  let points = plist.slice();
  let p = points.splice(lowest_y(plist),1)[0];
  
  let keyfunc = (q)=>(Math.atan2(q[1]-p[1], q[0]-p[0]));
  points.sort((a,b)=>(keyfunc(a)-keyfunc(b)));      
  points.unshift(p);

  let stack = []
  stack.push(points[0]);
  stack.push(points[1]);
  
  for (let i = 2; i < points.length; i++){
    while (stack.length >= 2 && cwise(
      stack[stack.length-2][0],stack[stack.length-2][1],
      stack[stack.length-1][0],stack[stack.length-1][1],
      points[i][0],points[i][1]) <= 0){
      stack.pop();
    }
    stack.push(points[i])
  }
  return stack;
}

export function rot_poly(poly:[number,number][],th:number): [number,number][]{
  let qoly : [number,number][] = [];
  let costh = Math.cos(th);
  let sinth = Math.sin(th);
  for (let i = 0; i < poly.length; i++){
    let [x0,y0] = poly[i]
    let x = x0* costh-y0*sinth;
    let y = x0* sinth+y0*costh;
    qoly.push([x,y]);
  }
  return qoly;
}


export function interp_angles(a0:number,a1:number,step:number,dir:number=0,suggest:number=0):number[]{
  a0 = (a0 + Math.PI*2)%(Math.PI*2);
  a1 = (a1 + Math.PI*2)%(Math.PI*2);
  function make_interval(a0:number,a1:number){
    let o = [];
    if (a0 < a1){
      for (let a = a0+step; a < a1; a+= step){
        o.push(a);
      }
    }else{
      for (let a = a0-step; a > a1; a-= step){
        o.push(a);
      }
    }
    return o;
  }
  if (dir == undefined || dir == 0){
    var methods : [number,Function][] = [
      [Math.abs(a1-a0),           ()=>make_interval(a0,a1)],
      [Math.abs(a1+Math.PI*2-a0), ()=>make_interval(a0,a1+Math.PI*2)],
      [Math.abs(a1-Math.PI*2-a0), ()=>make_interval(a0,a1-Math.PI*2)]
    ]
    methods.sort((x,y)=>(x[0]-y[0]))
    if (Math.abs(methods[0][0] - Math.PI)<0.1 && suggest){
      return interp_angles(a0,a1,step,suggest);
    }
    return methods[0][1]();
  }else{
    if (dir < 0){
      while (a1 > a0){
        a1 -= Math.PI*2;
      }
    }else{
      while (a1 < a0){
        a1 += Math.PI*2;
      }
    }
    return make_interval(a0,a1);
  }
}
export function bisect_angles(a0:number,a1:number,dir:number=0,max:number=7):[number,number]{
  a0 = (a0 + Math.PI*2)%(Math.PI*2);
  a1 = (a1 + Math.PI*2)%(Math.PI*2);
  function bisect(a0:number,a1:number):[number,number]{
    return [(a0+a1)/2,Math.abs((a1-a0)/2)];
  }
  if (dir == undefined || dir == 0){
    var methods : [number,Function][] = [
      [Math.abs(a1-a0),           ()=>bisect(a0,a1)],
      [Math.abs(a1+Math.PI*2-a0), ()=>bisect(a0,a1+Math.PI*2)],
      [Math.abs(a1-Math.PI*2-a0), ()=>bisect(a0,a1-Math.PI*2)]
    ]
    methods.sort((x,y)=>(x[0]-y[0]));
    return methods[0][1]();
  }else{
    if (dir < 0){
      while (a1 > a0){
        a1 -= Math.PI*2;
      }
    }else{
      while (a1 < a0){
        a1 += Math.PI*2;
      }
    }
    if (dir && Math.abs(a0-a1)>max){
      return bisect_angles(a0,a1,0);
    }
    return bisect(a0,a1);
  }
}