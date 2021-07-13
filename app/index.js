let convex_hull = squiggy.__convex_hull;

let presets = {
  'juicy':
`squiggy.tube_brush(o=>({w:Math.min(Math.max(20-o.z*0.5,5),20)}))`,
  'round':
`squiggy.tube_brush(o=>({w:30}))`,
  'thin':
`squiggy.tube_brush(o=>({w:4}))`,
  'slug':
`squiggy.tube_brush(o=>({w:Math.sin(o.t*Math.PI)*30+2}))`,
  'gut':
`squiggy.tube_brush(o=>({w:noise(o.x*0.01,o.y*0.01)*80+1}))`,
  'slash45':
`squiggy.stamp_brush([[-1,0.9],[0.9,-1],[1,-0.9],[-0.9,1]],{scale:30})`,
  'slash15':
`squiggy.stamp_brush([[-1,-0.25],[1,0],[1,0.25],[-1,0]],{scale:30})`,
  'box':
`squiggy.stamp_brush([[-1,-1],[1,-1],[1,1],[-1,1]],{scale:30})`,
  'flutter':
`squiggy.custom_brush(o=>({p:[[-1,0.9],[0.9,-1],[1,-0.9],[-0.9,1]],w:30,r:Math.sin(o.d*0.01)*Math.PI}))`,
  'wavy':
`squiggy.custom_brush(o=>{
  let {d,r} = o;
  let dd = (Math.sin(d*0.1));
  return {p:[[-0.2,-1+dd],[0.2,-1+dd],[0.2,1+dd],[-0.2,1+dd]],w:20,r};
})`,
  'beads':
`squiggy.custom_brush(o=>{
  let {d,r} = o;
  return {
    p:[[-0.1,-1],[0.1,-1],[0.1,1],[-0.1,1]],
    w:20*(Math.sin(d*0.1)+1)+10, r,
  };
})`,
  'rocky':
`squiggy.custom_brush(o=>{
  let {d,r} = o;
  let p = [];
  for (let i = 0; i < 3; i++){
    p.push([Math.random()*2-1,Math.random()*2-1])
  }
  p = convex_hull(p);
  return {
    p,w:30,
  };
})`,
}

let testline = [[107,49],[107,51],[105,54],[102,59],[99,63],[95,70],[90,80],[80,93],[78,98],[72,109],[66,119],[62,128],[57,136],[57,139],[54,144],[53,147],[52,149],[52,151],[52,153],[54,153],[57,153],[62,150],[67,147],[75,144],[84,141],[92,137],[99,134],[102,133],[107,131],[110,130],[114,130],[116,129],[118,129],[118,132],[118,135],[117,137],[116,139],[115,143],[115,147],[115,149],[119,150],[122,147],[128,143],[135,139],[141,136],[144,134],[148,132],[152,130],[155,129],[158,129],[157,132],[153,137],[144,149],[138,156],[134,165],[129,173],[127,177],[122,188],[121,194],[121,197],[121,199],[124,199],[128,199],[132,199],[136,199],[141,197],[146,195],[149,194],[158,192],[163,190],[166,189],[169,188],[171,188],[173,188],[172,193],[166,201],[157,211],[137,235],[127,246],[108,267],[89,289],[70,308],[63,316],[45,332]]
// let testline = [[62,31],[61,35],[58,41],[53,51],[49,62],[43,75],[37,86],[35,92],[31,104],[28,112],[26,115],[25,120],[24,124],[24,127],[31,123],[35,120],[43,114],[57,102],[62,97],[72,92],[75,89],[82,86],[86,82],[90,81],[92,79],[94,79],[96,79],[96,83],[95,88],[92,95],[90,102],[88,111],[86,118],[85,121],[85,126],[83,132],[83,134],[85,136],[87,136],[89,135],[92,133],[95,132],[97,131],[100,130],[102,130]]
// testline = testline.map(x=>[x[0]+30,x[1]+20]);
testline = testline.map(x=>[x[0]+40,x[1]+10]);



let polyline = [];
let finished = [];

let curr_stroke = null;
let internals = [];
let brush_fstr;
let brush;

let canv = document.createElement("canvas");
canv.width  = 800;
canv.height = 600;
canv.style='border:1px solid black;position:absolute;left:0px;top:0px;margin:0px'
let ctx = canv.getContext('2d');
document.body.appendChild(canv);

