// Berlin arrivals hall. +Y is up and passengers enter from the open +Z side.
const TAU = Math.PI * 2;
const caches = new WeakMap();
function modelling(T) {
  if (caches.has(T)) return caches.get(T);
  const geometry = new Map(), materials = new Map();
  function finish(colour, roughness = .76, metalness = 0) {
    const key = [colour,roughness,metalness].join('/');
    if (!materials.has(key)) materials.set(key,new T.MeshStandardMaterial({color:colour,roughness,metalness}));
    return materials.get(key);
  }
  function part(parent,g,m,x=0,y=0,z=0) {
    const o=new T.Mesh(g,m);o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;parent.add(o);return o;
  }
  function shapedBox(w,h,d,r) {
    const key=[w,h,d,r].join(':');
    if(geometry.has(key))return geometry.get(key);
    r=Math.min(r,w*.46,h*.46,d*.46);
    const g=r?new T.BoxGeometry(1,1,1,5,5,5):new T.BoxGeometry(w,h,d);
    if(r){
      const a=g.attributes.position,n=g.attributes.normal;
      const roundedAxis=(v,length)=>[-length/2,-length/2+r*.40,-length/2+r,length/2-r,length/2-r*.40,length/2][Math.round((v+.5)*5)];
      for(let i=0;i<a.count;i++){
        const nx=n.getX(i),ny=n.getY(i),nz=n.getZ(i);
        const x=roundedAxis(a.getX(i),w),y=roundedAxis(a.getY(i),h),z=roundedAxis(a.getZ(i),d);
        const cx=T.MathUtils.clamp(x,r-w/2,w/2-r),cy=T.MathUtils.clamp(y,r-h/2,h/2-r),cz=T.MathUtils.clamp(z,r-d/2,d/2-r);
        const vx=x-cx,vy=y-cy,vz=z-cz,len=Math.hypot(vx,vy,vz)||1;
        const px=cx+r*vx/len,py=cy+r*vy/len,pz=cz+r*vz/len;
        a.setXYZ(i,px,py,pz);n.setXYZ(i,vx/len,vy/len,vz/len);
        if(ny)g.attributes.uv.setXY(i,.5+px/w,.5-ny*pz/d);
        else if(nx)g.attributes.uv.setXY(i,.5-nx*pz/d,.5+py/h);
        else g.attributes.uv.setXY(i,.5+nz*px/w,.5+py/h);
      }
    }
    geometry.set(key,g);return g;
  }
  function box(parent,x,y,z,w,h,d,m,r=0){return part(parent,shapedBox(w,h,d,r),m,x,y,z);}
  function tube(parent,a,b,r,m,rb=r,segments=10){
    const dir=new T.Vector3(b[0]-a[0],b[1]-a[1],b[2]-a[2]),length=dir.length();
    const key=['c',r,rb,length,segments].join(':');
    if(!geometry.has(key))geometry.set(key,new T.CylinderGeometry(rb,r,length,segments));
    const rod=part(parent,geometry.get(key),m,(a[0]+b[0])/2,(a[1]+b[1])/2,(a[2]+b[2])/2);
    rod.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),dir.normalize());return rod;
  }
  function art(w,h,paint) {
    const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;
    paint(canvas.getContext('2d'),w,h);
    const map=new T.CanvasTexture(canvas);map.colorSpace=T.SRGBColorSpace;map.anisotropy=4;return map;
  }
  function printed(parent,x,y,z,w,h,map,rotation=0,lit=false){
    const m=lit?new T.MeshBasicMaterial({map}):new T.MeshStandardMaterial({map,roughness:.75});
    const o=part(parent,new T.PlaneGeometry(w,h),m,x,y,z);o.rotation.y=rotation;o.castShadow=false;return o;
  }
  // Retain interactive groups as separate raycast targets while combining the static mesh calls.
  function batch(group) {
    group.updateWorldMatrix(true,true);
    const inverse=new T.Matrix4().copy(group.matrixWorld).invert(), batches=new Map();
    group.traverse(o=>{
      if(!o.isMesh||o.isSkinnedMesh||Array.isArray(o.material))return;
      const key=o.material.uuid+o.castShadow;
      if(!batches.has(key))batches.set(key,[]);batches.get(key).push(o);
    });
    for(const objects of batches.values()){
      if(objects.length<2)continue;
      let vertices=0,indexCount=0;
      for(const o of objects){vertices+=o.geometry.attributes.position.count;indexCount+=o.geometry.index?.count??o.geometry.attributes.position.count;}
      const pos=new Float32Array(vertices*3),norm=new Float32Array(vertices*3),uv=new Float32Array(vertices*2);
      const idx=vertices<65536?new Uint16Array(indexCount):new Uint32Array(indexCount);
      const v=new T.Vector3(),matrix=new T.Matrix4(),normalMatrix=new T.Matrix3();let base=0,offset=0;
      for(const o of objects){
        const geom=o.geometry,attrs=geom.attributes;
        matrix.multiplyMatrices(inverse,o.matrixWorld);normalMatrix.getNormalMatrix(matrix);
        for(let i=0;i<attrs.position.count;i++){
          v.fromBufferAttribute(attrs.position,i).applyMatrix4(matrix).toArray(pos,(base+i)*3);
          v.fromBufferAttribute(attrs.normal,i).applyMatrix3(normalMatrix).normalize().toArray(norm,(base+i)*3);
          if(attrs.uv){uv[(base+i)*2]=attrs.uv.getX(i);uv[(base+i)*2+1]=attrs.uv.getY(i);}
        }
        const count=geom.index?.count??attrs.position.count;
        for(let i=0;i<count;i++)idx[offset+i]=base+(geom.index?geom.index.getX(i):i);
        base+=attrs.position.count;offset+=count;o.removeFromParent();
      }
      const geom=new T.BufferGeometry();geom.setAttribute('position',new T.BufferAttribute(pos,3));geom.setAttribute('normal',new T.BufferAttribute(norm,3));
      geom.setAttribute('uv',new T.BufferAttribute(uv,2));geom.setIndex(new T.BufferAttribute(idx,1));
      const merged=part(group,geom,objects[0].material);merged.castShadow=objects[0].castShadow;
    }
    return group;
  }
  const kit={finish,part,box,tube,art,printed,batch};caches.set(T,kit);return kit;
}

