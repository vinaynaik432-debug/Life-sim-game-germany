import * as THREE from 'three';
import {createNavigation} from '../movement-test/navigation.js';
import {lightRoom,makeDestination,makeContactShadows} from '../movement-test/rendering.js';
import {createAirport,createRollingBag} from './airport.js';
import {createApartment} from './apartment.js';
import {createTrain} from './train.js';
import {createActor} from './actor.js';

const clamp=THREE.MathUtils.clamp, mix=THREE.MathUtils.lerp;
const ease=t=>t*t*(3-2*t);
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const angle=(from,to)=>Math.atan2(Math.sin(to-from),Math.cos(to-from));
const moveKeys=['w','a','s','d','arrowup','arrowleft','arrowdown','arrowright'];
function publicLighting(scene,ride) {
  scene.add(new THREE.HemisphereLight(ride?0xf4dfc4:0xdbe8fc,0x8d8881,1.55));
  const sun=new THREE.DirectionalLight(ride?0xffd8ae:0xffe2be,1.75);
  sun.position.set(3.8,5.9,3.7); sun.castShadow=true;
  Object.assign(sun.shadow.camera,{left:-8,right:8,top:6,bottom:-6,near:.1,far:24});
  sun.shadow.mapSize.set(1024,1024);sun.shadow.radius=4;sun.shadow.normalBias=.018;scene.add(sun);
  const fill=new THREE.DirectionalLight(0xb5d5fc,.7);fill.position.set(-3,3,-3);scene.add(fill);
}

function makeGuideArrow(scene) {
  const shape=new THREE.Shape();
  shape.moveTo(0,.19);shape.lineTo(-.15,-.05);shape.lineTo(-.055,-.015);
  shape.lineTo(-.055,-.17);shape.lineTo(.055,-.17);shape.lineTo(.055,-.015);
  shape.lineTo(.15,-.05);shape.closePath();
  const geometry=new THREE.ShapeGeometry(shape);
  geometry.rotateX(-Math.PI/2);
  const arrow=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({
    color:0xffdf9d,transparent:true,opacity:.86,depthWrite:false,toneMapped:false,
    polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1
  }));
  arrow.visible=false;arrow.renderOrder=4;scene.add(arrow);
  return arrow;
}