let _ta = document.createElement("div");
_ta.style='resize:none;position:absolute;left:1px;top:630px;width:650px;height:200px;border:none;outline:1px solid black;margin:0px;';
document.body.appendChild(_ta);

let ta = document.createElement("textarea");
ta.setAttribute('spellcheck','false');
ta.style='resize:none;position:absolute;left:1px;top:630px;width:650px;height:200px;border:none;outline:none;margin:0px;';
document.body.appendChild(ta);

let pview = document.createElement("div");
pview.style='position:absolute;left:651px;top:630px;width:149px;height:199px;border:1px solid black;margin:0px;';
document.body.appendChild(pview);

let toolb = document.createElement("div");
toolb.style='position:absolute;left:0px;top:600px;width:792px;height:22px;background:whitesmoke;border:1px solid black;padding:4px';
document.body.appendChild(toolb)

function add_text(t){
  let div = document.createElement('span');
  div.innerHTML = t;
  toolb.appendChild(div);
  return div;
}
function add_button(t,f){
  let div = document.createElement('button');
  div.innerHTML = t;
  toolb.appendChild(div);
  div.onclick = f;
  return div;
}

function add_toggle(t,f){
  let div = document.createElement('input');
  div.type = 'checkbox';
  toolb.appendChild(div);
  div.onchange = f;
  add_text(t);
  return div;
}

let psel = document.createElement("select");
for (let k in presets){
  let opt = document.createElement("option");
  opt.innerHTML = k;
  opt.value = k;
  psel.appendChild(opt);
  if (!brush){
    brush_fstr = presets[k];
    brush = eval(brush_fstr);
    ta.value = brush_fstr;
  }
}
add_text('brush preset: ');
toolb.appendChild(psel);
psel.onchange = function(){
  brush_fstr = presets[psel.value]
  brush = eval(brush_fstr);
  ta.value = brush_fstr;
  console.log(brush);
  render_testline();
}

add_text('&nbsp;&nbsp;')

add_button('clear canvas',function(){
  finished.splice(0,Infinity);
  for (let i = 0; i < workers.length; i++){
    if (workers[i]){
      workers[i].terminate();
      workers[i] = null;
    }
  }
});
add_button('undo',function(){
  let i = finished.length-1;
  finished.splice(i,1);
  if (workers[i]){
    workers[i].terminate();
    workers[i] = null;
  }
});

add_button('set brush from code',function(){
  brush_fstr = ta.value;
  console.log(brush_fstr);
  brush = eval(brush_fstr);
  render_testline();
})

let use_rast = add_toggle('raster piggyback');
// use_rast.checked = true;

let mouse_is_down = false;
function get_mouse_xy(e){

  if (e.touches){
    e = e.touches[0];
  }
  let rect = e.target.getBoundingClientRect();
  var x = e.clientX - rect.left;
  var y = e.clientY - rect.top;
  return [x,y];
}
function onmousedown(e){
  let [x,y] = get_mouse_xy(e);
  polyline= [[x,y]];
  mouse_is_down = true;
  e.preventDefault();
}
canv.addEventListener('mousedown',onmousedown);
canv.addEventListener('touchstart',onmousedown);


function render_testline(){
  let p = preproc(testline);
  let q = brush(p,{clean:true});
  let o = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200">`
  o += `<path fill-opacity="0.2" stroke="black" d="`
  for (let i = 0; i < q.length; i++){
    o += 'M';
    for (let j = 0; j < q[i].length; j++){
      o += q[i][j][0]/2+' '+q[i][j][1]/2+' ';
    }
    o += 'z ';
  }
  o += `" />`
  o += `</svg>`;
  pview.innerHTML = o;
}
render_testline();

function preproc(p){

  let q = [];
  for (let i = 0; i < p.length; i++){
    if (!i){
      if (i+1 < p.length){
        q.push([...p[i],Math.hypot(p[i+1][0]-p[i][0],p[i+1][1]-p[i][1])]);
      }else{
        q.push([...p[i],1]);
      }
    }else{

      q.push([...p[i],Math.hypot(p[i-1][0]-p[i][0],p[i-1][1]-p[i][1])]);
    }
  }
  // q = blur(q);
  // console.log(q);
  let r = squiggy.preprocess(q,[
    {type:'gauss-blur',axis:2,k:6},
    {type:'catmull-rom'},
    {type:'resample',step:6}
  ]);
  return r;
}
function onmousemove(e){
  if (mouse_is_down){
    let [x,y] = get_mouse_xy(e);
    if (polyline.length){
      let [lx,ly] = polyline[polyline.length-1];
      if (Math.pow(lx-x,2)+Math.pow(ly-y,2) < 4){
        return;
      }
    }
    polyline.push([x,y]);
    let p = preproc(polyline);
    
    curr_stroke = brush(p,{clean:false,out_intermediate:internals=[]});
  }
  e.preventDefault();
}
canv.addEventListener('mousemove',onmousemove);
canv.addEventListener('touchmove',onmousemove);