function packedCase(T,colour,ribbonColour,extended=true) {
  const {box,tube,finish,batch}=modelling(T), bag=new T.Group();
  const shell=finish(colour,.51,.11), zip=finish('#4e5660',.48,.4), rubber=finish('#212832',.86);
  const chrome=finish('#b2b6b8',.32,.68), ribbon=finish(ribbonColour||'#b88b68',.92);
  box(bag,0,.354,0,.446,.588,.277,rubber,.055);
  box(bag,0,.355,.030,.432,.572,.252,shell,.049);
  box(bag,0,.355,-.091,.432,.573,.107,shell,.040);
  box(bag,0,.355,-.043,.443,.581,.014,zip,.006);
  for(const x of [-.16,-.106,-.053,0,.053,.106,.16]){
    const length=.44-Math.abs(x)*.32;
    box(bag,x,.355,.151,.018,length,.017,shell,.008);
  }
  for(const x of [-.167,.167])for(const z of [-.096,.096]){
    tube(bag,[x-.021,.044,z],[x+.021,.044,z],.042,rubber,.042,14);
    box(bag,x,.069,z,.052,.055,.039,zip,.012);
  }
  for(const x of [-.073,.073]){
    const top=extended?.805:.650;
    tube(bag,[x,.568,-.101],[x,top,-.101],.010,chrome);
    box(bag,x,.622,-.10,.031,.032,.04,rubber,.007);
  }
  box(bag,0,extended?.82:.655,-.101,.188,.032,.038,rubber,.012);
  box(bag,0,.653,.029,.135,.021,.03,rubber,.009);
  box(bag,.216,.390,-.018,.021,.160,.036,rubber,.008);
  if(ribbonColour){
    box(bag,.083,.615,.12,.044,.037,.045,ribbon,.013);
    const knot=box(bag,.098,.543,.159,.040,.137,.011,ribbon,.004);knot.rotation.z=.22;
    const tail=box(bag,.053,.557,.157,.032,.120,.010,ribbon,.004);tail.rotation.z=-.26;
    const loop=box(bag,.079,.638,.10,.074,.023,.050,ribbon,.010);loop.rotation.z=.24;
  }
  const paper=finish('#dfd6bd',.93);
  const tag=box(bag,-.109,.552,.164,.055,.114,.006,paper,.002);tag.rotation.z=-.17;
  for(let i=0;i<7;i++){
    const stripe=box(bag,-.118+i*.004,.528,.168,.0014,.025,.001,zip);
    stripe.rotation.z=-.17;
  }
  return batch(bag);
}

/** The handle is at (0,.82,-.10), wheels touch y=0, model front faces +Z. */
export function createRollingBag(T) {
  const bag=packedCase(T,'#263950','#eab63e',true);bag.name='Suitcase with a yellow ribbon';
  return bag;
}

function baggageTrack(s,straight,radius) {
  const side=straight*2,arc=radius*Math.PI,total=side*2+arc*2;
  let d=((s%total)+total)%total;
  if(d<side)return {x:-straight+d,z:radius,dx:1,dz:0};
  d-=side;
  if(d<arc){
    const a=Math.PI/2-d/radius;return {x:straight+Math.cos(a)*radius,z:Math.sin(a)*radius,dx:Math.sin(a),dz:-Math.cos(a)};
  }
  d-=arc;
  if(d<side)return {x:straight-d,z:-radius,dx:-1,dz:0};
  d-=side;
  const a=-Math.PI/2-d/radius;return {x:-straight+Math.cos(a)*radius,z:Math.sin(a)*radius,dx:Math.sin(a),dz:-Math.cos(a)};
}

