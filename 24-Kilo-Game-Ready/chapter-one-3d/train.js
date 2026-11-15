// A bay of facing seats in a regional train. The side windows look toward -X.
export function createTrain(THREE, scene) {
  const root = new THREE.Group();
  root.name = 'Airport train to Berlin';
  scene.add(root);
  const seat = { x: -0.84, y: 0, z: -0.26, yaw: 0 };
  const camera = { position: [1.15, 1.46, 2.12], lookAt: [-0.75, 1.04, -0.44] };
  let seed = 853721;
  function random() {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  }
  const geom = new THREE.BoxGeometry();
  const matrix = new THREE.Matrix4();
  const transform = new THREE.Object3D();
  const batches = new Map();
  function paint(color, options = {}) {
    return new THREE.MeshStandardMaterial({ color, roughness: .74, ...options });
  }
  function mesh(geometry, material, x, y, z, parent = root) {
    const item = new THREE.Mesh(geometry, material);
    item.position.set(x, y, z);
    item.castShadow = true;
    item.receiveShadow = true;
    parent.add(item);
    return item;
  }
  // Repeated details share draw calls, including the passing buildings' lit windows.
  function box(material, x, y, z, width, height, depth, parent = root, color = 0xffffff, tilt = 0) {
    if (!batches.has(parent)) batches.set(parent, new Map());
    const materials = batches.get(parent);
    if (!materials.has(material)) materials.set(material, []);
    transform.position.set(x, y, z);
    transform.rotation.set(tilt, 0, 0);
    transform.scale.set(width, height, depth);
    transform.updateMatrix();
    materials.get(material).push({ matrix: matrix.copy(transform.matrix).clone(), color });
  }
  function finishBatch(parent, shadows) {
    for (const [material, parts] of batches.get(parent) || []) {
      const inst = new THREE.InstancedMesh(geom, material, parts.length);
      const color = new THREE.Color();
      parts.forEach((part, i) => {
        inst.setMatrixAt(i, part.matrix);
        inst.setColorAt(i, color.set(part.color));
      });
      inst.castShadow = inst.receiveShadow = shadows;
      inst.computeBoundingSphere();
      parent.add(inst);
    }
    batches.delete(parent);
  }
  const cylinders = new Map();
  function rail(from, to, radius, material, parent = root) {
    if (!cylinders.has(radius)) {
      cylinders.set(radius, new THREE.CylinderGeometry(radius, radius, 1, 12));
    }
    const a = new THREE.Vector3(...from), b = new THREE.Vector3(...to);
    const delta = b.clone().sub(a);
    const item = mesh(cylinders.get(radius), material, a.x, a.y, a.z, parent);
    item.position.addScaledVector(delta, .5);
    item.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.clone().normalize());
    item.scale.y = delta.length();
    return item;
  }
  function roundedShape(w, h, radius) {
    const s = new THREE.Shape();
    s.moveTo(-w/2+radius, -h/2); s.lineTo(w/2-radius,-h/2);
    s.quadraticCurveTo(w/2,-h/2,w/2,-h/2+radius); s.lineTo(w/2,h/2-radius);
    s.quadraticCurveTo(w/2,h/2,w/2-radius,h/2); s.lineTo(-w/2+radius,h/2);
    s.quadraticCurveTo(-w/2,h/2,-w/2,h/2-radius); s.lineTo(-w/2,-h/2+radius);
    s.quadraticCurveTo(-w/2,-h/2,-w/2+radius,-h/2);
    return s;
  }
  const softGeometry = new Map();
  function softPanel(w,h,d,r,bevel) {
    const key = [w,h,d,r,bevel].join('/');
    if (!softGeometry.has(key)) {
      const g = new THREE.ExtrudeGeometry(roundedShape(w-2*bevel,h-2*bevel,r-bevel), {
        depth:d-2*bevel, bevelEnabled:true, bevelSize:bevel, bevelThickness:bevel,
        bevelSegments:3, curveSegments:6
      });
      g.translate(0,0,-(d-2*bevel)/2);
      softGeometry.set(key,g);
    }
    return softGeometry.get(key);
  }
  function weave() {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 256;
    const g = canvas.getContext('2d');
    g.fillStyle = '#355063'; g.fillRect(0,0,256,256);
    for (let i=0;i<9000;i++) {
      g.fillStyle = random()<.5 ? 'rgba(213,227,227,.105)' : 'rgba(11,21,31,.19)';
      g.fillRect(random()*256,random()*256,1+random()*2,.8+random());
    }
    const threads=['#617487','#7b8291','#899493','#4e656e','#839398'];
    for (let n=0;n<80;n++) {
      const x=random()*256,y=random()*256;
      g.strokeStyle=threads[n%threads.length];g.lineWidth=1.4+random()*.9;
      g.beginPath();g.moveTo(x,y);g.lineTo(x+1+random()*3,y-2-random()*5);g.stroke();
    }
    const tex=new THREE.CanvasTexture(canvas);
    tex.colorSpace=THREE.SRGBColorSpace;
    tex.wrapS=tex.wrapT=THREE.RepeatWrapping;
    tex.repeat.set(2.2,2.2);
    return tex;
  }
  const wall=paint('#ded9c8'), lower=paint('#b2b7b3'), trim=paint('#a5aaa6',{metalness:.38,roughness:.46});
  const frame=paint('#333e42',{roughness:.5}), rubber=paint('#252b2e'), aluminium=paint('#adb5b7',{metalness:.65,roughness:.35});
  const fabric=paint('#e8eced',{map:weave(),roughness:1});
  const piping=paint('#253c4a',{roughness:.95});
  const wood=paint('#ae8766',{roughness:.65}), headrest=paint('#6b7d7d',{roughness:.85});
  const interiorLight=new THREE.MeshStandardMaterial({color:'#f3e9cd',emissive:'#f2e4bf',emissiveIntensity:.55});
  const speckleCanvas=document.createElement('canvas');
  speckleCanvas.width=speckleCanvas.height=256;
  const grain=speckleCanvas.getContext('2d');
  grain.fillStyle='#707777';grain.fillRect(0,0,256,256);
  for(let i=0;i<7200;i++){
    grain.fillStyle=random()<.65?'rgba(36,44,44,.22)':'rgba(211,211,199,.36)';
    grain.fillRect(random()*256,random()*256,1+random()*1.5,1+random());
  }
  const lino=new THREE.CanvasTexture(speckleCanvas);
  lino.colorSpace=THREE.SRGBColorSpace;
  lino.wrapS=lino.wrapT=THREE.RepeatWrapping;
  lino.repeat.set(3.2,6);
  const floor=mesh(new THREE.PlaneGeometry(3.24,9.8),paint('#c5c1b5',{map:lino,roughness:.89}),0,.002,-.65);
  floor.rotation.x=-Math.PI/2;
  box(wall,0,2.53,-.65,3.24,.14,9.8);
  for(const x of [-.68,.68]) {
    box(trim,x,2.446,-.65,.154,.04,9.6);
    box(interiorLight,x,2.419,-.65,.088,.012,9.56);
  }
  const sideX=-1.48;
  const bays=[-3.98,-1.62,.74,3.1];
  // The glazing is an actual opening. Frame geometry rolls over the edge of the panel.
  for (const sign of [-1,1]) {
    const x=sign*Math.abs(sideX);
    const wallPlaneRotation=sign===-1?Math.PI/2:-Math.PI/2;
    for (const z of bays) {
      const outside=roundedShape(2.36,2.42,.018);
      const opening=roundedShape(2.15,1.125,.105);
      const points=opening.getPoints(12).map(v=>new THREE.Vector2(v.x,v.y+.255));
      outside.holes.push(new THREE.Path(points.reverse()));
      const wallPanel=mesh(new THREE.ExtrudeGeometry(outside,{
        depth:.06,bevelEnabled:false,curveSegments:8
      }),wall,x,1.218,z);
      wallPanel.rotation.y=wallPlaneRotation;
      const rim=roundedShape(2.21,1.185,.121);
      rim.holes.push(new THREE.Path(roundedShape(2.105,1.08,.091).getPoints(12).reverse()));
      const gasket=mesh(new THREE.ExtrudeGeometry(rim,{
        depth:.026,bevelEnabled:true,bevelThickness:.009,bevelSize:.008,bevelSegments:2,curveSegments:10
      }),frame,x-sign*.061,1.473,z);
      gasket.rotation.y=wallPlaneRotation;
      const pane=mesh(new THREE.ShapeGeometry(roundedShape(2.12,1.10,.095)),new THREE.MeshBasicMaterial({
        color:'#9db8c1',transparent:true,opacity:.05,depthWrite:false,side:THREE.DoubleSide
      }),x-sign*.04,1.473,z);
      pane.rotation.y=wallPlaneRotation;
      pane.castShadow=pane.receiveShadow=false;
      box(trim,x-sign*.085,.882,z,.14,.038,2.29);
      box(wood,x-sign*.079,.901,z,.139,.018,2.16);
      box(lower,x-sign*.008,.434,z,.068,.858,2.353);
      box(rubber,x-sign*.05,.072,z,.042,.14,2.36);
      box(trim,x-sign*.025,2.28,z,.16,.20,2.355);
      for (let v=-8;v<=8;v++) box(frame,x-sign*.112,2.262,z+v*.082,.007,.028,.046);
    }
    rail([x-sign*.225,2.18,-5],[x-sign*.225,2.18,2.02],.017,aluminium);
  }
  // Bench pair behind each other lets the near actor stay fully visible from the aisle.
  function seatShell(x,z,occupied=false) {
    const y=.448;
    const bottom=mesh(softPanel(.505,.496,.060,.062,.013),wood,x,y-.037,z);
    bottom.rotation.x=-Math.PI/2;
    const cushion=mesh(softPanel(.49,.486,.111,.062,.026),fabric,x,.465,z+.005);
    cushion.rotation.x=-Math.PI/2-.025;
    const back=mesh(softPanel(.50,.79,.060,.066,.017),wood,x,.884,z-.269);
    back.rotation.x=-.115;
    const backPad=mesh(softPanel(.478,.738,.093,.061,.022),fabric,x,.884,z-.245);
    backPad.rotation.x=-.115;
    const pad=mesh(softPanel(.406,.151,.037,.043,.010),headrest,x,1.15,z-.241);
    pad.rotation.x=-.115;
    // Two slim welts and the cushion's darker underside give the upholstery depth.
    for (const offset of [-.215,.215]) rail([x+offset,.56,z-.163],[x+offset,1.157,z-.235],.0035,piping);
    box(trim,x,.25,z-.045,.074,.4,.095);
    box(frame,x,.100,z,.335,.085,.29);
    if(!occupied) box(trim,x,.615,z-.319,.226,.072,.027);
  }
  for (const z of [-3.55,-2.37,-1.19,-.26]) {
    for (const x of [-.84,-.315,.61,1.13]) seatShell(x,z,x===-.84&&z===-.26);
    for (const x of [-.048,.34]) {
      rail([x,.446,z-.155],[x,.69,z-.10],.011,aluminium);
      const arm=mesh(softPanel(.059,.31,.041,.027,.009),rubber,x,.694,z-.009);
      arm.rotation.x=-Math.PI/2;
    }
  }
  // The near side of the aisle remains open for the gameplay camera.
  for(const z of [-3.37,-1.06]) {
    rail([-.055,.46,z],[-.055,2.375,z],.022,aluminium);
    box(rubber,-.055,2.39,z,.075,.04,.07);
  }
  const rear=-5.19;
  box(lower,0,1.21,rear,3.05,2.42,.07);
  box(frame,.1,1.17,rear+.05,.94,2.16,.045);
  box(wall,.1,1.17,rear+.081,.873,2.09,.024);
  box(frame,.1,1.5,rear+.099,.645,.757,.015);
  box(paint('#344653',{roughness:.24}),.1,1.50,rear+.11,.59,.69,.009);
  rail([.415,.89,rear+.139],[.415,1.17,rear+.139],.014,aluminium);
  const routeCanvas=document.createElement('canvas');routeCanvas.width=512;routeCanvas.height=84;
  const display=routeCanvas.getContext('2d');display.fillStyle='#1c231f';display.fillRect(0,0,512,84);
  display.font='500 42px monospace';display.fillStyle='#dfad67';display.fillText('Berlin',26,59);
  const routeTexture=new THREE.CanvasTexture(routeCanvas);routeTexture.colorSpace=THREE.SRGBColorSpace;
  mesh(new THREE.PlaneGeometry(.85,.14),new THREE.MeshBasicMaterial({map:routeTexture}),.1,2.34,rear+.055);

  // City blocks slide past the carriage. Window recesses, cornices, station lamps,
  // roof levels and balcony rails are actual geometry, so they shift in perspective.
  const outdoors=new THREE.Group();
  root.add(outdoors);
  const city=new THREE.Group();
  const facade=new THREE.MeshStandardMaterial({color:0xffffff,roughness:.97});
  const exteriorSilhouette=paint('#292f43',{roughness:.95});
  const glazing=new THREE.MeshBasicMaterial({color:0xffffff});
  const blockColours=['#626578','#5b646e','#796a68','#6b6468','#595d71','#776f6c'];
  const glow=['#c79862','#e5ba83','#94795e','#d4ae7c','#9d8169'];
  const blockLength=52;
  let along=-26;
  while(along<25.8){
    const width=Math.min(4.6+random()*3.8,26-along);
    const z=along+width/2;
    const near=-8.0-random()*.95,top=2.65+random()*2.6,base=-4.4;
    const body=blockColours[Math.floor(random()*blockColours.length)];
    box(facade,near-2,(top+base)/2,z,4,top-base,width-.12,city,body);
    box(facade,near+.03,top-.07,z,.135,.14,width-.03,city,'#777785');
    box(exteriorSilhouette,near-2.05,top+.21,z,3.74,.44,width-.15,city);
    for(let f=0;f<4;f++) {
      const yy=top-.70-f*1.42;
      for(let column=0;column<Math.floor(width/1.15);column++) {
        const zz=along+.62+column*1.14;
        box(exteriorSilhouette,near+.026,yy,zz,.05,.865,.58,city);
        const lit=random()>.55;
        const colour=lit?glow[Math.floor(random()*glow.length)]:'#424c62';
        box(glazing,near+.055,yy,zz,.012,.767,.475,city,colour);
        box(facade,near+.07,yy,zz,.019,.79,.026,city,'#454955');
        box(facade,near+.07,yy+.13,zz,.019,.027,.49,city,'#454955');
        box(facade,near+.087,yy-.445,zz,.154,.058,.682,city,'#8a8790');
      }
    }
    box(exteriorSilhouette,near-1.46,top+.7,along+.8,.28,.97,.47,city);
    along+=width;
  }
  finishBatch(city,false);
  for (const z of [-blockLength,0,blockLength]) {
    const row=city.clone(true);row.position.z=z;outdoors.add(row);
  }
  const sky=mesh(new THREE.PlaneGeometry(170,35),new THREE.MeshBasicMaterial({color:'#7788a2'}),-22,4,-8);
  sky.rotation.y=Math.PI/2; sky.castShadow=sky.receiveShadow=false;
  const embankment=mesh(new THREE.PlaneGeometry(150,20),paint('#47544e'),-10,-3.18,0);
  embankment.rotation.x=-Math.PI/2;embankment.castShadow=embankment.receiveShadow=false;
  const passing=new THREE.Group();root.add(passing);
  const pole=paint('#484f57',{roughness:.85}),lamp=new THREE.MeshBasicMaterial({color:'#efc58f'});
  for(let k=-5;k<=5;k++){
    const z=k*8;
    box(pole,-3.97,.0,z,.078,6.15,.082,passing);
    box(pole,-3.72,2.87,z,.54,.06,.082,passing);
    box(lamp,-3.52,2.82,z,.22,.043,.146,passing);
  }
  finishBatch(passing,false);
  finishBatch(root,true);
  const movingMedia=typeof matchMedia==='function'?matchMedia('(prefers-reduced-motion: reduce)'):null;
  function update(time) {
    const distance=movingMedia?.matches?0:Math.max(0,time)*2.4;
    outdoors.position.z=distance%blockLength;
    passing.position.z=distance%8;
  }
  return { root,seat,camera,update };
}