let work_blob_url = URL.createObjectURL( new Blob([
  `
  onmessage = function(e) {
    importScripts(e.data.url + '/squiggy.js');
    let o = e.data.polyline;
    let r;
    if (e.data.disturb){
      squiggy.__field_disturb(o,0.1);
      r = squiggy.__unmess(o,{hole_policy:2});
    }else{
      r = squiggy.__unmess(o);
    }
    postMessage(r);
  }
  `
], { type: "text/javascript" }));


function trace_render(p,w,h){
  let canv = document.createElement('canvas');
  canv.width = w;
  canv.height = h;
  let ctx = canv.getContext('2d');
  ctx.beginPath();
  for (let j = 0; j < p.length; j++){
    for (let k = 0; k < p[j].length+1; k++){
      ctx[k?'lineTo':'moveTo'](...p[j][k%p[j].length]);
    }
  }
  ctx.fill();
  let data = ctx.getImageData(0,0,canv.width,canv.height).data;
  let F = [];
  for (let i = 0; i < data.length; i+=4){
    F.push(data[i+3]>128?1:0);
  }
  let contours = FindContours.findContours(F,canv.width,canv.height);
  let r = [];
  for (let i = 0; i < contours.length; i++){
    r.push(FindContours.approxPolyDP(contours[i].points,1));
  }
  return r;
}


let workers = [];

function onmouseup(e){
  if (!mouse_is_down) return;
  mouse_is_down = false;
  let p = preproc(polyline);

  curr_stroke = brush(p,{clean:false,out_intermediate:internals=[]});
  if (!curr_stroke.length || !curr_stroke[0].length){
    return;
  }
  let idx = finished.length;
  finished.push(curr_stroke);
  finished[idx].wait = true;
  
  if (!use_rast.checked){

    let work = new Worker(work_blob_url);

    work.postMessage({
      url: window.location.href.replace(/index.html/g,''),
      polyline:curr_stroke[0],
      disturb:brush_fstr.includes('custom_brush')
    });
    curr_stroke = null;

    work.onmessage =function(e){
      finished[idx] = e.data;
      workers[idx] = null;
      // console.log(finished);
    }
    workers[idx] = work;
  }else{
    finished[idx] = trace_render(curr_stroke,canv.width,canv.height);
    curr_stroke = null;
  }

}

document.body.addEventListener('mouseup',onmouseup);
document.body.addEventListener('touchend',onmouseup);



function idx2color(idx,alpha=0.8){
  idx++;
  for (let i = 0; i < 10; i++){
    idx ^= idx << 17;
    idx ^= idx >> 13;
    idx ^= idx << 5;
  }
  function mdr(x){
    return x * 0.5 + 0.4 * 255;
  }
  return `rgba(${mdr((idx >> 16) & 0xff)}, ${mdr((idx >> 8) & 0xff)}, ${mdr(idx & 0xff)}, ${alpha})`
}

function loop(){
  // console.log(curr_stroke)
  requestAnimationFrame(loop);
  ctx.clearRect(0,0,canv.width,canv.height);
  ctx.lineJoin='round';
  ctx.lineCap='round';

  
  for (let i = 0; i < finished.length; i++){
    if (finished[i].wait){
      ctx.strokeStyle="rgba(0,0,0,0.5)";  
      ctx.lineWidth =1;
    }else{
      ctx.strokeStyle="rgb(0,0,0)";
      ctx.lineWidth =2;
    }
    ctx.fillStyle = idx2color(i);
    ctx.beginPath();
    for (let j = 0; j < finished[i].length; j++){
      for (let k = 0; k < finished[i][j].length+1; k++){
        ctx[k?'lineTo':'moveTo'](...finished[i][j][k%finished[i][j].length]);
      }
      // draw_poly(finished[i][j],true);
      // draw_poly(finished[i][j],true,true);
    }
    ctx.fill();
    ctx.stroke();
    
  }
  
  if (curr_stroke && curr_stroke.length){
    ctx.lineWidth =1;
    // if (internals.length == 2){
    //   let knots = internals[0];
    //   ctx.lineWidth =1;
    //   ctx.strokeStyle="rgba(0,0,0,0.2)";
    //   for (let i = 0; i < knots.length; i++){
    //     draw_poly(knots[i],true);
    //   }
    // }
    let raw = internals[internals.length-1];
    ctx.strokeStyle="rgba(0,0,0,0.5)";
    // ctx.fillStyle="rgba(255,0,0,0.1)"
    ctx.fillStyle = idx2color(finished.length);
    draw_poly(raw,true,true);

    // if (!mouse_is_down){
    //   ctx.lineWidth =2;
    //   ctx.strokeStyle="rgb(0,0,0)";
    //   for (let i = 0; i < curr_stroke.length; i++){
    //     draw_poly(curr_stroke[i],true);
    //   }
    // }
    
  }
}

