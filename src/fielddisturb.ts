export function field_disturb(points:[number,number][],resolution:number):[number,number][]{
  let xmin = Infinity;
  let ymin = Infinity;
  let xmax = -Infinity;
  let ymax = -Infinity;
  for (let i = 0; i < points.length; i++){
    let [x,y] = points[i];
    xmin = Math.min(xmin,x);
    ymin = Math.min(ymin,y);
    xmax = Math.max(xmax,x);
    ymax = Math.max(ymax,y);
  }
  if (xmax <= xmin){
    xmax = xmin+1;
  }
  if (ymax <= ymin){
    ymax = ymin+1;
  }

  let m = Math.max(1,Math.round((xmax-xmin)/resolution));
  let n = Math.max(1,Math.round((ymax-ymin)/resolution));
  
  let tp = [];
  for (let i = 0; i < points.length; i++){
    let [x,y] = points[i];
    tp.push([
      ((x-xmin)/(xmax-xmin)*m)+1,
      ((y-ymin)/(ymax-ymin)*n)+1,
    ])
  }
  // console.log(tp);
  let w = m+2;
  
  let out = [];
  let M = new Array((m+2)*(n+2)).fill(0);
  for (let i = 0; i < tp.length; i++){
    let [x,y] = tp[i];
    let ix = ~~x;
    let iy = ~~y;
    let fx = x-ix;
    let fy = y-iy;
    
    // console.log(i,ix,iy,M[iy*w+ix]);
    if (!M[iy*w+ix]){
      M[iy*w+ix]++;
      
      let ffx = fx;
      let ffy = fy;
      if (0.25 > ffx || ffx > 0.75){
        ffx = Math.random()*0.5+0.25;
      }
      if (0.25 > ffy || ffy > 0.75){
        ffy = Math.random()*0.5+0.25;
      }
      
      out.push([ix+ffx,iy+ffy]);
      continue;
    }
    // console.log(i);
    
    let cs = [
      [ix-1,iy],
      [ix,  iy-1],
      [ix+1,iy],
      [ix,  iy+1],
      
      [ix-1,iy-1],
      [ix-1,iy+1],
      [ix+1,iy-1],
      [ix+1,iy+1],
  
      [ix-2,iy],
      [ix+2,iy],
      [ix,  iy-2],
      [ix,  iy+2],
    ];
    let zmin = Infinity;
    let amin = null;
    let ok = false;
    for (let j = 0; j < cs.length; j++){
      let iix = ~~cs[j][0];
      let iiy = ~~cs[j][1];
      let idx = iiy*w+iix;
      
      if (!M[idx]){
        M[idx]++;
        out.push([cs[j][0]+Math.random()*0.5+0.25,cs[j][1]+Math.random()*0.5+0.25]);
        ok = true;
        break;
      }
      if (M[idx]<zmin){
        zmin = M[idx];
        amin = [cs[j],idx];
      }
    }
    if (ok) continue;
    
    M[amin[1]]++;
    out.push([amin[0][0]+Math.random(),amin[0][1]+Math.random()]);
  }
  for (let i = 0; i < out.length; i++){
    out[i][0] += (Math.random()-0.5)*0.01;
    out[i][1] += (Math.random()-0.5)*0.01;
  }
  // console.log(xmin,xmax,ymin,ymax,m,n,M);
  return out.map(x=>[
    (x[0]-1)/m*(xmax-xmin)+xmin,
    (x[1]-1)/n*(ymax-ymin)+ymin,
  ]);
}