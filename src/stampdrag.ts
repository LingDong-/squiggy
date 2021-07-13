import {lowest_y, highest_y, rot_poly, convex_hull, cwise} from "./common"


export function stampdrag_ident(polyline:[number,number][],polygon:[number,number][],epsilon:number=0.1):[number,number][]{
  let aug : [number,number][] = [];
  for (let i = 0; i < polygon.length; i++){
    let a = polygon[i];
    let b = polygon[(i+1)%polygon.length];
    let c = [(a[0]+b[0])/2,(a[1]+b[1])/2];
    let dx = b[0]-a[0];
    let dy = b[1]-a[1];
    let l = Math.hypot(dx,dy);
    let ax = dy/l;
    let ay = -dx/l;
    aug.push(polygon[i]);
    aug.push([c[0]+ax*epsilon,c[1]+ay*epsilon]);
  }
  // console.log(aug);
  polygon = aug;
  let states : [number,number,number,number,number][] = [];
  for (let i = 0; i < polyline.length-1; i++){

    let [x0,y0] = polyline[i];
    let [x1,y1] = polyline[i+1];
    
    let ang = Math.atan2(y1-y0,x1-x0);
    let p0 = rot_poly(polygon,-ang);
    let p1 = rot_poly(polygon,-ang);

    let i0 = lowest_y(p0);
    let j0 = highest_y(p0);
    let i1 = lowest_y(p1);
    let j1 = highest_y(p1);
    
    let dir = 0;
    if (i > 0){
      dir = cwise(...polyline[i-1],x0,y0,x1,y1);
      dir /=Math.abs(dir);
    }
    states.push([i0,j0,i1,j1,dir]);
  }
  
  let out = [];
  for (let i = 1; i < polyline.length-1; i++){
    let i0 = states[i-1][2];
    let o0 = states[i][0];
    let dir = states[i][4];
    
    let n = polygon.length;

    if (dir >= 0){
      while (o0 < i0){
        o0 += n;
      }
      
      for (let j = i0; j <= o0; j++){
        let [x,y] = polygon[j%n];
        out.push([x + polyline[i][0], y + polyline[i][1]]);
      }
    }else{
      let [x,y] = polygon[i0];
      out.push([ x + polyline[i][0], y+polyline[i][1] ]);
      
      let [x1,y1] = polygon[o0];
      out.push([ x1 + polyline[i][0], y1+polyline[i][1] ]);
    }
  }  
  
  {
    let i0 = states[states.length-1][2];
    let o0 = states[states.length-1][3];
    while (o0 < i0){
      o0 += polygon.length;
    }
    for (let j = i0; j <= o0; j++){
      let [x,y] = polygon[j%polygon.length];
      out.push([x + polyline[polyline.length-1][0], y + polyline[polyline.length-1][1]]);
    }
  }

  
  for (let i = polyline.length-2; i > 0;  i--){
    let i0 = states[i][1];
    let o0 = states[i-1][3];
    let dir = states[i][4];
    
    let n = polygon.length;

    if (dir <= 0){
      while (o0 < i0){
        o0 += n;
      }
      
      for (let j = i0; j <= o0; j++){
        let [x,y] = polygon[(j+n)%n];
        out.push([x + polyline[i][0], y + polyline[i][1]]);
      }
    }else{
      let [x,y] = polygon[i0];
      out.push([ x + polyline[i][0], y+polyline[i][1] ]);
      
      let [x1,y1] = polygon[o0];
      out.push([ x1 + polyline[i][0], y1+polyline[i][1] ]);
    }
  }  
  
  {
    let i0 = states[0][1];
    let o0 = states[0][0];
    while (o0 < i0){
      o0 += polygon.length;
    }
    for (let j = i0; j <= o0; j++){
      let [x,y] = polygon[j%polygon.length];
      out.push([x + polyline[0][0], y + polyline[0][1]]);
    }
  }
  
  return out;

}

export function stampdrag_cust(polyline:[number,number][],polygons:[number,number][][]) : [number,number][]{
  if (polyline.length == 1){
    return polygons[0].map(x=>[x[0]+polyline[0][0],x[1]+polyline[0][1]]);
  }
  // console.log(polyline);
  function convex_union(poly0:number[][],poly1:number[][],z:number){
    let dmin = Infinity;
    let imin : [number,number] = null;
    for (let i = 0; i < poly0.length; i++){
      
      if (poly0[i][2] != z){
        continue;
      }
      for (let j = 0; j < poly1.length; j++){
        let [x0,y0] = poly0[i];
        let [x1,y1] = poly1[j];
        let dx = x0-x1;
        let dy = y0-y1;
        let d2 = dx*dx + dy*dy;
        if (d2 < dmin){
          dmin = d2;
          imin = [i,j];
        }
      }
    }
    if (!imin){
      for (let i = 0; i < poly0.length; i++){
        for (let j = 0; j < poly1.length; j++){
          let [x0,y0] = poly0[i];
          let [x1,y1] = poly1[j];
          let dx = x0-x1;
          let dy = y0-y1;
          let d2 = dx*dx + dy*dy;
          if (d2 < dmin){
            dmin = d2;
            imin = [i,j];
          }
        }
      }
    }
    let u = poly0.slice(0,imin[0]).concat(
      poly1.slice(imin[1])).concat(
        poly1.slice(0,imin[1])).concat(
          poly0.slice(imin[0]));
    
    return u;
  }

  let curr : number[][] = null;
  for (let i = 0; i < polyline.length-1; i++){
    let poly0 = polygons[i];
    let poly1 = polygons[i+1];
    let p0 : number[][] = [];
    let p1 : number[][] = [];
    let [x0,y0] = polyline[i];
    let [x1,y1] = polyline[i+1];
    
    for (let j = 0; j < poly0.length; j++){
      p0.push([poly0[j][0]+x0, poly0[j][1]+y0, i]);
    }
    
    for (let j = 0; j < poly1.length; j++){
      p1.push([poly1[j][0]+x1, poly1[j][1]+y1, i+1]);
    }

    let hull = convex_hull(p0.concat(p1) as [number,number][]);
    if (!curr){
      curr = hull;
    }else{
      curr = convex_union(curr, hull, i);
    }
  }
  let o : [number,number][] = curr.map(x=>[x[0],x[1]]);
  return o;
}