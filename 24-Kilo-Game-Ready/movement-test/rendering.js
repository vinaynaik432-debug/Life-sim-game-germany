import * as THREE from 'three';
const clamp = THREE.MathUtils.clamp;

export function lightRoom(scene) {
  scene.add(new THREE.HemisphereLight(0xd9e5f6, 0xa68f77, 1.03));
  const key = new THREE.DirectionalLight(0xffdfb6, 1.35);
  key.position.set(2.2, 3.6, 3.9);
  key.target.position.set(-0.8, 0.5, -0.35);
  key.castShadow = true;
  Object.assign(key.shadow.camera, {left: -4.9, right: 4.9, top: 4.2, bottom: -4.2, near: 0.1, far: 13});
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.radius = 4;
  key.shadow.blurSamples = 8;
  key.shadow.normalBias = 0.012;
  key.shadow.bias = -0.00015;
  scene.add(key, key.target);
  const windowLight = new THREE.DirectionalLight(0xa6c4ee, 0.68);
  windowLight.position.set(0.5, 2.7, -3.5);
  scene.add(windowLight);
  for (const [x, y, z, intensity] of [[-3.02,.99,-.64,3.2],[2.43,1.22,-1.51,5.5]]) {
    const lamp = new THREE.PointLight(0xffb66e, intensity, 4.4, 2);
    lamp.position.set(x,y,z);
    scene.add(lamp);
  }
}

export function makeDestination(scene) {
  const material = new THREE.MeshBasicMaterial({color: 0xf5df9c, transparent: true, opacity: 0.75, depthWrite: false});
  const marker = new THREE.Mesh(new THREE.RingGeometry(0.077,0.091,36),material);
  marker.rotation.x = -Math.PI / 2;
  marker.visible = false;
  scene.add(marker);
  return marker;
}

// Small contact shadows keep furniture and moving shoes visually attached to the floor.
export function makeContactShadows(scene, actorRoot, furniture = true) {
  const image = document.createElement('canvas');
  image.width = image.height = 96;
  const brush = image.getContext('2d');
  const fade = brush.createRadialGradient(48,48,0,48,48,47);
  fade.addColorStop(0,'rgba(33,24,18,0.8)');
  fade.addColorStop(.51,'rgba(33,24,18,0.45)');
  fade.addColorStop(1,'rgba(33,24,18,0)');
  brush.fillStyle = fade;
  brush.fillRect(0,0,96,96);
  const map = new THREE.CanvasTexture(image);
  map.colorSpace = THREE.SRGBColorSpace;
  const geometry = new THREE.PlaneGeometry(1,1);
  function shadow(x,z,width,depth,alpha,y=.004) {
    const material = new THREE.MeshBasicMaterial({map, transparent:true, opacity:alpha, depthWrite:false, toneMapped:false});
    const mesh = new THREE.Mesh(geometry,material);
    mesh.rotation.x = -Math.PI/2;
    mesh.position.set(x,y,z);
    mesh.scale.set(width,depth,1);
    scene.add(mesh);
    return mesh;
  }
  if (furniture) {
  shadow(-2.30,-.21,1.92,2.85,.60);
  shadow(-.32,-1.16,1.36,.95,.73);
  shadow(2.20,-1.66,2.28,1.02,.56);
  shadow(2.04,-.81,.75,.82,.47);
  }
  const feet = ['LeftFoot','RightFoot'].map(name => ({
    joint: actorRoot.getObjectByName(name), mesh: shadow(0,0,.24,.37,.42,.024)
  }));
  const position = new THREE.Vector3();
  return function update() {
    for (const {joint,mesh} of feet) {
      if (!joint) { mesh.visible=false; continue; }
      joint.getWorldPosition(position);
      mesh.position.x = position.x + Math.sin(actorRoot.rotation.y)*.042;
      mesh.position.z = position.z + Math.cos(actorRoot.rotation.y)*.042;
      mesh.rotation.z = actorRoot.rotation.y;
      mesh.material.opacity = clamp(.64-position.y*1.6,.12,.55);
    }
  };
}

