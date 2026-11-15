import * as THREE from 'three';
import {createRoom} from '../movement-test/room.js';

export function createApartment(scene) {
  const room = createRoom(THREE,scene,{movableBelongings:true});
  const {bag, smallFrame} = room.belongings;
  const mat = (colour, metalness=0) => new THREE.MeshStandardMaterial({color:colour,roughness:.67,metalness});
  const box = (parent,w,h,d,x,y,z,material) => {
    const object = new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);
    object.position.set(x,y,z); object.castShadow=object.receiveShadow=true; parent.add(object); return object;
  };
  const tray = new THREE.Group(); room.root.add(tray); tray.position.set(2.94,0,.58);
  const sage=mat('#9ca495'), oak=mat('#ac8c61'), iron=mat('#38413e',.35), steel=mat('#c2c6ba',.58), cream=mat('#ded4b4');
  box(tray,.61,.77,1.03,0,.39,0,sage);
  box(tray,.64,.045,1.07,0,.795,0,oak);
  box(tray,.014,.016,1.055,-.316,.783,0,mat('#92724e'));
  box(tray,.011,.009,1.05,-.32,.802,0,steel);
  const cupboardFace=mat('#a7ad9a');
  for(const side of [-1,1]){
    box(tray,.018,.625,.492,-.309,.408,side*.251,cupboardFace);
    box(tray,.031,.018,.112,-.334,.657,side*.097,iron);
  }
  box(tray,.42,.033,.42,-.02,.835,-.21,iron);
  const kettle = new THREE.Group(); tray.add(kettle); kettle.position.set(-.02,.85,-.21);
  const profile=[[.072,0],[.12,.02],[.125,.13],[.10,.195],[.079,.205],[.025,.213],[0,.215]].map(([r,y])=>new THREE.Vector2(r,y));
  const pot=new THREE.Mesh(new THREE.LatheGeometry(profile,36),steel);pot.castShadow=true;kettle.add(pot);
  const handle=new THREE.Mesh(new THREE.TorusGeometry(.078,.013,8,24),iron);handle.position.set(0,.13,-.108);handle.rotation.y=Math.PI/2;kettle.add(handle);
  const spout=new THREE.Mesh(new THREE.ConeGeometry(.040,.11,18),steel);spout.position.set(0,.114,.12);spout.rotation.x=.82;kettle.add(spout);
  // Model the inner wall and base so the unfilled mug has a visible interior.
  const cupProfile=[[0,0],[.031,0],[.035,.005],[.042,.079],[.041,.083],[.037,.083],[.035,.079],[.029,.013],[0,.012]];
  const mug=new THREE.Mesh(new THREE.LatheGeometry(cupProfile.map(([r,y])=>new THREE.Vector2(r,y)),28),cream);
  mug.position.set(-.10,.821,.105);mug.castShadow=mug.receiveShadow=true;tray.add(mug);
  const ear=new THREE.Mesh(new THREE.TorusGeometry(.023,.005,8,24),cream);
  ear.position.set(-.043,.045,0);mug.add(ear);
  const tea=new THREE.Mesh(new THREE.CircleGeometry(1,32),new THREE.MeshStandardMaterial({color:'#643c23',roughness:.22}));
  tea.name='Tea in the mug';tea.rotation.x=-Math.PI/2;tea.visible=false;mug.add(tea);
  let teaMade=false,firstState=true,fillTime=null,lastTime=0;
  const motionPreference=typeof matchMedia==='function'?matchMedia('(prefers-reduced-motion: reduce)'):null;
  const mistCanvas=document.createElement('canvas');mistCanvas.width=mistCanvas.height=64;
  const mistContext=mistCanvas.getContext('2d');
  const mistGradient=mistContext.createRadialGradient(32,32,0,32,32,30);
  mistGradient.addColorStop(0,'rgba(255,255,255,.88)');
  mistGradient.addColorStop(.4,'rgba(255,255,255,.48)');
  mistGradient.addColorStop(1,'rgba(255,255,255,0)');
  mistContext.fillStyle=mistGradient;mistContext.fillRect(0,0,64,64);
  const mistTexture=new THREE.CanvasTexture(mistCanvas);
  const steam=new THREE.Group();steam.name='Steam above the tea tray';steam.visible=false;tray.add(steam);
  const vapour=[];
  function makeSteam(x,y,z,height,count,offset){
    for(let i=0;i<count;i++){
      const material=new THREE.SpriteMaterial({map:mistTexture,color:'#e9e6dd',transparent:true,depthWrite:false});
      const sprite=new THREE.Sprite(material);
      steam.add(sprite);
      vapour.push({sprite,x,y,z,height,phase:(i+.5)/count,offset});
    }
  }
  makeSteam(-.10,.906,.105,.175,4,0);
  makeSteam(-.02,1.005,-.05,.205,4,.6);
  function teaLevel(amount){
    const radius=.029+.006*amount;
    tea.scale.set(radius,radius,1);
    tea.position.y=.014+.060*amount;
  }
  const spices=new THREE.Group();tray.add(spices);spices.position.set(.08,.821,.30);
  const jar=new THREE.Mesh(new THREE.CylinderGeometry(.041,.045,.098,22),mat('#a7572e'));jar.position.y=.05;spices.add(jar);
  const lid=new THREE.Mesh(new THREE.CylinderGeometry(.047,.047,.019,22),mat('#b39666',.24));lid.position.y=.112;spices.add(lid);
  box(spices,.053,.032,.005,0,.060,.043,cream);
  const clothCanvas=document.createElement('canvas');clothCanvas.width=clothCanvas.height=256;
  const ctx=clothCanvas.getContext('2d');ctx.fillStyle='#925c48';ctx.fillRect(0,0,256,256);
  for(let i=0;i<256;i+=4){ctx.fillStyle=i%16?'#99654d':'#825440';ctx.fillRect(0,i,256,1);}
  for(const p of [12,18,28,36,220,228,238,244]){ctx.fillStyle='#c5a888';ctx.fillRect(0,p,256,p%4===0?2:1);}
  for(let i=0;i<256;i+=3){ctx.fillStyle='rgba(246,214,177,.11)';ctx.fillRect(i,0,1,256);}
  const textile=new THREE.CanvasTexture(clothCanvas);textile.colorSpace=THREE.SRGBColorSpace;
  const blanketGeo=new THREE.PlaneGeometry(1,1,44,22), attribute=blanketGeo.attributes.position;
  for(let i=0;i<attribute.count;i++){
    const u=attribute.getX(i)*2,v=attribute.getY(i),edge=Math.max(0,(Math.abs(u)-.84)/.16);
    attribute.setXYZ(i,-2.315+u*(.74+.048*edge),.559+.008*Math.cos(u*17+v*8)+.005*Math.sin(v*22)-.181*edge*edge,.69-v*.49);
  }
  blanketGeo.computeVertexNormals();
  const blanket=new THREE.Mesh(blanketGeo,new THREE.MeshStandardMaterial({map:textile,roughness:1,side:THREE.DoubleSide}));
  blanket.castShadow=blanket.receiveShadow=true;room.root.add(blanket);
  const positionBed=smallFrame.position.clone();
  room.obstacles.push({minX:2.61,maxX:3.27,minZ:.04,maxZ:1.12});
  const stand={x:room.seat.x+.345,z:room.seat.z};
  const spots={drop:{x:-.30,z:-.43}, photo:stand, spice:{x:2.30,z:.62}, blanket: {x:-1.28,z:.73}, window:{x:.82,z:-1.92}, radiator:{x:1.05,z:-1.94}, tea:{x:2.30,z:.45}, picture:{x:.58,z:1.78}, phone:stand, rest:stand};
  return {...room,spawn:{x:.62,z:1.47,yaw:-2.1},spots,
    update(time,sit){
      room.update(time,sit);
      lastTime=time;
      if(!teaMade)return;
      const reduced=motionPreference?.matches;
      if(fillTime!==null){
        const amount=reduced?1:THREE.MathUtils.clamp((time-fillTime)/.65,0,1);
        teaLevel(amount*(2-amount));
        if(amount===1)fillTime=null;
      }
      for(const wisp of vapour){
        const phase=(wisp.phase+(reduced?0:time*.54))%1;
        const curl=Math.sin(phase*Math.PI*2+wisp.offset);
        wisp.sprite.position.set(wisp.x+.021*phase+.010*curl,wisp.y+wisp.height*phase,wisp.z+.008*curl);
        wisp.sprite.scale.set(.019+.038*phase,.051+.037*phase,1);
        wisp.sprite.material.opacity=.26*Math.sin(Math.PI*phase);
      }
    },
    setState(state){
      const placed=state.stage!=='drop';bag.visible=placed;
      smallFrame.visible=!!state.choices.placement;
      if(state.choices.placement==='desk'){smallFrame.position.set(2.57,.91,-1.76);smallFrame.rotation.y=-.36;}
      else{smallFrame.position.copy(positionBed);smallFrame.rotation.y=.44;}
      spices.visible=state.unpacked.spices;blanket.visible=state.unpacked.blanket;
      const made=state.flags?.tea===true;
      if(made&&!teaMade){
        fillTime=firstState||motionPreference?.matches?null:lastTime;
        teaLevel(fillTime===null?1:0);
      }
      teaMade=made;tea.visible=steam.visible=made;firstState=false;
    }
  };
}