// The closed stadium surfaces preserve evenly spaced slats through both bends.
function makeRing(T,parent,m,x,z,half,outer,inner,top,bottom,innerTop=top) {
  const {part}=modelling(T);const vertices=[],normals=[],uv=[],indices=[];
  const perimeter=4*half+TAU*outer, count=112;
  const profile=[[outer-.027,bottom],[outer,bottom+.027],[outer,top-.026],[outer-.017,top-.006],[outer-.045,top],[inner+.025,innerTop],[inner,innerTop-.020],[inner,bottom]];
  for(let i=0;i<=count;i++){
    const p=baggageTrack(i/count*perimeter,half,outer);
    const nx=-p.dz,nz=p.dx;
    for(let j=0;j<profile.length;j++){
      const [rr,yy]=profile[j],dist=rr-outer;
      vertices.push(x+p.x+nx*dist,yy,z+p.z+nz*dist);uv.push(i/count,j/(profile.length-1));
      if(i<count&&j+1<profile.length){const k=i*profile.length+j,q=k+profile.length;indices.push(k,q,k+1,q,q+1,k+1);}
    }
  }
  const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(vertices,3));geo.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geo.setIndex(indices);geo.computeVertexNormals();
  return part(parent,geo,m);
}

function signTexture(art,heading,sub,style={}) {
  return art(1024,256,(c,w,h)=>{
    c.fillStyle=style.bg||'#1b2a34';c.fillRect(0,0,w,h);
    c.fillStyle=style.fg||'#f3e8cc';c.textBaseline='middle';c.textAlign='left';
    const pad=39, icon=style.icon;let start=pad;
    if(icon){
      const side=149; const ix=pad,iy=(h-side)/2;
      c.fillStyle=style.iconBg||'#e8d6ad';c.fillRect(ix,iy,side,side);c.fillStyle=style.bg||'#1b2a34';
      if(icon==='train'){
        c.beginPath();c.roundRect(ix+31,iy+19,87,92,15);c.fill();c.fillStyle='#eddfc1';c.fillRect(ix+44,iy+33,61,35);
        c.beginPath();c.arc(ix+51,iy+91,6,0,TAU);c.arc(ix+100,iy+91,6,0,TAU);c.fill();
        c.strokeStyle=style.bg||'#1b2a34';c.lineWidth=8;
        for(const xx of [48,101]){c.beginPath();c.moveTo(ix+xx,iy+108);c.lineTo(ix+xx+(xx<60?-17:17),iy+131);c.stroke();}
      }else if(icon==='bag'){
        c.lineWidth=7;c.strokeStyle=style.bg||'#1b2a34';c.strokeRect(ix+57,iy+34,36,16);
        c.beginPath();c.roundRect(ix+29,iy+49,91,66,7);c.fill();
        c.fillStyle='#eddfc1';c.fillRect(ix+46,iy+51,5,62);c.fillRect(ix+99,iy+51,5,62);
      }else{
        c.font='bold 84px Arial';c.textAlign='center';c.fillText(icon,ix+side/2,iy+side/2+3);c.textAlign='left';
      }
      start=ix+side+30;
    }
    c.fillStyle=style.fg||'#f3e8cc';
    c.font='600 '+(style.size||74)+'px Arial';c.fillText(heading,start,sub?99:127,w-start-27);
    if(sub){c.fillStyle=style.subColour||'#c4c9c9';c.font='39px Arial';c.fillText(sub,start,174,w-start-27);}
  });
}