loop();



function draw_poly(poly,end,fill,dx,dy){
  dx = dx || 0;
  dy = dy || 0;
  ctx.beginPath();
  for (let j = 0; j < poly.length; j++){
    try{
    ctx[j?'lineTo':'moveTo'](poly[j][0]+dx,poly[j][1]+dy);
    }catch(e){}
  }
  if (end) ctx.closePath();
  if (fill)ctx.fill();
  ctx.stroke();
  
}

// // let p = [[52.99999999999999,109.99999999999999],[53.504112050761364,104.02121491937723],[56.50431292982985,98.8251784794322],[60.05293318218216,93.98706993325476],[63.11511965371827,88.8273205194226],[66.46728719673374,83.85107969289966],[70.0703466263165,79.05337578927089],[73.68588003352937,74.26506521232126],[78.001,71]] 
// // let w = [18.875570876571167,18.473531327931344,18.24336336286727,18.137747352626356,18.173630295167452,18.277006726263824,18.410054181396625,18.65901835323146,18.958403457638692]


// // let p = [[179.99999999999997,305.99999999999994],[180,299.99999999999994],[182.001,297]]
// // let w = [30,30,30]

// // // let p = [[459,475.99999999999994],[462.18358379232575,470.91425578334486],[466.7160390860026,466.98273584687996],[471.4126649548975,463.2488765233881],[476.1080848108887,459.5135007222185],[480.9797894054326,456.0111451800869],[486.39081663280257,453.41869762137696],[491.2215782412751,449.86008240164495],[496.44643202647944,446.91035310504225],[501.4816875799282,443.6475013597949],[506.77514254413313,440.8227297686864],[513.001,435]]
// // // let w = [18.558375244920644,17.800032570009748,17.303076789122915,16.905750297172403,16.705630793941666,16.604092983695217,16.506492821646408,16.53528058914591,16.63334739371262,16.856889757918037,17.32485316472902,18.51608890874642]

// let p = [[532,440],[538,440],[544,440.00000000000006],[549.915924752382,438.99908325813095],[555.6157414311833,437.1250262077566],[561.5405655046011,436.1782106507188],[566.001,435]] 
// let w = [2,17.541602860237365,28.58696591284901,31.940627177919676,26.632360777404262,14.197866658992421,2.0000000000000036]

// for (let i = 0; i < p.length; i++){
//   p[i][0]=(p[i][0]-400)*4;
//   p[i][1]=(p[i][1]-400)*4;
//   w[i]*=3;
// }
// p = p.slice(2,-2);
// w = w.slice(2,-2);
// // console.log(w);
// // p = [[100,100],[200,100],[300,100]]
// // w = [70,60,60];

// // let p = [[100,100],[200,200],[300,200],[300,300]];
// // let w = [20,50,30,60];

// // let p = [[100,100],[110,100],[120,100],[130,110],[140,120],[150,130]];
// // let w = [10,20,30,30,20,10];

// // let p = [[286,166],[291.922649401341,166.96032498082428],[300.001,170]] ;
// // let w = [2,30.810905507625854,2.0000000000000036];


// let q = squiggy.__balltrack(p,w);
// console.log(q);
// let canv = document.createElement("canvas");
// canv.width  = 800;
// canv.height = 600;
// let ctx = canv.getContext('2d');
// document.body.appendChild(canv);
// draw_poly(q);

// ctx.strokeStyle='rgba(0,0,0,0.1)'

// for (let i = 0; i < p.length; i++){
//   ctx.beginPath();
//   ctx.arc(...p[i],w[i],0,Math.PI*2);
//   ctx.stroke();
// }

// draw_poly(p);