export class ChapterWorld {
  constructor(canvas,markers,{onAction,onMenu,onStop,onPrompt,createScene}) {
    Object.assign(this,{canvas,markers,onAction,onMenu,onStop,onPrompt,createScene});
    this.renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
    this.renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.6));
    this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=THREE.VSMShadowMap;
    this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.04;
    this.camera=new THREE.PerspectiveCamera(40,1,.06,64);
    this.focus=new THREE.Vector3();this.aim=new THREE.Vector3();this.eye=new THREE.Vector3();
    this.forward=new THREE.Vector3();this.right=new THREE.Vector3();this.point=new THREE.Vector3();
    this.gripOffset=new THREE.Vector3();
    this.raycaster=new THREE.Raycaster();this.floor=new THREE.Plane(new THREE.Vector3(0,1,0),0);
    this.sets=new Map();this.keys=new Set();this.actions=[];this.route=[];this.elapsed=0;this.phase=0;this.speed=0;
    this.time=0;this.sit=0;this.photo=0;this.closeUp=0;this.mode='free';this.enabled=false;this.title=true;this.suspended=false;
    this.reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.luggage=createRollingBag(THREE);this.marker=null;this.prompt='';
    this.guide=null;this.guidedKey=null;this.guidePath=[];this.guideUpdated=-Infinity;this.canInteract=false;
    this.resize();new ResizeObserver(()=>this.resize()).observe(canvas.parentElement);
    this.bindInput();this.renderer.setAnimationLoop(t=>this.frame(t));
  }
  resize() {
    const rect=this.canvas.getBoundingClientRect();this.width=rect.width;this.height=rect.height;
    this.renderer.setSize(Math.max(1,rect.width),Math.max(1,rect.height),false);
    this.camera.aspect=rect.width/Math.max(1,rect.height);
    this.camera.fov=this.camera.aspect<.93?52:40;this.camera.updateProjectionMatrix();
  }
  bindInput() {
    window.addEventListener('keydown',e=>{
      if (!this.enabled || e.altKey||e.ctrlKey||e.metaKey) return;
      const key=e.key.toLowerCase();
      if (moveKeys.includes(key)) {e.preventDefault();this.keys.add(key);}
      if (!e.repeat && (key==='e'||(key===' '&&e.target===this.canvas))) {e.preventDefault();this.activate();}
      if (!e.repeat && key==='escape') {e.preventDefault();this.onMenu();}
    });
    window.addEventListener('keyup',e=>this.keys.delete(e.key.toLowerCase()));
    window.addEventListener('blur',()=>this.keys.clear());
    document.addEventListener('visibilitychange',()=>{this.keys.clear();this.previous=undefined;});
    this.canvas.addEventListener('pointerdown',e=>{
      if (!this.enabled||e.button!==0) return;
      this.canvas.focus({preventScroll:true});
      const rect=this.canvas.getBoundingClientRect();
      this.raycaster.setFromCamera({x:2*(e.clientX-rect.left)/rect.width-1,y:1-2*(e.clientY-rect.top)/rect.height},this.camera);
      const hit=this.pickAction();
      if(hit){this.go(hit);return;}
      if(!this.set.walkBounds||!this.raycaster.ray.intersectPlane(this.floor,this.point))return;
      const b=this.set.walkBounds,p=this.point;
      if(p.x>=b.minX&&p.x<=b.maxX&&p.z>=b.minZ&&p.z<=b.maxZ) this.walk(p);
    });
  }
  pickAction() {
    let hit=null,best=Infinity;
    for(const action of this.actions) {
      let distance=Infinity;
      if(action.target?.visible) {
        const contact=this.raycaster.intersectObject(action.target,true)[0];
        if(contact)distance=contact.distance;
      }
      if(action.hitBounds&&this.raycaster.ray.intersectBox(action.hitBounds,this.point)){
        distance=Math.min(distance,this.raycaster.ray.origin.distanceTo(this.point));
      }
      if(distance<best){best=distance;hit=action;}
    }
    return hit;
  }
  build(place,state) {
    const scene=new THREE.Scene();scene.background=new THREE.Color(place==='airport'?0x6b7d88:0x393b38);
    if (place==='room'||place==='home') lightRoom(scene);else publicLighting(scene,place==='ride');
    let set;
    if(place==='airport')set=createAirport(THREE,scene);
    else if(place==='ride')set=createTrain(THREE,scene);
    else set=this.createScene?.(place,scene,state)||(place==='room'?createApartment(scene):null);
    if(!set)throw new Error(`Unknown story location: ${place}`);
    set.scene=scene;set.marker=makeDestination(scene);set.guide=makeGuideArrow(scene);
    if(set.walkBounds)set.nav=createNavigation(set.walkBounds,set.obstacles);
    this.sets.set(place,set);return set;
  }
  async useActor(appearance) {
    const next=await createActor(THREE,appearance);
    if (this.actor) { this.actor.root.removeFromParent();this.actor.dispose?.(); }
    this.actor=next;this.body=next.root;
  }
  scene(place,state,resume=null) {
    this.resetMotion();this.place=place;this.set=this.sets.get(place)||this.build(place,state);
    this.marker=this.set.marker;this.guide=this.set.guide;this.guidedKey=null;this.guideUpdated=-Infinity;
    this.sit=place==='ride'?1:0;this.photo=0;this.closeUp=0;
    this.setState(state);
    if(this.body){
      this.set.scene.add(this.body);this.body.visible=!this.title;
      const spawn=place==='ride'?this.set.seat:this.set.spawn;
      const p=resume?.scene===place&&this.set.nav?.open(resume.x,resume.z)?resume:spawn;
      this.body.position.set(p.x,0,p.z);this.body.rotation.y=p.yaw||0;
      if (this.set.shadowActor!==this.actor && place!=='ride') {
        // Each run uses the same figure in both scenes. Keep old feet-shadow helpers out of replays.
        this.set.shadowGroup?.removeFromParent();
        this.set.shadowGroup=new THREE.Group();this.set.scene.add(this.set.shadowGroup);
        this.set.shadowUpdate=makeContactShadows(this.set.shadowGroup,this.body,place==='room'||place==='home');this.set.shadowActor=this.actor;
      }
    }
    this.set.scene.add(this.luggage);this.updateCamera(0,true);
  }
  setState(state){
    this.state=state;
    const airport=state.stage==='ticket'||state.stage==='train';
    this.carrying=airport||state.stage==='drop';
    this.luggage.visible=!this.title&&(this.carrying||this.place==='ride');
    if(this.place==='airport')this.set.setState({bagTaken:airport,ticketBought:state.stage==='train'});
    else this.set.setState?.(state);
    if(this.set.navigationVersion!==this.set.appliedNavigationVersion){
      this.set.nav=createNavigation(this.set.walkBounds,this.set.obstacles);
      this.set.appliedNavigationVersion=this.set.navigationVersion;
      this.guideUpdated=-Infinity;
    }
    if(this.place==='ride'){this.luggage.position.set(-.35,0,.26);this.luggage.rotation.set(0,.41,0);}
  }
  resetMotion(){
    this.route=[];this.pending=null;this.keys.clear();this.speed=0;this.mode='free';this.elapsed=0;
    if(this.marker)this.marker.visible=false;
    if(this.guide)this.guide.visible=false;
  }
  setEnabled(enabled) {
    this.enabled=enabled;this.keys.clear();
    if(!enabled){
      this.route=[];this.pending=null;this.speed=0;
      if(this.mode==='facing')this.mode='free';
      if(this.marker)this.marker.visible=false;
      if(this.guide)this.guide.visible=false;
    }
    this.markers.hidden=!enabled;this.updatePrompt();
  }
  setActions(actions) {
    this.actions=actions;this.markers.replaceChildren();
    if(!actions.some(a=>a.key===this.guidedKey))this.guidedKey=null;
    this.guideUpdated=-Infinity;
    for(const a of actions) {
      if(a.bounds){
        a.hitBounds=new THREE.Box3(new THREE.Vector3().fromArray(a.bounds),new THREE.Vector3().fromArray(a.bounds,3));
      }
      const tag=document.createElement('button');tag.type='button';tag.className='spot'+(a.primary?' primary':'');
      tag.setAttribute('aria-label',a.label);tag.title=a.label;
      const dot=document.createElement('span');dot.className='spot-dot';tag.append(dot);
      const label=document.createElement('span');label.className='spot-label';label.textContent=a.markerLabel||a.label;tag.append(label);
      tag.onclick=()=>{if(this.enabled)this.go(a);};this.markers.append(tag);a.tag=tag;
    }
    this.updatePrompt();
  }
  currentAction(){
    if (!this.body)return null;
    return this.actions.filter(a=>this.inReach(a)).sort((a,b)=>distance(a.point,this.body.position)-distance(b.point,this.body.position))[0]||null;
  }
  inReach(action){
    return !!this.body&&distance(action.point,this.body.position)<(action.reach??.64);
  }
  guidedAction(){
    return this.actions.find(a=>a.key===this.guidedKey)||this.actions.find(a=>a.primary)||this.actions[0]||null;
  }
  updatePrompt(){
    const action=this.enabled?this.currentAction():null;
    const guided=this.enabled?this.guidedAction():null;
    const text=action?.label||(guided?'Follow the arrow':'');
    const primary=this.actions.find(a=>a.primary);
    const alternate=this.enabled&&primary&&primary!==action&&primary!==guided?primary:null;
    const canInteract=!!action;
    if(text!==this.prompt||alternate?.key!==this.alternate?.key||this.canInteract!==canInteract||this.promptGuide!==guided?.key){
      this.prompt=text;this.alternate=alternate;this.canInteract=canInteract;this.promptGuide=guided?.key;
      this.onPrompt(text,alternate,{canInteract,guided});
    }
  }
  activate(){
    if(!this.enabled)return;
    const action=this.currentAction();
    if(action)this.go(action);
  }
  walk(to) {
    if(!this.enabled||!this.set.nav||!this.body)return;
    const route=this.set.nav.route(this.body.position,to);
    if (!route.length)return;
    this.route=route;this.pending=null;this.mode='free';
    const end=route[route.length-1];this.marker.position.set(end.x,.027,end.z);this.marker.visible=true;this.markerAge=0;this.updatePrompt();
  }
  go(a){
    if (!this.enabled)return;
    this.guidedKey=a.key;this.guideUpdated=-Infinity;this.canvas.focus({preventScroll:true});
    if(this.inReach(a)){
      this.keys.clear();this.route=[];this.speed=0;this.pending=a;this.mode='facing';this.marker.visible=false;
    }
    this.updatePrompt();
  }
  position(){return this.body&&this.set?.nav?.open(this.body.position.x,this.body.position.z)?{scene:this.place,x:this.body.position.x,z:this.body.position.z,yaw:this.body.rotation.y}:null;}
  face(yaw,dt){const diff=angle(this.body.rotation.y,yaw);this.body.rotation.y+=clamp(diff,-dt*6,dt*6);return Math.abs(diff)<.035;}
  move(dt) {
    const side=Number(this.keys.has('d')||this.keys.has('arrowright'))-Number(this.keys.has('a')||this.keys.has('arrowleft'));
    const ahead=Number(this.keys.has('w')||this.keys.has('arrowup'))-Number(this.keys.has('s')||this.keys.has('arrowdown'));
    let dx=0,dz=0,remaining=Infinity;
    if(side||ahead){
      this.route=[];this.pending=null;this.marker.visible=false;
      this.camera.getWorldDirection(this.forward);this.forward.y=0;this.forward.normalize();this.right.crossVectors(this.forward,this.camera.up).normalize();
      dx=this.forward.x*ahead+this.right.x*side;dz=this.forward.z*ahead+this.right.z*side;
    } else if(this.route.length){
      const next=this.route[0];remaining=distance(next,this.body.position);
      if(remaining<.015){
        this.route.shift();if(!this.route.length){this.speed=0;this.marker.visible=false;
          this.pending=null;
          this.onStop();}return;
      }
      dx=next.x-this.body.position.x;dz=next.z-this.body.position.z;
    }
    const length=Math.hypot(dx,dz);let target=0;
    if(length){dx/=length;dz/=length;const yaw=Math.atan2(dx,dz),turn=Math.abs(angle(this.body.rotation.y,yaw));this.face(yaw,dt);
      target=Math.min(this.carrying?1.35:1.58,remaining*3.8+.2)*clamp(1-turn/1.8,.04,1);
    }else{dx=Math.sin(this.body.rotation.y);dz=Math.cos(this.body.rotation.y);}
    const prior=this.speed;this.speed+=(target-this.speed)*(1-Math.exp(-dt*(length?8.5:16)));
    if(this.speed<.012){this.speed=0;if(prior>0)this.onStop();return;}
    const p=this.body.position,x=p.x,z=p.z,s=Math.min(this.speed*dt,remaining);
    if(this.set.nav.open(x+dx*s,z))p.x+=dx*s;
    if(this.set.nav.open(p.x,z+dz*s))p.z+=dz*s;
    const d=Math.hypot(p.x-x,p.z-z);if(d<.00001){this.speed=0;return;}
    this.phase+=d*2*Math.PI/this.actor.strideLength;
  }
  pose(seated,withPhoto=false){
    const seat=this.set.seat;
    if(seated){this.body.rotation.y=seat.yaw;this.fromSeat={x:this.body.position.x,z:this.body.position.z};}
    this.mode=seated?'sitting':'rising';this.withPhoto=withPhoto;this.elapsed=0;
    return new Promise(resolve=>{this.poseDone=resolve;});
  }
  updatePose(dt){
    const down=this.mode==='sitting',end=down?(this.withPhoto?2.25:1.25):(this.withPhoto?1.78:1.2);
    this.elapsed+=dt;
    this.sit=down?ease(clamp(this.elapsed/1.25,0,1)):1-ease(clamp((this.elapsed-(this.withPhoto?.57:0))/1.2,0,1));
    this.photo=this.withPhoto?(down?ease(clamp((this.elapsed-1.2)/1.05,0,1)):1-ease(clamp(this.elapsed/.57,0,1))):0;
    this.body.position.x=mix(this.fromSeat.x,this.set.seat.x,this.sit);this.body.position.z=mix(this.fromSeat.z,this.set.seat.z,this.sit);
    if(this.elapsed>=end){this.mode=down?'seated':'free';const done=this.poseDone;this.poseDone=null;done?.();}
  }
  updateCamera(dt,snap=false){
    if(!this.set)return;
    const narrow=this.camera.aspect<.95;
    if(this.place==='ride'){
      this.eye.fromArray(this.set.camera.position);this.aim.fromArray(this.set.camera.lookAt);
    }else if(this.title){
      this.eye.set(narrow?-2.7:1.3,2.14,narrow?4.3:4.9);this.aim.set(narrow?-1.5:-.15,.95,-1.05);
    }else if(this.body){
      const p=this.body.position;
      if(this.place==='airport'){
        this.aim.set(narrow?p.x:clamp(p.x*.76,-4.85,4.85),1.05,narrow?p.z-.28:-.80+p.z*.55);
        this.eye.copy(this.aim);this.eye.x+=narrow?.40:1.06;this.eye.y+=narrow?1.15:1.45;this.eye.z+=narrow?4.6:5.5;
      }else if(this.place!=='room'&&this.place!=='home'){
        const config=this.set.camera||{};
        const origin=config.lookAt||[0,1,0];
        const offset=config.offset||[1.4,1.7,5.5];
        const follow=narrow?1:(config.follow??.7);
        this.aim.set(mix(origin[0],p.x,follow),config.height??origin[1],mix(origin[2],p.z,follow));
        if(config.position){
          this.eye.fromArray(config.position).sub(new THREE.Vector3().fromArray(origin)).add(this.aim);
        }else this.eye.copy(this.aim).add(new THREE.Vector3().fromArray(offset));
      }else{
        // Track the foreground as well as the back wall, leaving space for feet
        // and the floor guide even at the front edge of the walkable room.
        const followX=THREE.MathUtils.mapLinear(clamp(this.camera.aspect,1,1.65),1,1.65,.95,.55);
        this.aim.set(narrow?p.x:-.1+p.x*followX,.80,narrow?p.z-.15:-.2+p.z*.80);
        this.eye.copy(this.aim);this.eye.x+=narrow?.65:1.3;this.eye.y+=narrow?1.9:2.05;this.eye.z+=narrow?5.25:5.6;
        this.closeUp+=(this.sit-this.closeUp)*(1-Math.exp(-dt*3));
        const weight=this.reduced?0:ease(this.closeUp),s=this.set.seat;
        this.point.set(s.x+.23,.91,s.z);this.aim.lerp(this.point,weight);
        this.point.add(new THREE.Vector3(narrow?1.95:2.60,.75,narrow?2.0:2.3));this.eye.lerp(this.point,weight);
      }
    }
    const factor=snap?1:1-Math.exp(-dt*4.8);this.focus.lerp(this.aim,factor);this.camera.position.lerp(this.eye,factor);this.camera.lookAt(this.focus);this.camera.updateMatrixWorld();
  }
  updateMarkers(){
    if(!this.enabled)return;
    for(const a of this.actions){
      this.point.set(a.anchor.x,a.anchor.y,a.anchor.z).project(this.camera);
      const {x,y,z}=this.point;a.tag.hidden=z>1||z< -1||Math.abs(x)>.96||Math.abs(y)>.88;
      if(!a.tag.hidden){
        a.tag.style.transform=`translate(${(x+1)*this.width*.5}px,${(1-y)*this.height*.5}px) translate(-50%,-100%)`;
        a.tag.classList.toggle('within-reach',this.inReach(a));
      }
    }
  }
  updateGuide(){
    const target=this.guidedAction();
    if(!this.guide)return;
    this.guide.visible=this.enabled&&this.mode==='free'&&!!target&&!this.inReach(target);
    if(!this.guide.visible)return;
    const p=this.body.position;
    if(this.time-this.guideUpdated>.35){
      this.guidePath=this.set.nav?.route(p,target.point)||[];
      this.guideUpdated=this.time;
    }
    const next=this.guidePath.find(point=>distance(p,point)>.23)||target.point;
    const dx=next.x-p.x,dz=next.z-p.z,length=Math.hypot(dx,dz);
    if(length<.01){this.guide.visible=false;return;}
    const offset=.48;
    this.guide.position.set(p.x+dx/length*offset,.04,p.z+dz/length*offset);
    this.guide.rotation.y=Math.atan2(-dx,-dz);
    this.guide.material.opacity=this.reduced?.86:.78+.09*Math.sin(this.time*2.6);
  }
  pictures(){
    return this.capturePictures([
      ['whole',[1.34,1.92,2.92],[-.58,.80,-.72],63],
      ['tidy',[-.53,1.38,1.54],[-2.50,.93,-.69],40]
    ]);
  }
  dinnerPicture(){
    return this.capturePictures([['dinner',[.48,1.74,2.77],[.02,.78,1.33],46]]).dinner;
  }
  capturePictures(views){
    const size=this.renderer.getSize(new THREE.Vector2()),ratio=this.renderer.getPixelRatio();
    const shot=new THREE.PerspectiveCamera(57,16/9,.05,40),pictures={};
    const hidden=[this.body,this.marker,this.guide];const was=hidden.map(o=>o.visible);
    hidden.forEach(o=>o.visible=false);
    try{
      this.renderer.setPixelRatio(1);this.renderer.setSize(640,360,false);
      for(const [key,pos,aim,fov] of views){
        shot.position.fromArray(pos);shot.lookAt(...aim);shot.fov=fov;shot.updateProjectionMatrix();
        this.renderer.render(this.set.scene,shot);pictures[key]=this.canvas.toDataURL('image/jpeg',.84);
      }
    }finally{hidden.forEach((o,i)=>o.visible=was[i]);this.renderer.setPixelRatio(ratio);this.renderer.setSize(size.x,size.y,false);this.renderer.render(this.set.scene,this.camera);}
    return pictures;
  }
  frame(now){
    if(this.suspended||document.hidden||!this.set){this.previous=undefined;return;}
    const dt=this.previous===undefined?0:Math.min(.06,(now-this.previous)/1000);this.previous=now;this.time+=dt;
    if(this.body&&!this.title){
      if(this.mode==='sitting'||this.mode==='rising')this.updatePose(dt);
      else if(this.enabled&&this.mode==='free')this.move(dt);
      else if(this.enabled&&this.mode==='facing'&&this.pending){
        const a=this.pending;
        if(!this.inReach(a)){this.mode='free';this.pending=null;}
        else if(this.face(a.yaw??0,dt)){this.mode='free';this.pending=null;this.onAction(a.key);}
      }
      this.actor.update({dt,time:this.time,speed:this.speed,phase:this.phase,sit:this.sit,photo:this.photo,pulling:this.carrying?1:0});
      if(this.carrying){
        const hand=this.actor.luggageHand;
        this.point.set(-.22,.80,-.16);if(hand)hand.getWorldPosition(this.point);else this.body.localToWorld(this.point);
        // The pull handle is recessed on the back of the case. Match its transformed grip
        // to the animated hand while keeping the tilted front wheels in contact with the floor.
        const tilt=.20,ground=.018,gripY=.82,gripZ=-.101;
        this.luggage.rotation.set(tilt,this.body.rotation.y,0,'YXZ');
        this.luggage.scale.y=Math.max(.1,(this.point.y-ground+gripZ*Math.sin(tilt))/(gripY*Math.cos(tilt)));
        this.gripOffset.set(0,gripY,gripZ).multiply(this.luggage.scale).applyQuaternion(this.luggage.quaternion);
        this.luggage.position.copy(this.point).sub(this.gripOffset);
      }else this.luggage.scale.y=1;
      this.set.shadowUpdate?.();
    }
    this.set.update?.(this.time,this.sit);
    if(this.marker?.visible){this.markerAge+=dt;this.marker.material.opacity=Math.max(0,.70-this.markerAge*.42);if(this.markerAge>1.7)this.marker.visible=false;}
    this.updateCamera(dt);this.updateMarkers();this.updateGuide();this.updatePrompt();this.renderer.render(this.set.scene,this.camera);
  }
}