export function createAirport(T,scene) {
  const {finish,part,box,tube,art,printed,batch}=modelling(T);
  const root=new T.Group(), hall=new T.Group();root.name='Berlin arrivals';root.add(hall);scene.add(root);
  const metal=finish('#929c9d',.38,.56), steel=finish('#657175',.45,.55), graphite=finish('#313a3d',.68,.23);
  const warmMetal=finish('#927e68',.54,.42), cream=finish('#d7d4c6'), plaster=finish('#bdb7a8');
  const rubber=finish('#343c40',.85), seam=finish('#242b2e',.80);
  const daylight=new T.MeshBasicMaterial({color:'#d9e3de'});
  const glow=new T.MeshBasicMaterial({color:'#ffdfad'});
  let seed=1918;const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
  const floorMap=art(768,768,(c,w,h)=>{
    c.fillStyle='#9d9c95';c.fillRect(0,0,w,h);
    const tile=128;
    for(let y=0;y<h;y+=tile)for(let x=0;x<w;x+=tile){
      const tone=Math.round(150+random()*12);c.fillStyle='rgb('+tone+','+(tone-1)+','+(tone-7)+')';c.fillRect(x,y,tile,tile);
      c.fillStyle='rgba(55,60,59,.36)';c.fillRect(x,y,tile,1.15);c.fillRect(x,y,1.15,tile);
      c.fillStyle='rgba(225,222,207,.36)';c.fillRect(x+1.3,y+1.3,tile-1,.60);
    }
    for(let i=0;i<57000;i++){const light=random()>.53;c.fillStyle=light?'rgba(233,233,220,.19)':'rgba(71,76,74,.11)';
      c.fillRect(random()*w,random()*h,.6+random()*1.8,.5+random()*1.0);}
  });
  floorMap.wrapS=floorMap.wrapT=T.RepeatWrapping;floorMap.repeat.set(2.26,1.49);
  const stone=new T.MeshStandardMaterial({map:floorMap,roughness:.59,metalness:.025});
  const floor=part(hall,new T.PlaneGeometry(11.8,7.80),stone,0,0,-.10);floor.rotation.x=-Math.PI/2;
  box(hall,0,-.07,-.1,11.8,.12,7.8,graphite);
  // Evening outside the glass. Distant apron lights are deliberately sparse.
  const sky=art(1024,384,(c,w,h)=>{
    const gradient=c.createLinearGradient(0,0,0,h);gradient.addColorStop(0,'#384b68');gradient.addColorStop(.57,'#657b92');gradient.addColorStop(.76,'#9a9b9c');gradient.addColorStop(.78,'#586672');gradient.addColorStop(1,'#43555e');c.fillStyle=gradient;c.fillRect(0,0,w,h);
    c.fillStyle='#485968';for(let x=0;x<w;x+=7){const height=6+random()*8;c.fillRect(x,h*.77-height,8,height+8);}
    for(let i=0;i<15;i++){
      const x=random()*w,y=h*.765-random()*15,width=28+random()*78;
      c.fillStyle='#4a5862';c.fillRect(x,y,width,18);
      for(let wx=x+4;wx<x+width-3;wx+=7)if(random()>.42){
        c.fillStyle=random()>.4?'#d4a468':'#b1bac0';c.fillRect(wx,y+4,2.5,2.6);
      }
    }
    for(let i=0;i<56;i++){const x=random()*w,y=h*(.775+random()*.112);c.fillStyle=random()>.34?'#edbc79':'#a1bbc6';c.fillRect(x,y,1.5+random()*2.3,1.4);}
  });
  const view=printed(hall,0,2.1,-4.07,12.2,4.6,sky,0,true);
  const glass=new T.MeshBasicMaterial({color:'#b5d4de',transparent:true,opacity:.047,depthWrite:false,side:T.DoubleSide});
  const p=part(hall,new T.PlaneGeometry(11.70,3.1),glass,0,2.03,-3.92);p.castShadow=false;
  box(hall,0,.224,-3.955,11.80,.448,.115,plaster);
  box(hall,0,.462,-3.90,11.8,.055,.168,metal,.008);
  for(let i=0;i<10;i++){
    const x=-5.89+i*1.308;
    box(hall,x,2.05,-3.90,.042,3.17,.105,graphite,.005);
    if(i%3===0){box(hall,x-.08,1.84,-3.57,.285,3.68,.30,warmMetal,.027);
      box(hall,x-.081,.13,-3.57,.31,.25,.325,steel,.009);}
  }
  for(const y of [1.53,2.91,3.57])box(hall,0,y,-3.90,11.8,.047,.095,graphite,.006);
  box(hall,0,3.66,-.10,11.83,.12,7.94,plaster);
  for(let x=-5.72;x<5.86;x+=.22)box(hall,x,3.58,-.10,.047,.063,7.83,warmMetal);
  for(const x of [-4.65,-1.45,1.75,4.33])for(const z of [-2.78,.20]){
    box(hall,x,3.532,z,1.68,.047,.208,graphite,.009);
    box(hall,x,3.503,z,1.62,.012,.151,daylight,.004);
  }
  const leftWall=part(hall,new T.PlaneGeometry(7.78,3.94),cream,-5.88,1.94,-.10);
  leftWall.rotation.y=Math.PI/2;
  box(hall,-5.88,.125,-.10,.08,.245,7.79,steel);
  for(const [lo,hi,bottom,top] of [[-3.99,-.41,0,3.91],[1.35,3.79,0,3.91],[-.41,1.35,2.46,3.91]]){
    const side=part(hall,new T.PlaneGeometry(hi-lo,top-bottom),cream,5.88,(bottom+top)/2,(lo+hi)/2);
    side.rotation.y=-Math.PI/2;
    if(!bottom)box(hall,5.88,.125,(lo+hi)/2,.08,.245,hi-lo,steel);
  }
  // Airport identity integrated into a wall panel.
  const brand=art(768,330,(c,w,h)=>{
    c.fillStyle='#c7c6b9';c.fillRect(0,0,w,h);c.fillStyle='#aa252e';c.font='bold 130px Arial';c.fillText('BER',32,143);
    c.fillStyle='#303c40';c.font='600 44px Arial';c.fillText('Flughafen Berlin Brandenburg',34,205);
    c.font='normal 29px Arial';c.fillStyle='#505956';c.fillText('Terminal 1',35,260);
  });
  box(hall,-5.816,1.79,-1.26,.054,1.16,2.70,steel,.018);
  printed(hall,-5.783,1.79,-1.26,2.65,1.113,brand,Math.PI/2);
  // Grey perforated airport bench, bolted to a common beam.
  function bench(cx,z,count){
    box(hall,cx,.335,z,count*.50+.12,.075,.075,steel,.014);
    for(const x of [cx-count*.19,cx+count*.19]){tube(hall,[x,.045,z],[x,.353,z],.031,metal);box(hall,x,.042,z,.075,.051,.484,steel,.018);}
    for(let i=0;i<count;i++){
      const x=cx+(i-(count-1)/2)*.51;
      box(hall,x,.461,z+.030,.474,.057,.43,graphite,.022);
      const back=box(hall,x,.719,z-.161,.464,.424,.060,graphite,.024);back.rotation.x=-.17;
      for(let row=0;row<3;row++)for(let col=0;col<7;col++){
        box(hall,x+(col-3)*.045,.61+row*.093,z-.117-row*.012,.015,.005,.002,steel);
      }
    }
  }
  bench(-4.21,-3.29,4);
  box(hall,-4.28,2.76,-3.53,1.79,.50,.069,graphite,.018);
  printed(hall,-4.28,2.76,-3.491,1.75,.456,signTexture(art,'Ankunft','Arrivals',{size:74}),0,true);
  // Carousel 03. Thick steel lips, lower kick plate, dark slats and a raised central plinth.
  const bx=-1.60,bz=-1.60,half=1.91,outer=.88,inner=.44,movingRadius=.646;
  makeRing(T,hall,graphite,bx,bz,half,outer-.042,inner,.148,.012);
  makeRing(T,hall,metal,bx,bz,half,outer,inner,.455,.14,.477);
  makeRing(T,hall,rubber,bx,bz,half,outer-.052,inner+.013,.483,.449,.505);
  makeRing(T,hall,steel,bx,bz,half,.455,.394,.533,.476);
  // Low center island conceals the empty part beneath the conveyor's return path.
  box(hall,bx,.371,bz,half*2,.358,.813,steel);
  for(const end of [-1,1])tube(hall,[bx+end*half,.19,bz],[bx+end*half,.55,bz],.405,steel,.405,42);
  box(hall,bx,.546,bz,3.72,.024,.80,steel,.010);
  const perp=4*half+TAU*movingRadius;
  // Every slat seam shares a phase with the luggage; the broad belt remains one static surface.
  const trackMarks=new T.InstancedMesh(new T.BoxGeometry(.009,.006,.314),seam,134);
  root.add(trackMarks);trackMarks.receiveShadow=true;trackMarks.frustumCulled=false;
  const tempObject=new T.Object3D();
  function beltAt(pathDistance,lateral=0){
    const pos=baggageTrack(pathDistance,half,movingRadius);
    return {x:bx+pos.x-pos.dz*lateral,z:bz+pos.z+pos.dx*lateral,angle:-Math.atan2(pos.dz,pos.dx)};
  }
  // Fixed pickup bays hold the two recently unloaded cases clear of the moving belt.
  function apron(x,w){
    box(hall,x,.242,-.621,w,.367,.46,steel,.039);
    box(hall,x,.444,-.621,w+.02,.045,.472,rubber,.014);
    for(let n=-3;n<=3;n++)box(hall,x+n*.068,.470,-.620,.016,.008,.354,graphite,.004);
  }
  apron(-.93,.68);apron(-3.20,.65);
  const bag=createRollingBag(T);bag.position.set(-.93,.477,-.581);bag.rotation.y=-.10;root.add(bag);
  const wrongBag=packedCase(T,'#34404b','#a75e4c',false);wrongBag.name='A similar suitcase';wrongBag.position.set(-3.20,.477,-.595);wrongBag.rotation.y=.17;root.add(wrongBag);
  const moving=[['#4b5362',.12],['#806751',3.75],['#4e6664',6.42],['#6e5153',9.20]].map(([colour,offset],i)=>{
    const item=packedCase(T,colour,null,false);item.name='Luggage on the belt';root.add(item);
    const carriage=new T.Group();root.add(carriage);carriage.add(item);
    // Flat on the belt with its broad face up, keeping the profile readable under the signs.
    item.rotation.set(-Math.PI/2,-Math.PI/2,0,'YXZ');
    item.scale.setScalar(.91+(i%2)*.07);item.position.set(-.32,.144,.004);
    return {carriage,offset};
  });
  const labelMap=signTexture(art,'Gepäckausgabe','Baggage reclaim',{icon:'bag',size:66});
  for(const x of [-2.76,-.59])tube(hall,[x,2.67,-2.13],[x,3.60,-2.13],.013,graphite);
  box(hall,-1.70,2.52,-2.13,3.71,.63,.11,graphite,.022);
  printed(hall,-1.85,2.52,-2.07,3.30,.574,labelMap,0,true);
  box(hall,-.061,2.52,-2.060,.28,.55,.015,steel,.004);
  const number=art(96,144,(c,w,h)=>{c.fillStyle='#293b40';c.fillRect(0,0,w,h);c.fillStyle='#ebdcbb';c.font='bold 62px Arial';c.textAlign='center';c.fillText('03',w/2,90);});
  printed(hall,-.061,2.52,-2.049,.267,.49,number,0,true);
  // The greeters stand beyond a waist-high divider rather than in the player's walking lane.
  for(const x of [.54,1.96]){tube(hall,[x,.025,-2.47],[x,1.02,-2.47],.029,metal);tube(hall,[x,.05,-2.47],[x,.014,-2.47],.105,steel);}
  tube(hall,[.54,1.018,-2.47],[1.96,1.018,-2.47],.025,metal);
  const clearPanel=part(hall,new T.PlaneGeometry(1.36,.706),glass,1.25,.61,-2.47);clearPanel.castShadow=false;
  const ticket=new T.Group();ticket.name='Fahrkartenautomat';ticket.position.set(3.05,0,-2.59);root.add(ticket);
  const yellow=finish('#d7a43e',.55,.15), offwhite=finish('#dcded6',.52,.08);
  box(ticket,0,.072,0,.77,.144,.55,graphite,.038);
  box(ticket,0,.951,-.020,.702,1.75,.435,yellow,.047);
  box(ticket,0,1.25,.205,.597,1.045,.076,graphite,.028);
  box(ticket,0,1.422,.252,.491,.421,.020,steel,.009);
  const screenMap=art(440,340,(c,w,h)=>{
    c.fillStyle='#253b4b';c.fillRect(0,0,w,h);c.fillStyle='#e6e6d9';c.font='bold 32px Arial';c.fillText('Fahrkarten',21,47);
    c.fillStyle='#9ab0b6';c.font='21px Arial';c.fillText('Bitte wählen Sie',22,87);
    c.fillStyle='#d7ac55';c.fillRect(20,110,400,72);c.fillStyle='#263844';c.font='bold 28px Arial';c.fillText('Berlin ABC',35,156);
    c.fillStyle='#516673';c.fillRect(20,201,400,56);c.fillStyle='#f4edde';c.font='22px Arial';c.fillText('Weitere Fahrkarten',36,238);
    c.fillStyle='#c0cec9';c.font='19px Arial';c.fillText('DE     EN',23,311);
  });
  printed(ticket,0,1.423,.266,.457,.353,screenMap,0,true);
  box(ticket,-.124,1.078,.259,.226,.099,.04,offwhite,.009);
  box(ticket,-.124,1.089,.286,.143,.018,.016,graphite,.005);
  box(ticket,.152,1.077,.265,.107,.162,.058,steel,.015);
  for(let j=0;j<3;j++)for(let i=0;i<3;i++)box(ticket,.125+i*.028,1.052+j*.026,.301,.017,.016,.008,offwhite,.003);
  box(ticket,0,.786,.252,.342,.131,.042,steel,.013);
  box(ticket,0,.791,.279,.285,.074,.012,graphite,.005);
  const slip=box(ticket,0,.783,.293,.124,.030,.025,offwhite,.004);slip.rotation.x=-.19; // exposed after purchase
  const ticketFace=signTexture(art,'Fahrkarten','Tickets',{bg:'#e0ad41',fg:'#26383e',subColour:'#34494f',size:79});
  printed(ticket,0,1.827,.213,.655,.160,ticketFace,0,true);
  box(hall,3.05,2.46,-3.41,1.75,.468,.06,graphite,.012);
  printed(hall,3.05,2.46,-3.372,1.71,.423,signTexture(art,'Fahrkarten','Tickets',{icon:'↧',size:79}),0,true);
  const bin=new T.Group();bin.position.set(3.86,0,-2.54);hall.add(bin);
  tube(bin,[0,.014,0],[0,.72,0],.187,steel,.202,30);
  tube(bin,[0,.726,0],[0,.752,0],.207,metal,.207,30);
  tube(bin,[0,.751,0],[0,.756,0],.159,graphite,.159,30);
  box(bin,0,.486,.19,.124,.130,.011,offwhite,.004);
  const train=new T.Group();train.name='Weg zum Bahnhof';root.add(train);
  const aperture=new T.Group();aperture.position.set(5.84,0,.47);aperture.rotation.y=-Math.PI/2;train.add(aperture);
  const corridor=finish('#848f91'), rail=finish('#667378',.52,.34);
  for(const xx of [-.88,.88]){
    box(aperture,xx,1.23,.04,.123,2.45,.105,graphite,.009);
    box(aperture,xx,1.19,-.90,.095,2.37,1.89,corridor);
    const inset=box(aperture,xx*.97,1.12,-.96,.049,1.86,1.90,rail);
    inset.castShadow=false;
    tube(aperture,[xx*.88,.91,.028],[xx*.88,.91,-1.79],.025,metal);
  }
  box(aperture,0,2.47,-.85,1.88,.11,1.9,plaster);
  box(aperture,0,.013,-.91,1.83,.024,1.91,graphite);
  // Narrow tread noses lead down into the station corridor.
  for(let i=0;i<8;i++)box(aperture,0,.032,-.15-i*.20,1.58,.016,.024,metal);
  const beyond=art(320,440,(c,w,h)=>{
    const g=c.createLinearGradient(0,0,0,h);g.addColorStop(0,'#8d9aa0');g.addColorStop(.40,'#5a6873');g.addColorStop(1,'#344552');c.fillStyle=g;c.fillRect(0,0,w,h);
    c.fillStyle='#b0babd';for(let i=0;i<9;i++)c.fillRect(0,230+i*i*2.9,w,2+i*.35);
    c.fillStyle='#e9e3bc';c.fillRect(109,48,103,7);
  });
  printed(aperture,0,1.13,-1.86,1.77,2.25,beyond,0,true);
  box(aperture,0,2.39,.051,1.94,.312,.125,graphite,.012);
  printed(aperture,0,2.39,.121,1.84,.264,signTexture(art,'Bahnhof','Railway station',{icon:'train',size:80}),0,true);
  box(train,4.59,2.74,-.52,2.26,.523,.106,graphite,.016);
  printed(train,4.59,2.74,-.461,2.19,.464,signTexture(art,'Bahnhof  →','Trains to Berlin',{icon:'train',size:73}),0,true);
  for(const x of [3.73,5.43])tube(train,[x,2.97,-.52],[x,3.59,-.52],.012,graphite);
  // An amber tactile strip leads to the turn toward the station without obstructing the floor.
  const guidance=finish('#bfac78',.87);
  for(let z=-.24;z<1.54;z+=.28)for(let i=0;i<3;i++){
    box(hall,4.66+i*.052,.008,z,.014,.009,.24,guidance,.004);
  }
  for(let x=4.84;x<5.82;x+=.25)for(let i=0;i<3;i++)box(hall,x,.008,.46+i*.045,.222,.009,.013,guidance,.004);

  batch(hall);batch(train);
  // Keep the little emerging ticket separate so the kiosk can react to the purchase.
  ticket.remove(slip);batch(ticket);ticket.add(slip);slip.visible=false;
  const spots={
    bag:{x:-.93,z:.10},wrongBag:{x:-3.20,z:.10},
    ticket:{x:3.05,z:-1.88},train:{x:4.96,z:.52}
  };
  const obstacles=[
    {minX:-4.43,maxX:1.23,minZ:-2.51,maxZ:-.70},
    {minX:-1.29,maxX:-.57,minZ:-.87,maxZ:-.37},
    {minX:-3.55,maxX:-2.85,minZ:-.87,maxZ:-.37},
    {minX:2.64,maxX:3.46,minZ:-2.89,maxZ:-2.30},
    {minX:3.63,maxX:4.09,minZ:-2.77,maxZ:-2.31},
    {minX:-5.30,maxX:-3.12,minZ:-3.55,maxZ:-3.00},
    {minX:.44,maxX:2.04,minZ:-3.65,maxZ:-2.42}
  ];
  const peopleReady=typeof window==='undefined'?Promise.resolve():addReunion(T,root).catch(error=>{
    console.warn('The airport greeters could not load.',error);
  });
  let previousTick=-1;
  function update(time){
    // At walking distance a 30 Hz update is sufficient for the conveyor's slow mechanical motion.
    const tick=Math.floor(time*30);
    if(tick===previousTick)return;previousTick=tick;
    const travel=(tick/30*.108)%perp;
    for(let i=0;i<trackMarks.count;i++){
      const point=beltAt(perp*i/trackMarks.count+travel);
      tempObject.position.set(point.x,.496,point.z);tempObject.rotation.set(.061,point.angle,0,'YXZ');tempObject.updateMatrix();
      trackMarks.setMatrixAt(i,tempObject.matrix);
    }
    trackMarks.instanceMatrix.needsUpdate=true;
    for(const {carriage,offset} of moving){
      const point=beltAt(offset+travel,-.036);carriage.position.set(point.x,.500,point.z);carriage.rotation.y=point.angle;
    }
  }
  update(0);
  return {root,walkBounds:{minX:-5.65,maxX:5.65,minZ:-3.66,maxZ:3.40},
    obstacles,spawn:{x:-4.65,z:2.12,yaw:2.35},spots,targets:{bag,wrongBag,ticket,train},
    setState({bagTaken=false,ticketBought=false}={}){bag.visible=!bagTaken;slip.visible=ticketBought;},update,peopleReady};
}

