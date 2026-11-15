// All dimensions are in metres. +Z is the open front of the room.
export function createRoom(THREE, scene, {movableBelongings = false} = {}) {
  const room = new THREE.Group();
  room.name = 'The first evening';
  scene.add(room);
  let seed = 1827;
  function random() {
    seed = (1664525 * seed + 1013904223) >>> 0;
    return seed / 4294967296;
  }
  function paintedTexture(width, height, paint, repeat = false) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    paint(canvas.getContext('2d'), width, height);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    if (repeat) texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.anisotropy = 4;
    return texture;
  }
  function material(colour, options = {}) {
    return new THREE.MeshStandardMaterial({ color: colour, roughness: .82, ...options });
  }
  function mesh(parent, geometry, mat, x, y, z) {
    const object = new THREE.Mesh(geometry, mat);
    object.position.set(x, y, z);
    object.castShadow = true;
    object.receiveShadow = true;
    parent.add(object);
    return object;
  }
  const boxCache = new Map();
  function boxGeometry(w, h, d, bevel) {
    const key = [w, h, d, bevel].join(',');
    if (boxCache.has(key)) return boxCache.get(key);
    const r = Math.min(bevel, w * .43, h * .43, d * .43);
    const g = r ? new THREE.BoxGeometry(1, 1, 1, 5, 5, 5) : new THREE.BoxGeometry(w, h, d);
    if (r) {
      const positions = g.attributes.position, normals = g.attributes.normal;
      function coord(v, size) {
        const a = size / 2, i = Math.round((v + .5) * 5);
        return [-a, -a + r * .45, -a + r, a - r, a - r * .45, a][i];
      }
      for (let i = 0; i < positions.count; i++) {
        const faceX = normals.getX(i), faceY = normals.getY(i), faceZ = normals.getZ(i);
        const x = coord(positions.getX(i), w), y = coord(positions.getY(i), h), z = coord(positions.getZ(i), d);
        const cx = THREE.MathUtils.clamp(x, r - w / 2, w / 2 - r);
        const cy = THREE.MathUtils.clamp(y, r - h / 2, h / 2 - r);
        const cz = THREE.MathUtils.clamp(z, r - d / 2, d / 2 - r);
        const dx = x - cx, dy = y - cy, dz = z - cz;
        const length = Math.hypot(dx, dy, dz) || 1;
        positions.setXYZ(i, cx + dx * r / length, cy + dy * r / length, cz + dz * r / length);
        normals.setXYZ(i, dx / length, dy / length, dz / length);
        const px=positions.getX(i)/w, py=positions.getY(i)/h, pz=positions.getZ(i)/d;
        if (faceY) g.attributes.uv.setXY(i, .5+px, .5-faceY*pz);
        else if (faceX) g.attributes.uv.setXY(i, .5-faceX*pz, .5+py);
        else g.attributes.uv.setXY(i, .5+faceZ*px, .5+py);
      }
    }
    boxCache.set(key, g);
    return g;
  }
  function box(x, y, z, w, h, d, mat, round = 0, parent = room) {
    return mesh(parent, boxGeometry(w, h, d, round), mat, x, y, z);
  }
  const sphere = new THREE.SphereGeometry(1, 16, 12);
  function oval(x, y, z, sx, sy, sz, mat, parent = room) {
    const shape = mesh(parent, sphere, mat, x, y, z);
    shape.scale.set(sx, sy, sz);
    return shape;
  }
  const cylinderCache = new Map();
  function cylinder(x, y, z, top, bottom, h, mat, parent = room, sides = 20) {
    const key = [top, bottom, h, sides].join(',');
    if (!cylinderCache.has(key)) cylinderCache.set(key, new THREE.CylinderGeometry(top, bottom, h, sides));
    return mesh(parent, cylinderCache.get(key), mat, x, y, z);
  }
  function stick(a, b, radius, mat, parent = room, endRadius = radius) {
    const v = new THREE.Vector3(...b).sub(new THREE.Vector3(...a));
    const rod = cylinder((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2, endRadius, radius, v.length(), mat, parent, 10);
    rod.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), v.normalize());
    return rod;
  }
  function plane(x, y, z, width, height, mat, ry = 0) {
    const object = mesh(room, new THREE.PlaneGeometry(width, height), mat, x, y, z);
    object.rotation.y = ry;
    return object;
  }
  function woodPattern(ctx, w, h, floor) {
    ctx.fillStyle = floor ? '#997857' : '#bb9670';
    ctx.fillRect(0, 0, w, h);
    const rows = floor ? 23 : 1, rh = h / rows;
    for (let row = 0; row < rows; row++) {
      const yy = row * rh;
      let x = floor ? -random() * 240 : 0;
      while (x < w) {
        const length = floor ? 140 + random() * 195 : w;
        const shade = Math.floor(random() * 12);
        ctx.fillStyle = floor ? 'rgb(' + (139 + shade) + ',' + (102 + shade) + ',' + (72 + shade) + ')' : '#b38e68';
        ctx.fillRect(x, yy, length, rh);
        ctx.save();
        ctx.beginPath(); ctx.rect(x, yy, length, rh); ctx.clip();
        const knotX = x + length * (.2 + random() * .65), knotY = yy + rh * random();
        for (let j = 0; j < rh * 1.1; j++) {
          const grainY = yy + random() * rh, freq = .004 + random() * .018, phase = random() * 7;
          ctx.strokeStyle = random() > .5 ? 'rgba(73,45,25,.040)' : 'rgba(250,223,179,.053)';
          ctx.lineWidth = .35 + random() * 1.3; ctx.beginPath();
          for (let gx = x; gx <= x + length + 7; gx += 7) {
            const knot = 2.8 * Math.exp(-Math.pow((gx - knotX) / 29, 2)) * Math.sin((grainY - knotY) * .21);
            const gy = grainY + 1.3 * Math.sin(gx * freq + phase) + knot;
            if (gx === x) ctx.moveTo(gx, gy); else ctx.lineTo(gx, gy);
          }
          ctx.stroke();
        }
        if (floor) {
          ctx.fillStyle = 'rgba(59,37,22,.28)'; ctx.fillRect(x, yy, length, .9); ctx.fillRect(x, yy, .9, rh);
          ctx.fillStyle = 'rgba(255,232,182,.12)'; ctx.fillRect(x + 1.1, yy + 1.1, length - 2, .65);
        }
        ctx.restore();
        x += length;
      }
    }
  }
  const woodMap = paintedTexture(512, 128, (c,w,h) => woodPattern(c,w,h,false));
  const loader = new THREE.TextureLoader();
  const pendingTextures = [];
  const floorDepth = movableBelongings ? 8.2 : 5.4;
  function floorTexture(file, colour) {
    let loaded;
    pendingTextures.push(new Promise(resolve => { loaded = resolve; }));
    const texture = loader.load(new URL(`./assets/${file}`, import.meta.url).href, loaded, undefined, loaded);
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(6.8 / 1.7, floorDepth / 1.7);
    texture.anisotropy = 4;
    if (colour) texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }
  const oak = material('#fff8e7', {map: woodMap, roughness:.63});
  const darkOak = material('#a37e60', {map: woodMap, roughness:.67});
  const floorMat = material('#e4c8a2', {
    map: floorTexture('floor-oak-color.jpg', true),
    normalMap: floorTexture('floor-oak-normal.jpg', false),
    normalScale: new THREE.Vector2(.42,.42), roughness: .67
  });
  const plaster = paintedTexture(256, 256, (c, w, h) => {
    c.fillStyle = '#faf9f4'; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 7500; i++) {
      c.fillStyle = 'rgba(104,110,97,' + (.016 + random() * .08) + ')';
      c.fillRect(random() * w, random() * h, .5 + random() * 1.3, .5 + random());
    }
  }, true);
  plaster.repeat.set(3, 2);
  const wall = material('#939d87', {map:plaster});
  const wallSide = material('#aaa995', {map:plaster});
  const ivory = material('#ded8c9'), trim = material('#c5bfaa');
  const iron = material('#383c38', {metalness:.48, roughness:.48});
  const brass = material('#c39761', {metalness:.57, roughness:.38});
  const soil = material('#473a30'), glaze = material('#d0c4ac', {roughness:.36});
  function weave(colour, warp = .10) {
    const texture = paintedTexture(96,96,(c,w,h) => {
      c.fillStyle='#eeeae4';c.fillRect(0,0,w,h);
      c.strokeStyle='rgba(79,65,47,' + warp + ')'; c.lineWidth=.65;
      for(let i=0;i<96;i+=2){c.beginPath();c.moveTo(i,0);c.lineTo(i,h);c.stroke();c.beginPath();c.moveTo(0,i);c.lineTo(w,i);c.stroke();}
      for(let i=0;i<350;i++){c.fillStyle='rgba(255,255,255,.30)';c.fillRect(random()*w,random()*h,1.5,.6);}
    },true);
    texture.repeat.set(3,4);
    return material(colour,{map:texture,roughness:.96});
  }
  const linen=weave('#e5d8bf'), cotton=weave('#e5dfcf'), rust=weave('#b17157'), sage=weave('#87918a');
  const navy=material('#253649',{roughness:.54}), zipper=material('#536071',{metalness:.36,roughness:.51});
  const yellow=weave('#eeb43d'), darkCloth=weave('#585a5a'), suitcaseLining=weave('#8b8580');

  // One open side for the camera. Single-sided wall surfaces also permit an oblique view.
  const floor = plane(0,0,-2.6+floorDepth/2,6.8,floorDepth,floorMat);floor.rotation.x=-Math.PI/2;
  box(0,-.06,-2.6+floorDepth/2,6.8,.10,floorDepth,darkOak);
  const backZ=-2.60, wallH=2.73, winLeft=-1.02, winRight=1.21, sillY=.89, lintelY=2.40;
  function backSegment(l,r,b,t) { plane((l+r)/2,(b+t)/2,backZ,r-l,t-b,wall); }
  backSegment(-3.4,winLeft,0,wallH); backSegment(winRight,3.4,0,wallH);
  backSegment(winLeft,winRight,0,sillY); backSegment(winLeft,winRight,lintelY,wallH);
  plane(-3.4,wallH/2,.1,5.4,wallH,wallSide,Math.PI/2);
  plane(3.4,wallH/2,.1,5.4,wallH,wallSide,-Math.PI/2);
  const ceiling=plane(0,wallH,.1,6.80,5.4,material('#d4cec1'));
  ceiling.rotation.x=Math.PI/2;ceiling.castShadow=false;
  // The room also occludes outside buildings when a wide camera can see the top of the set.
  backSegment(-3.4,3.4,wallH,wallH+4);
  plane(-3.4,wallH+2,.1,5.4,4,wallSide,Math.PI/2);
  plane(3.4,wallH+2,.1,5.4,4,wallSide,-Math.PI/2);
  box(0,.054,-2.575,6.8,.108,.04,trim,.007);
  box(-3.38,.054,.1,.04,.108,5.4,trim,.006);box(3.38,.054,.1,.04,.108,5.4,trim,.006);

  // Distant windows and roofs are modeled behind the actual opening.
  const sky=paintedTexture(4,256,(c,w,h)=>{const grad=c.createLinearGradient(0,0,0,h);grad.addColorStop(0,'#456393');grad.addColorStop(1,'#aeb7c7');c.fillStyle=grad;c.fillRect(0,0,w,h);});
  const backdrop=plane(0,2.2,-13,25,13,new THREE.MeshBasicMaterial({map:sky}));backdrop.castShadow=false;
  const duskStone=new THREE.MeshBasicMaterial({color:'#596b8d'});
  const stoneEdge=new THREE.MeshBasicMaterial({color:'#687a9a'});
  const slate=new THREE.MeshBasicMaterial({color:'#344d72'});
  const windowFrame=new THREE.MeshBasicMaterial({color:'#364663'});
  const paneOff=new THREE.MeshBasicMaterial({color:'#425a7b'});
  const paneLit=new THREE.MeshBasicMaterial({color:'#eabb87'});
  for(let block=0;block<3;block++){
    const bx=-7+block*7, bz=-9+block*.18, top=2.8+block*.26;
    box(bx,top-2.9,bz,6.96,5.8,.50,duskStone);
    box(bx,top,bz+.26,6.98,.12,.20,stoneEdge);
    const roof=box(bx,top+.57,bz-.32,7.05,.13,2.01,slate);roof.rotation.x=-.55;
    for(let row=0;row<3;row++)for(let col=0;col<5;col++){
      const wx=bx-2.68+col*1.32,wy=top-.60-row*1.38;
      box(wx,wy,bz+.28,.73,.93,.04,windowFrame);
      box(wx,wy,bz+.308,.62,.82,.02,random()>.75?paneLit:paneOff);
      box(wx,wy,bz+.33,.033,.83,.026,stoneEdge);box(wx,wy+.13,bz+.33,.63,.025,.026,stoneEdge);
      box(wx,wy-.49,bz+.33,.85,.055,.15,stoneEdge);
    }
    for(let j=0;j<3;j++){
      const wx=bx-2.05+j*2;
      box(wx,top+.38,bz-.11,.76,.63,.44,slate);
      box(wx,top+.38,bz+.12,.52,.42,.024,j===1?paneLit:paneOff);
      box(wx,top+.38,bz+.14,.031,.44,.02,windowFrame);
      const cap=box(wx,top+.75,bz-.1,.93,.09,.54,slate);cap.rotation.x=-.18;
    }
  }
  const frame=material('#dfdbca',{roughness:.51}), seal=material('#696e66');
  const wc=(winLeft+winRight)/2, wh=lintelY-sillY, wz=-2.545;
  for(const xx of [winLeft,wc,winRight]){
    box(xx,(sillY+lintelY)/2,wz,.077,wh+.08,.12,frame,.006);
    if(xx!==wc)box(xx+(xx<wc?.050:-.050),(sillY+lintelY)/2,wz-.035,.014,wh,.025,seal);
  }
  for(const yy of [sillY,lintelY])box(wc,yy,wz,winRight-winLeft,.075,.12,frame,.006);
  box(wc,2.03,wz,winRight-winLeft,.042,.08,frame);
  box(wc,sillY-.03,-2.48,2.42,.064,.34,ivory,.012);
  const windowGlass=new THREE.MeshBasicMaterial({color:'#b9cee9',transparent:true,opacity:.055,depthWrite:false});
  const glass=plane(wc,(sillY+lintelY)/2,-2.58,winRight-winLeft,wh,windowGlass);glass.castShadow=false;
  const handle=box(wc+.048,1.58,-2.46,.025,.12,.032,iron,.012);handle.rotation.z=-.08;
  const radiator=material('#dad9cb',{roughness:.52});
  box(.10,.43,-2.39,1.94,.57,.13,radiator,.025);
  for(let i=0;i<42;i++)box(-.824+i*.045,.43,-2.305,.025,.48,.04,radiator,.012);
  for(const x of [-.75,.89]){stick([x,.04,-2.45],[x,.21,-2.45],.017,radiator);stick([x,.06,-2.45],[x,.06,-2.31],.017,radiator);}
  stick([1.04,.62,-2.36],[1.22,.62,-2.36],.026,radiator);const valve=cylinder(1.22,.62,-2.36,.041,.041,.09,ivory);valve.rotation.z=Math.PI/2;

  const drape=weave('#c8b79c');drape.side=THREE.DoubleSide;
  const curtainRod=cylinder(wc,2.57,-2.40,.018,.018,2.83,brass);curtainRod.rotation.z=Math.PI/2;
  for(const sign of [-1,1]){
    const g=new THREE.PlaneGeometry(.50,2.39,42,19), a=g.attributes.position;
    for(let i=0;i<a.count;i++){
      const u=(a.getX(i)+.25)/.50,t=(a.getY(i)+1.195)/2.39;
      const spread=1+.23*(1-t)-.10*Math.exp(-Math.pow((t-.39)/.23,2));
      const phase=u*22+1.02*(1-t)*Math.sin(t*3+u*4);
      a.setXYZ(i, sign*(1.14+(.50-u)*.46*spread)+wc,
        .15+t*2.39+(1-t)*.025*Math.sin(u*22), -2.32+.027*Math.sin(phase)+.011*Math.sin(phase*1.9)+.02*Math.sin(t*4+u*8));
    }
    g.computeVertexNormals();mesh(room,g,drape,0,0,0);
  }

  const bedX=-2.315,bedZ=-.195;
  for(const xx of [-2.99,-1.65])for(const zz of [-1.38,.98])box(xx,.15,zz,.095,.30,.095,darkOak,.006);
  box(bedX,.30,bedZ,1.45,.16,2.49,oak,.018);
  box(bedX,.65,-1.45,1.45,.78,.092,oak,.035);
  box(bedX,.423,bedZ,1.43,.145,2.44,cotton,.049);

  // Each grid point is a real fold, including the rolled edges that fall over the frame.
  const duvetGeo=new THREE.PlaneGeometry(1,1,35,53), dv=duvetGeo.attributes.position;
  const originalDuvetY=new Float32Array(dv.count), cushionWeight=new Float32Array(dv.count);
  for(let i=0;i<dv.count;i++){
    const u=dv.getX(i)*2,v=.5-dv.getY(i), edge=Math.abs(u);
    const sideDrape=Math.max(0,(edge-.875)/.125), footDrape=Math.max(0,(v-.95)/.05);
    const x=bedX+u*(.73+.038*sideDrape);
    const z=-.91+v*2.005;
    const ripple=.009*Math.sin(v*33+u*7+Math.sin(u*8))+.005*Math.cos(v*48-u*13);
    const diagonal=.016*Math.exp(-Math.pow((v-.72-u*.21)/.055,2))+.012*Math.exp(-Math.pow((v-.24+u*.14)/.04,2));
    const y=.520+ripple+diagonal-.17*sideDrape*sideDrape-.093*footDrape*footDrape+.009*sideDrape*Math.sin(v*55);
    dv.setXYZ(i,x,y,z);
    originalDuvetY[i]=y;
    cushionWeight[i]=Math.exp(-Math.pow((x+1.75)/.22,2)-Math.pow((z+.10)/.26,2))*.030;
  }
  duvetGeo.computeVertexNormals();linen.side=THREE.DoubleSide;
  const duvet=mesh(room,duvetGeo,linen,0,0,0);duvet.userData.dynamic=true;
  function pillow(x,y,z,w,h,d,mat,tilt,twist){
    const group=new THREE.Group();group.position.set(x,y,z);group.rotation.x=tilt;group.rotation.z=twist;room.add(group);
    const across=20,along=16,vertices=[],uv=[],indices=[],edge=[];
    for(const side of [1,-1]){
      const offset=vertices.length/3;
      for(let j=0;j<=along;j++)for(let i=0;i<=across;i++){
        const u=i/across,v=j/along,xx=u*2-1,zz=v*2-1;
        const air=Math.pow(Math.max(0,Math.sin(Math.PI*u)*Math.sin(Math.PI*v)),.39);
        const fold=.008*Math.sin(zz*24+xx*6)*Math.pow(Math.abs(xx),3)+.006*Math.cos(xx*31-zz*7)*Math.pow(Math.abs(zz),4);
        const corner=Math.pow(Math.abs(xx*zz),2);
        const px=xx*w*.5*(1+.035*Math.cos(zz*Math.PI)),pz=zz*d*.5*(1+.04*Math.cos(xx*Math.PI));
        const py=side*h*.5*air+fold+.026*corner*(.45+Math.sin(zz*2-xx*4)*.55);
        vertices.push(px,py,pz);uv.push(u,v);
        if(side===1&&(i===0||i===across||j===0||j===along))edge.push(new THREE.Vector3(px,py,pz));
        if(i<across&&j<along){
          const k=offset+j*(across+1)+i;
          const a=k,b=k+across+1,c=b+1,e=a+1;
          if(side===1)indices.push(a,b,e,b,c,e);else indices.push(a,e,b,b,e,c);
        }
      }
    }
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
    g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();
    mesh(group,g,mat,0,0,0);
    edge.sort((a,b)=>Math.atan2(a.z/d,a.x/w)-Math.atan2(b.z/d,b.x/w));
    const seam=new THREE.CatmullRomCurve3(edge,true);
    mesh(group,new THREE.TubeGeometry(seam,72,.0025,4,true),mat,0,0,0);
  }
  pillow(-2.42,.716,-1.12,1.01,.193,.54,cotton,.84,-.055);
  pillow(-2.51,.758,-.999,.53,.168,.49,rust,.97,.13);
  const phoneGroup=new THREE.Group();room.add(phoneGroup);
  phoneGroup.position.set(-2.50,.550,-.12);phoneGroup.rotation.y=.18;
  box(0,0,0,.085,.012,.160,iron,.005,phoneGroup);
  box(0,.007,0,.077,.003,.146,material('#283037',{roughness:.19,metalness:.3}),.001,phoneGroup);

  // Rug has its weave, faded stripes and irregular edge woven into a single texture.
  const rugTex=paintedTexture(512,512,(c,w,h)=>{
    c.fillStyle='#d3c2aa';c.fillRect(0,0,w,h);
    for(let y=0;y<h;y++){
      c.fillStyle='rgba(80,55,34,'+(.035+random()*.08)+')';c.fillRect(0,y,w,.65);
    }
    const rows=[6,12,21,31,38,55,61,72,439,450,456,473,481,490,499,505];
    for(const y of rows){c.fillStyle=(y===31||y===481||y===55||y===456)?'#9d644c':'#b17a5b';c.fillRect(0,y,w,(y===31||y===481)?7:2.5);}
    for(let x=0;x<w;x+=3){c.fillStyle='rgba(245,221,178,.21)';c.fillRect(x,0,.8,h);}
    for(let i=0;i<12000;i++){c.fillStyle=random()>.5?'rgba(250,235,207,.17)':'rgba(88,60,39,.11)';c.fillRect(random()*w,random()*h,random()*2+.4,.7);}
  });
  const rugMat=material('#f6e8d4',{map:rugTex,roughness:1});
  const rug=box(.26,.012,1.38,2.17,.018,1.78,rugMat,.009);rug.rotation.y=-.035;

  // A halfway-unpacked suitcase with an open lid, fabric lining, folded clothes and a ribbon.
  const bag=new THREE.Group();bag.position.set(-.30,0,-1.16);bag.rotation.y=-.105;room.add(bag);
  for(const x of [-.46,.46])for(const z of [-.275,.275])oval(x,.062,z,.04,.054,.035,iron,bag);
  box(0,.13,0,1.02,.15,.67,navy,.052,bag);
  box(0,.215,0,.94,.065,.585,suitcaseLining,.026,bag);
  for(const x of [-.49,.49])box(x,.223,0,.045,.17,.64,navy,.02,bag);
  for(const z of [-.314,.314]){
    box(0,.221,z,1.0,.17,.046,navy,.019,bag);
    box(0,.292,z,1.0,.015,.048,zipper,.006,bag);
  }
  const lid=new THREE.Group();lid.position.set(0,.273,-.31);lid.rotation.x=-.28;bag.add(lid);
  box(0,.313,0,1.02,.65,.107,navy,.045,lid);
  box(0,.316,.056,.945,.568,.032,zipper,.013,lid);
  box(0,.316,.075,.90,.533,.022,suitcaseLining,.008,lid);
  box(0,.361,.093,.84,.015,.012,iron,.004,lid);
  box(-.16,.236,.097,.47,.169,.012,darkCloth,.005,lid);
  box(0,.30,.103,.827,.008,.006,trim,0,lid);
  for(let i=0;i<3;i++){
    const top=.249+i*.035;box(-.255,top,-.015,.354,.077,.44,[sage,cotton,linen][i],.032,bag);
    box(.147,top+.013,.026,.375,.069,.410,i===2?rust:sage,.031,bag);
  }
  for(const x of [-.09,.09])box(x,.215,.352,.038,.054,.042,iron,.012,bag);
  box(0,.204,.372,.209,.025,.029,iron,.010,bag);
  const ribbonKnot=oval(.404,.284,.343,.040,.032,.029,yellow,bag);
  ribbonKnot.rotation.z=.44;
  for(const [x,z,r] of [[.382,.348,-.19],[.446,.350,.29]]){
    const tail=box(x,.177,z,.047,.20,.014,yellow,.005,bag);tail.rotation.z=r;tail.rotation.x=-.13;
  }

  // A small stitched photograph print for the wall and postcards by the desk.
  function berlinPrint(colours,variant) {
    return paintedTexture(256,328,(c,w,h)=>{
      const skyGrad=c.createLinearGradient(0,0,0,h);
      skyGrad.addColorStop(0,colours[0]);skyGrad.addColorStop(1,colours[1]);c.fillStyle=skyGrad;c.fillRect(0,0,w,h);
      c.fillStyle=colours[2];c.beginPath();c.arc(166,107,29,0,Math.PI*2);c.fill();
      for(let n=0;n<2;n++){
        const y=205+n*31;c.fillStyle=n?colours[4]:colours[3];
        for(let x=-10;x<w;x+=20){const hh=8+random()*43;c.fillRect(x,y-hh,21,h-y+hh);
          c.beginPath();c.moveTo(x-1,y-hh);c.lineTo(x+10,y-hh-4-random()*6);c.lineTo(x+22,y-hh);c.fill();
          if(n)for(let ww=0;ww<2;ww++)for(let j=0;j<3;j++){c.fillStyle=random()>.55?colours[2]:colours[3];c.fillRect(x+4+ww*8,y-hh+5+j*11,3,5);c.fillStyle=colours[4];}
        }
      }
      if(variant===0){
        c.fillStyle=colours[4];c.beginPath();c.moveTo(108,203);c.lineTo(115,90);c.lineTo(119,90);c.lineTo(123,203);c.fill();
        c.beginPath();c.ellipse(117,86,11,9,0,0,Math.PI*2);c.fill();
        c.fillRect(115.5,42,3,43);c.fillRect(116.5,23,1,23);
      }
      c.fillStyle='rgba(213,184,140,.04)';for(let j=0;j<9500;j++)c.fillRect(random()*w,random()*h,1.3,1);
    });
  }
  const art=berlinPrint(['#b5b9c0','#e7ad90','#f0cc9c','#998f8d','#53606a'],0);
  box(-3.352,1.54,-.15,.072,1.03,.77,darkOak,.014);
  const matBoard=plane(-3.309,1.54,-.15,.714,.972,ivory,Math.PI/2);matBoard.castShadow=false;
  plane(-3.307,1.54,-.15,.576,.780,material('#ffffff',{map:art}),Math.PI/2);

  // Individually formed plant leaves have a central crease and a pointed tip.
  const leafMats=['#48633c','#5d7846','#778c50','#486e45'].map(c=>material(c,{side:THREE.DoubleSide}));
  const stemMat=material('#637446');
  const leaves=[];
  function leafGeometry() {
    if(leaves.length)return leaves[0];
    const pos=[],idx=[];
    for(let j=0;j<=7;j++){
      const t=j/7, width=Math.pow(Math.sin(Math.PI*t),.67)*(.62-.27*t);
      for(let k=0;k<3;k++)pos.push((k-1)*width,t,.19*Math.sin(Math.PI*t)-.16*t*t-(k===1?0:.105*Math.sin(Math.PI*t)));
    }
    for(let j=0;j<7;j++)for(let k=0;k<2;k++){const i=j*3+k;idx.push(i,i+1,i+3,i+1,i+4,i+3);}
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setIndex(idx);g.computeVertexNormals();leaves.push(g);return g;
  }
  function plant(x,y,z,size,potMat=glaze,trailing=false) {
    const g=new THREE.Group();room.add(g);g.position.set(x,y,z);g.scale.setScalar(size);
    cylinder(0,.101,0,.124,.092,.202,potMat,g,26);
    cylinder(0,.202,0,.130,.127,.027,potMat,g,26);
    cylinder(0,.216,0,.113,.113,.006,soil,g,24);
    for(let i=0;i<(trailing?14:11);i++){
      const angle=i*2.399+.17, reach=.12+random()*.18, h=.17+random()*.22;
      const ax=Math.sin(angle)*reach, az=Math.cos(angle)*reach;
      const droop=trailing&&i%2===0;
      const end=[ax*(droop?1.4:1),droop?-.10-random()*.31:.20+h,az];
      const joint=[ax*.65,.21+h*(droop?.55:.60),az*.60];
      stick([0,.21,0],joint,.0045,stemMat,g);stick(joint,end,.004,stemMat,g);
      for(let j=0;j<5;j++){
        const t=j/4, startX=joint[0]*(1-t)+end[0]*t,startY=joint[1]*(1-t)+end[1]*t,startZ=joint[2]*(1-t)+end[2]*t;
        const lf=mesh(g,leafGeometry(),leafMats[(i+j)%4],startX,startY,startZ);
        lf.scale.set(.177,.185+random()*.064,.17);lf.rotation.order='YXZ';lf.rotation.y=angle+(j%2?1.0:-1.1);
        lf.rotation.x=droop?1.95+random()*.25:.45+random()*.78;
      }
    }
  }
  const bookMats=['#757d66','#9c6950','#666e78','#b39269','#a39783'].map(c=>material(c));
  const paper=material('#e2d8c4');
  function book(x,y,z,w,h,d,mat,rotation=0){
    const group=new THREE.Group();room.add(group);group.position.set(x,y,z);group.rotation.y=rotation;
    box(0,0,0,w,h*.72,d,paper,.003,group);
    for(const yy of [-h*.43,h*.43])box(0,yy,0,w+.004,h*.13,d+.006,mat,.002,group);
    box(0,0,-d*.49,w,h,.012,mat,.004,group);
  }
  box(-2.24,1.80,-2.40,1.57,.06,.35,oak,.016);
  for(const xx of [-2.8,-1.73]){box(xx,1.70,-2.54,.032,.18,.044,iron);box(xx,1.76,-2.42,.034,.033,.24,iron);}
  plant(-2.80,1.832,-2.35,.79,glaze,true);
  for(let i=0;i<5;i++){const b=box(-2.40+i*.078,1.981,-2.43,.063,.293+(.03*Math.sin(i)),.185,bookMats[i],.005);b.rotation.z=i===4?-.105:0;}
  cylinder(-1.69,1.925,-2.41,.071,.086,.178,glaze);
  plant(.36,.898,-2.445,.70,glaze,false);

  // Bedside table and opaque-glass lamp.
  box(-3.207,.27,-.72,.315,.49,.59,oak,.014);
  box(-3.207,.49,-.72,.331,.046,.62,oak,.012);
  box(-3.207,.36,-.414,.278,.153,.018,darkOak,.007);box(-3.207,.357,-.399,.083,.016,.018,brass,.005);
  const shadeGlow=material('#fff0c7',{emissive:'#ffc888',emissiveIntensity:.9,roughness:.75});
  cylinder(-3.20,.59,-.75,.065,.074,.16,darkOak);
  const lampGeo=new THREE.LatheGeometry([new THREE.Vector2(.125,0),new THREE.Vector2(.133,.018),new THREE.Vector2(.132,.072),new THREE.Vector2(.119,.175),new THREE.Vector2(.099,.219),new THREE.Vector2(.068,.243),new THREE.Vector2(.01,.251),new THREE.Vector2(0,.251)],32);
  mesh(room,lampGeo,shadeGlow,-3.20,.655,-.75);
  book(-3.207,.54,-.511,.163,.030,.13,bookMats[2],-.04);
  const keepsake=paintedTexture(128,96,(c,w,h)=>{
    const g=c.createLinearGradient(0,0,0,h);g.addColorStop(0,'#99a9ab');g.addColorStop(.62,'#b6b390');g.addColorStop(1,'#686b50');c.fillStyle=g;c.fillRect(0,0,w,h);
    for (const [x,y,skin,coat] of [[35,37,'#a97859','#6b8177'],[66,29,'#bf8b60','#8e6159'],[91,42,'#ad7d58','#797089']]) {
      c.fillStyle='#4a3b33';c.beginPath();c.ellipse(x,y,11,14,0,0,Math.PI*2);c.fill();
      c.fillStyle=skin;c.beginPath();c.ellipse(x,y+3,8,11,0,0,Math.PI*2);c.fill();
      c.fillStyle=coat;c.beginPath();c.ellipse(x,y+42,22,31,0,0,Math.PI*2);c.fill();
    }
  });
  const smallFrame=new THREE.Group();room.add(smallFrame);smallFrame.position.set(-3.201,.605,-.943);smallFrame.rotation.y=.44;smallFrame.rotation.x=-.12;
  box(0,0,0,.17,.134,.016,darkOak,.004,smallFrame);
  mesh(smallFrame,new THREE.PlaneGeometry(.149,.108),material('#fff6e4',{map:keepsake}),0,0,.009);

  // Simple veneered desk, joined legs and an ordinary curved-back wooden chair.
  const dx=2.26,dz=-1.65;
  box(dx,.766,dz,1.70,.063,.74,oak,.021);
  for(const xx of [dx-.74,dx+.74])for(const zz of [dz-.27,dz+.27]){
    stick([xx+Math.sign(xx-dx)*.044,.025,zz+Math.sign(zz-dz)*.036],[xx,.745,zz],.033,darkOak,room,.039);
  }
  box(dx,.680,dz+.259,1.53,.105,.062,oak,.007);
  box(dx+.426,.674,dz+.297,.56,.083,.016,oak,.004);box(dx+.426,.675,dz+.311,.078,.013,.014,iron,.004);
  const chair=new THREE.Group();chair.position.set(2.03,0,-.86);chair.rotation.y=-.17;room.add(chair);
  for(const xx of [-.195,.195])for(const zz of [-.17,.17]){
    const back=zz>0;stick([xx*1.16,.022,zz*1.18],[xx,back?.884:.48,zz+(back?.035:0)],.021,darkOak,chair,.022);
  }
  box(0,.441,0,.465,.057,.42,oak,.025,chair);
  const chairCushion=box(0,.471,0,.428,.047,.39,sage,.020,chair);
  const chairBack=box(0,.788,.216,.455,.193,.039,oak,.016,chair);chairBack.rotation.x=.11;
  cylinder(2.77,.823,-1.75,.115,.145,.035,iron);
  stick([2.77,.842,-1.75],[2.69,1.229,-1.74],.016,brass);
  stick([2.69,1.229,-1.74],[2.48,1.370,-1.64],.017,iron);
  oval(2.69,1.229,-1.74,.036,.036,.035,brass);
  const deskShade=new THREE.Group();deskShade.position.set(2.49,1.329,-1.63);deskShade.rotation.z=-.37;deskShade.rotation.x=-.16;room.add(deskShade);
  cylinder(0,0,0,.044,.135,.132,iron,deskShade,32);
  cylinder(0,-.067,0,.126,.123,.006,shadeGlow,deskShade,32);
  book(2.21,.817,-1.47,.29,.031,.21,bookMats[1],-.12);book(2.20,.845,-1.48,.266,.025,.19,bookMats[0],-.08);
  const mug=material('#c6be90',{roughness:.37});
  cylinder(2.60,.865,-1.49,.054,.045,.117,mug);
  cylinder(2.60,.925,-1.49,.047,.047,.003,soil);
  const mugHandle=mesh(room,new THREE.TorusGeometry(.033,.009,8,16),mug,2.662,.875,-1.49);mugHandle.rotation.y=.05;
  cylinder(1.62,.865,-1.87,.043,.041,.134,ivory);
  for(let i=0;i<4;i++)stick([1.608+i*.009,.87,-1.875],[1.594+i*.018,.994+random()*.048,-1.867+(i%2)*.012],.0045,bookMats[i]);
  const postcard=berlinPrint(['#98a9a7','#d1b594','#ead5ae','#98a29b','#717e79'],1);
  const cardMat=material('#ffffff',{map:postcard});
  for(let n=0;n<3;n++){
    const xx=2.22+(n%2)*.285,yy=1.46+Math.floor(n/2)*.228;
    box(xx,yy,-2.578,.22,.155,.009,paper);
    plane(xx,yy,-2.570,.202,.134,cardMat);
  }

  // Consolidate static objects sharing a material. The duvet keeps a separate mesh for seat compression.
  if (movableBelongings) {
    for (const prop of [bag, smallFrame]) prop.traverse(node => { node.userData.dynamic = true; });
  }
  room.updateMatrixWorld(true);
  const batches=new Map();
  room.traverse(object=>{
    if(!object.isMesh||object.userData.dynamic)return;
    const key=object.material.uuid+'-'+object.castShadow;
    if(!batches.has(key))batches.set(key,[]);
    batches.get(key).push(object);
  });
  const position=new THREE.Vector3(),normal=new THREE.Vector3(),normalMatrix=new THREE.Matrix3();
  for(const objects of batches.values()){
    if(objects.length===1)continue;
    let vertexCount=0,indexCount=0;
    for(const o of objects){vertexCount+=o.geometry.attributes.position.count;indexCount+=o.geometry.index?.count??o.geometry.attributes.position.count;}
    const positions=new Float32Array(vertexCount*3),normals=new Float32Array(vertexCount*3),uvs=new Float32Array(vertexCount*2);
    const indices=vertexCount<65536?new Uint16Array(indexCount):new Uint32Array(indexCount);
    let vOffset=0,iOffset=0;
    for(const object of objects){
      const geo=object.geometry,attributes=geo.attributes,p=attributes.position;
      normalMatrix.getNormalMatrix(object.matrixWorld);
      for(let i=0;i<p.count;i++){
        position.fromBufferAttribute(p,i).applyMatrix4(object.matrixWorld).toArray(positions,(vOffset+i)*3);
        normal.fromBufferAttribute(attributes.normal,i).applyMatrix3(normalMatrix).normalize().toArray(normals,(vOffset+i)*3);
        if(attributes.uv){uvs[(vOffset+i)*2]=attributes.uv.getX(i);uvs[(vOffset+i)*2+1]=attributes.uv.getY(i);}
      }
      const count=geo.index?.count??p.count;
      for(let i=0;i<count;i++)indices[iOffset+i]=vOffset+(geo.index?geo.index.getX(i):i);
      iOffset+=count;vOffset+=p.count;object.removeFromParent();
    }
    const grouped=new THREE.BufferGeometry();
    grouped.setAttribute('position',new THREE.BufferAttribute(positions,3));grouped.setAttribute('normal',new THREE.BufferAttribute(normals,3));
    grouped.setAttribute('uv',new THREE.BufferAttribute(uvs,2));grouped.setIndex(new THREE.BufferAttribute(indices,1));
    const combined=mesh(room,grouped,objects[0].material,0,0,0);combined.castShadow=objects[0].castShadow;
  }
  // These bounds describe physical furniture footprints. Navigation adds the actor's radius.
  const obstacles=[
    {minX:-3.065,maxX:-1.57,minZ:-1.50,maxZ:1.09},
    {minX:-3.373,maxX:-3.041,minZ:-1.030,maxZ:-.410},
    {minX:-.87,maxX:.26,minZ:-1.70,maxZ:-.76},
    {minX:1.37,maxX:3.15,minZ:-2.04,maxZ:-1.24},
    {minX:1.72,maxX:2.34,minZ:-1.14,maxZ:-.51},
    {minX:-.9,maxX:1.12,minZ:-2.59,maxZ:-2.27}
  ];
  let compression=-1;
  return {
    root: room, ready: Promise.all(pendingTextures), belongings: {bag, smallFrame},
    seat:{x:-1.71,y:0,z:-.10,yaw:Math.PI/2},approach:{x:-1.05,z:-.10},
    walkBounds:{minX:-3.21,maxX:3.19,minZ:-2.34,maxZ:2.47},obstacles,
    update(time,seated=0){
      const amount=THREE.MathUtils.clamp(Number(seated)||0,0,1);
      if(Math.abs(amount-compression)<.005)return;
      compression=amount;
      for(let i=0;i<dv.count;i++)dv.setY(i,originalDuvetY[i]-cushionWeight[i]*amount);
      dv.needsUpdate=true;duvetGeo.computeVertexNormals();
    }
  };
}