// Pose each greeter once, then use the posed surface as ordinary scenery, avoiding an
// animation mixer and recurring skeleton work for two distant background characters.
async function addReunion(T,root) {
  const {GLTFLoader}=await import('../movement-test/vendor/GLTFLoader.js');
  const loader=new GLTFLoader();
  const urls=[new URL('../movement-test/assets/woman.glb',import.meta.url),new URL('./assets/man.glb',import.meta.url)];
  const models=await Promise.all(urls.map(url=>loader.loadAsync(url.href)));
  function visitor(gltf,{x,z,yaw,height,shoulderHand,mutedColour}){
    const model=gltf.scene,bones=new Map();
    model.traverse(o=>{if(o.isBone)bones.set(o.name,o);});
    model.updateMatrixWorld(true);
    const world=q=>q.getWorldPosition(new T.Vector3());
    function aim(parent,child,at) {
      const from=world(parent),current=world(child).sub(from).normalize(),wanted=at.clone().sub(from).normalize();
      const rotation=parent.getWorldQuaternion(new T.Quaternion());
      const parentRotation=parent.parent.getWorldQuaternion(new T.Quaternion());
      const applied=new T.Quaternion().setFromUnitVectors(current,wanted).multiply(rotation);
      parent.quaternion.copy(parentRotation.invert().multiply(applied));parent.updateWorldMatrix(false,true);
    }
    function tiltJoint(name,axis,radians) {
      const bone=bones.get(name);if(!bone)return;
      const current=bone.getWorldQuaternion(new T.Quaternion());
      const turn=new T.Quaternion().setFromAxisAngle(axis,radians);
      const inverseParent=bone.parent.getWorldQuaternion(new T.Quaternion()).invert();
      bone.quaternion.copy(inverseParent.multiply(turn).multiply(current));
      bone.updateWorldMatrix(false,true);
    }
    tiltJoint('Spine02',new T.Vector3(1,0,0),.076);
    tiltJoint('neck',new T.Vector3(0,0,1),.12);
    tiltJoint('Head',new T.Vector3(0,1,0),shoulderHand?-.40:-.33);
    tiltJoint('Head',new T.Vector3(1,0,0),shoulderHand?.17:-.035);
    function reach(name,sign,y,zFront){
      const arm=bones.get(name+'Arm'),lower=bones.get(name+'ForeArm'),hand=bones.get(name+'Hand');
      if(!arm||!lower||!hand)return;
      const shoulder=world(arm),a=world(lower).distanceTo(shoulder),b=world(hand).distanceTo(world(lower));
      const wrist=new T.Vector3(.10+sign*.109,y,zFront),delta=wrist.clone().sub(shoulder),axis=delta.clone().normalize();
      const d=T.MathUtils.clamp(delta.length(),Math.abs(a-b)+.001,a+b-.002);
      const along=(a*a-b*b+d*d)/(2*d),bend=Math.sqrt(Math.max(0,a*a-along*along));
      const pole=new T.Vector3(sign*.85,-.24,.34).projectOnPlane(axis).normalize();
      const elbow=shoulder.clone().addScaledVector(axis,along).addScaledVector(pole,bend);
      aim(arm,lower,elbow);aim(lower,hand,shoulder.clone().addScaledVector(axis,d));
      const middle=bones.get(name+'HandMiddle1');
      if(middle)aim(hand,middle,world(hand).add(new T.Vector3(-sign*.90,-.25,.035)));
      for(const finger of ['Index','Middle','Ring','Pinky'])for(let i=1;i<4;i++){
        const knuckle=bones.get(name+'Hand'+finger+i);if(knuckle)knuckle.rotateX(-.15);
      }
    }
    reach('Left',1,shoulderHand?1.29:1.06,shoulderHand?.346:.413);
    reach('Right',-1,shoulderHand?1.195:1.14,shoulderHand?.355:.406);
    model.updateMatrixWorld(true);
    const figure=new T.Group();figure.name='An airport reunion';
    model.traverse(object=>{
      if(!object.isSkinnedMesh)return;
      object.skeleton.update();
      const g=object.geometry.clone(),verts=g.attributes.position;
      const point=new T.Vector3();
      for(let i=0;i<verts.count;i++){
        point.fromBufferAttribute(object.geometry.attributes.position,i);
        object.applyBoneTransform(i,point);point.applyMatrix4(object.matrixWorld);
        verts.setXYZ(i,point.x,point.y,point.z);
      }
      g.deleteAttribute('skinIndex');g.deleteAttribute('skinWeight');g.computeVertexNormals();g.computeBoundingBox();g.computeBoundingSphere();
      const m=object.material.clone();m.color.multiply(new T.Color(mutedColour));
      const posed=new T.Mesh(g,m);posed.castShadow=posed.receiveShadow=true;figure.add(posed);
    });
    const bounds=new T.Box3().setFromObject(figure);const h=bounds.max.y-bounds.min.y;
    if(!Number.isFinite(h)||h<.05)return;
    const scale=height/h;
    figure.scale.setScalar(scale);figure.position.set(x,-bounds.min.y*scale,z);figure.rotation.y=yaw;root.add(figure);
    return figure;
  }
  // A close greeting just past the glass divider. Both sets of hands reach the other's back.
  visitor(models[0],{x:1.24,z:-2.965,yaw:1.27,height:1.62,shoulderHand:false,mutedColour:'#e6d1bd'});
  visitor(models[1],{x:1.484,z:-3.010,yaw:1.27+Math.PI,height:1.78,shoulderHand:true,mutedColour:'#d3dcec'});
}
