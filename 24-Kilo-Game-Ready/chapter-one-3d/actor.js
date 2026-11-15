// The model faces +Z. Its authored one-second walking cycle covers 1.45 metres.
import { GLTFLoader } from '../movement-test/vendor/GLTFLoader.js';
import { applyHairShape } from './hair-shape.js';
import { cleanAppearance, PALETTES } from './appearance.js';

const TAU = 2 * Math.PI;
const clamp = (n, low, high) => Math.max(low, Math.min(high, n));
const mix = (a, b, t) => a + (b - a) * t;
const smooth = value => {
  const t = clamp(value, 0, 1);
  return t * t * (3 - 2 * t);
};

const rigTemplates = new Map();

async function templateFor(T, gender) {
  if (rigTemplates.has(gender)) return rigTemplates.get(gender);
  const modelName = gender === 'male' ? 'man' : 'woman';
  const path = gender === 'male' ? './assets/man.glb' : '../movement-test/assets/woman.glb';
  const load = Promise.all([
    new GLTFLoader().loadAsync(new URL(path, import.meta.url).href),
    new T.TextureLoader().loadAsync(new URL('./assets/' + modelName + '-regions.png', import.meta.url).href)
  ]).then(([gltf, regions]) => {
    regions.flipY = false;
    regions.colorSpace = T.NoColorSpace;
    const anchors = gender === 'male'
      ? ['#ab654c','#291c12','#476160'] : ['#af6a51','#30180b','#496362'];
    return {gltf, regions, anchors:anchors.map(value => new T.Color(value))};
  }).catch(error => { rigTemplates.delete(gender); throw error; });
  rigTemplates.set(gender, load);
  return load;
}

// Geometry and atlas textures are shared. Each traveller has their own skeleton and palette.
function instantiateRig(T, template) {
  const scene = template.gltf.scene.clone(true);
  const sources = [], clones = [];
  template.gltf.scene.traverse(node => sources.push(node));
  scene.traverse(node => clones.push(node));
  const counterparts = new Map(sources.map((node, i) => [node, clones[i]]));
  const materials = [];
  const uniforms = Object.fromEntries(['skin','hair','outfit'].map(key => [key, {value: new T.Color(1,1,1)}]));
  sources.forEach((source, i) => {
    if (!source.isSkinnedMesh) return;
    const clone = clones[i];
    const bones = source.skeleton.bones.map(bone => counterparts.get(bone));
    clone.skeleton = new T.Skeleton(bones, source.skeleton.boneInverses);
    clone.bind(clone.skeleton, source.bindMatrix);
    clone.material = source.material.clone();
    materials.push(clone.material);
    clone.material.onBeforeCompile = shader => {
      shader.uniforms.baseSkin = {value:template.anchors[0]};
      shader.uniforms.baseHair = {value:template.anchors[1]};
      shader.uniforms.baseOutfit = {value:template.anchors[2]};
      shader.uniforms.profileRegions = {value:template.regions};
      shader.uniforms.profileSkin = uniforms.skin;
      shader.uniforms.profileHair = uniforms.hair;
      shader.uniforms.profileOutfit = uniforms.outfit;
      shader.fragmentShader = shader.fragmentShader.replace('#include <common>', `#include <common>
        uniform sampler2D profileRegions;
        uniform vec3 profileSkin, profileHair, profileOutfit;
        uniform vec3 baseSkin, baseHair, baseOutfit;
        vec3 tone(vec3 albedo,vec3 base,vec3 target) {
          vec3 shadows = target * albedo / max(base,vec3(0.0001));
          vec3 highlights = target + (albedo-base)*(1.0-target)/(1.0-base);
          return mix(shadows,highlights,step(base,albedo));
        }`)
        .replace('#include <map_fragment>', `#include <map_fragment>
          vec3 regions = texture2D(profileRegions, vMapUv).rgb;
          diffuseColor.rgb = mix(diffuseColor.rgb,tone(diffuseColor.rgb,baseSkin,profileSkin),regions.r);
          diffuseColor.rgb = mix(diffuseColor.rgb,tone(diffuseColor.rgb,baseHair,profileHair),regions.g);
          diffuseColor.rgb = mix(diffuseColor.rgb,tone(diffuseColor.rgb,baseOutfit,profileOutfit),regions.b);`);
    };
    clone.material.customProgramCacheKey = () => 'traveller-palette-1';
  });
  return {scene, animations:template.gltf.animations, uniforms, materials};
}

export async function createActor(THREE, initialAppearance) {
  const T = THREE;
  const profile = cleanAppearance(initialAppearance);
  const isMale = profile.gender === 'male';
  const template = await templateFor(T, profile.gender);
  const model = instantiateRig(T, template);
  const root = new T.Group();
  root.name = 'Traveller';
  root.add(model.scene);
  const joints = new Map();
  model.scene.traverse(object => {
    if (object.isBone) joints.set(object.name, object);
    if (object.isMesh) {
      object.castShadow = object.receiveShadow = true;
      object.frustumCulled = false;
    }
  });
  const joint = name => joints.get(name);
  const vector = (x = 0, y = 0, z = 0) => new T.Vector3(x, y, z);
  const inverseRoot = new T.Matrix4();
  const rootRotation = new T.Quaternion();
  const inverseRotation = new T.Quaternion();
  function refreshFrame() {
    root.updateWorldMatrix(true, false);
    inverseRoot.copy(root.matrixWorld).invert();
    root.getWorldQuaternion(rootRotation);
    inverseRotation.copy(rootRotation).invert();
  }
  function position(bone) {
    return bone.getWorldPosition(vector()).applyMatrix4(inverseRoot);
  }
  function orientation(bone) {
    return bone.getWorldQuaternion(new T.Quaternion()).premultiply(inverseRotation);
  }
  function orient(bone, rotation) {
    const parentInverse = bone.parent.getWorldQuaternion(new T.Quaternion()).invert();
    bone.quaternion.copy(parentInverse).multiply(rootRotation).multiply(rotation);
  }
  function place(bone, target) {
    const worldTarget = target.clone().applyMatrix4(root.matrixWorld);
    bone.position.copy(bone.parent.worldToLocal(worldTarget));
  }
  function turn(bone, axis, radians) {
    const target = new T.Quaternion().setFromAxisAngle(axis, radians).multiply(orientation(bone));
    orient(bone, target);
  }
  function aim(bone, child, target) {
    const start = position(bone);
    const current = position(child).sub(start).normalize();
    const desired = target.clone().sub(start).normalize();
    const delta = new T.Quaternion().setFromUnitVectors(current, desired);
    orient(bone, delta.multiply(orientation(bone)));
  }
  // The pole controls the bend plane of each elbow or knee.
  function reach(upper, lower, end, goal, pole) {
    const origin = position(upper), previousBend = position(lower), tip = position(end);
    const a = origin.distanceTo(previousBend), b = previousBend.distanceTo(tip);
    const axis = goal.clone().sub(origin);
    const length = clamp(axis.length(), Math.abs(a - b) + 0.001, a + b - 0.0001);
    axis.normalize();
    const along = (a*a - b*b + length*length) / (2 * length);
    const across = Math.sqrt(Math.max(0, a*a - along*along));
    const bend = origin.clone().addScaledVector(axis, along)
      .addScaledVector(pole.clone().projectOnPlane(axis).normalize(), across);
    aim(upper, lower, bend);
    aim(lower, end, origin.addScaledVector(axis, length));
  }
  refreshFrame();
  const sides = ['Left', 'Right'].map((name, index) => {
    const side = index === 0 ? 1 : -1;
    const segment = part => joint(name + part);
    const arm = segment('Arm'), forearm = segment('ForeArm'), hand = segment('Hand');
    const thigh = segment('UpLeg'), shin = segment('Leg'), foot = segment('Foot');
    const sole = orientation(foot);
    const ankleY = position(foot).y;
    reach(arm, forearm, hand, vector(side * (isMale ? 0.257 : 0.218), isMale ? 0.935 : 0.908, 0.028),
      vector(side * 0.26, -0.27, -0.9));
    const ankle = vector(side * 0.104, ankleY, 0.016 * side - 0.025);
    reach(thigh, shin, foot, ankle, vector(side * 0.08, 0, 1));
    orient(foot, sole);
    const across = segment('HandIndex1').position.clone().sub(segment('HandPinky1').position);
    const along = segment('HandMiddle1').position.clone().normalize();
    const palmBasis = handFrame(along, across).invert();
    return { name, side, arm, forearm, hand, thigh, shin, foot, sole, ankle, palmBasis };
  });
  const idle = new Map();
  for (const bone of joints.values()) {
    idle.set(bone, {
      position: bone.position.clone(),
      quaternion: bone.quaternion.clone(),
      scale: bone.scale.clone()
    });
  }
  const walk = T.AnimationClip.findByName(model.animations, 'walk');
  const channels = walk.tracks.map(track => {
    const split = track.name.lastIndexOf('.');
    const bone = joint(track.name.slice(0, split)), property = track.name.slice(split + 1);
    if (!bone) return null;
    const sample = track.createInterpolant();
    const pose = property === 'quaternion' ? new T.Quaternion() : vector();
    return {bone, property, sample, pose, start: pose.clone().fromArray(sample.evaluate(0))};
  }).filter(Boolean);

  let walking = 0;
  const luggageHand = new T.Object3D();
  luggageHand.name = 'Suitcase grip';
  luggageHand.position.copy(joint('RightHandMiddle1').position).multiplyScalar(0.77);
  joint('RightHand').add(luggageHand);
  const right = vector(1, 0, 0);
  function handFrame(along, across) {
    const y = along.clone().normalize();
    const x = across.clone().projectOnPlane(y).normalize();
    const z = x.clone().cross(y);
    return new T.Quaternion().setFromRotationMatrix(new T.Matrix4().makeBasis(x, y, z));
  }
  const photograph = makePhotograph(T);
  root.add(photograph);
  function update({ dt = 1 / 60, time = 0, speed = 0, phase = 0, sit = 0, photo = 0, pulling = 0 } = {}) {
    refreshFrame();
    const desiredWalk = clamp(speed / 0.65, 0, 1) * (1 - sit);
    walking = mix(walking, desiredWalk, 1 - Math.exp(-Math.max(0, dt) * 15));
    const cycle = ((phase / TAU) % 1 + 1) % 1;
    for (const {bone, property, sample, pose, start} of channels) {
      pose.fromArray(sample.evaluate(cycle * walk.duration));
      const blend = property === 'quaternion' ? 'slerp' : 'lerp';
      if (cycle > 0.955) pose[blend](start, smooth((cycle - 0.955) / 0.045));
      bone[property].copy(idle.get(bone)[property])[blend](pose, walking);
    }
    if (isMale && walking > 0.0001) {
      const hips = joint('Hips');
      const height = position(hips);
      height.y += 0.016 * walking;
      place(hips, height);
    }
    const breath = Math.sin(time * 1.6);
    turn(joint('Spine01'), right, (0.0060 * breath + 0.0030) * (1 - walking));
    photograph.visible = false;
    if (pulling > 0 && sit < 0.001) {
      const arm = sides[1];
      const target = vector(isMale ? -0.272 : -0.223, isMale ? 0.961 : 0.94,
        -0.175 + 0.014 * walking * Math.cos(phase));
      reach(arm.arm, arm.forearm, arm.hand, position(arm.hand).lerp(target, clamp(pulling,0,1)),
        vector(-0.28,-0.30,-0.92));
      for (const finger of ['Index','Middle','Ring','Pinky']) {
        for (const n of [1,2,3]) joint('RightHand' + finger + n).rotateX(-0.43 * pulling);
      }
    }
    if (sit > 0.0001) seatedPose(clamp(sit,0,1), clamp(photo,0,1), breath);
    return root;
  }

  function seatedPose(sit, photo, breath) {
    const hips = joint('Hips');
    const p = position(hips);
    // The garment's lowest seated vertex meets the compressed duvet at 0.49 m.
    p.y -= (isMale ? 0.257 : 0.275) * sit;
    place(hips, p);
    turn(joint('Spine02'), right, sit * (0.075 + 0.24 * (1 - sit)));
    turn(joint('Spine'), right, sit * (0.045 + 0.045 * photo));
    turn(joint('neck'), right, sit * (0.018 + 0.026 * photo));
    turn(joint('Head'), right, sit * (0.04 + 0.22 * photo));
    turn(joint('Head'), vector(0,1,0), -0.09 * sit * photo);
    for (const leg of sides) {
      const ankle = leg.ankle.clone().lerp(vector(leg.side * 0.129, leg.ankle.y, 0.32 + leg.side * 0.022), sit);
      reach(leg.thigh, leg.shin, leg.foot, ankle, vector(leg.side * 0.11, 0, 1));
      orient(leg.foot, leg.sole);
    }
    const contacts = [];
    for (const arm of sides) {
      const sign = arm.side;
      const wrist = vector(sign * mix(0.155, 0.121, photo) - photo * 0.009,
        mix(0.71, 0.879 + breath * 0.0015, photo), mix(0.162, 0.248, photo));
      const goal = position(arm.hand).lerp(wrist, sit);
      reach(arm.arm, arm.forearm, arm.hand, goal, vector(sign * 0.31, -0.61, -0.81));
      // Index and little finger identify the palm axes despite the rig's mirrored bone rolls.
      const along = vector(-sign * mix(0.10,0.29,photo), mix(-0.42,0.90,photo), mix(0.90,0.33,photo));
      const across = vector(-sign, 0, 0).lerp(vector(-sign * 0.36, 0.15, -0.87), photo);
      const desired = handFrame(along, across).multiply(arm.palmBasis);
      const handWorld = orientation(arm.hand);
      const handTarget = handWorld.clone().slerp(desired, sit);
      // Pronation is shared by the forearm and wrist to keep the cuff and palm continuous.
      const delta = handTarget.clone().multiply(handWorld.invert());
      const forearmAxis = position(arm.hand).sub(position(arm.forearm)).normalize();
      const projection = vector(delta.x,delta.y,delta.z).dot(forearmAxis);
      const twist = new T.Quaternion(forearmAxis.x*projection, forearmAxis.y*projection,
        forearmAxis.z*projection, delta.w).normalize();
      const roll = new T.Quaternion().slerp(twist, 0.54);
      orient(arm.forearm, roll.multiply(orientation(arm.forearm)));
      orient(arm.hand, handTarget);
      for (const finger of ['Index', 'Middle', 'Ring', 'Pinky']) {
        for (const section of [1,2,3]) {
          const tip = joint(arm.name + 'Hand' + finger + section);
          const curl = finger === 'Index' ? [0.035,0.26,0.34]
            : [0.34,0.82,0.72];
          tip.rotateX(-sit * mix(0.06, curl[section-1], photo));
        }
      }
      const contact = position(joint(arm.name + 'HandIndex2'));
      contacts.push(contact);
      if (photo > 0) {
        const thumb = [1,2,3].map(n => joint(arm.name + 'HandThumb' + n));
        const nearPaper = contact.clone().add(vector(sign * 0.002, -0.005, -0.007));
        const thumbGoal = position(thumb[2]).lerp(nearPaper, photo);
        reach(...thumb, thumbGoal, vector(-sign*0.2, 0.6, -0.8));
      }
    }
    // The print travels with the hands throughout raising and lowering.
    if (photo > 0.015) {
      photograph.visible = true;
      photograph.position.copy(contacts[0]).lerp(contacts[1], 0.5);
      photograph.position.x = mix(contacts[1].x + 0.071, photograph.position.x, photo);
      photograph.position.y += 0.024;
      photograph.position.z += 0.019;
      photograph.rotation.set(-mix(1.35, 0.47, photo), Math.PI, 0.03, 'YXZ');
    }
  }
  let disposed = false;
  let appearanceVersion = 0, renderedStyle = 0;
  let pendingStyle = Promise.resolve();
  const characters = [];
  model.scene.traverse(node => {
    if (node.isSkinnedMesh) characters.push({mesh:node, sharedGeometry:node.geometry});
  });
  function setAppearance(value) {
    const next = cleanAppearance(value);
    if (next.gender !== profile.gender) return false;
    ['skin','hair','outfit'].forEach((key, channel) => {
      const selected = model.uniforms[key].value;
      if (next[key] === 0) selected.copy(template.anchors[channel]);
      else selected.set(PALETTES[key][next[key]].color);
    });
    const version = ++appearanceVersion;
    pendingStyle = pendingStyle.catch(() => {}).then(async () => {
      if (disposed || version !== appearanceVersion || next.hairstyle === renderedStyle) return;
      await Promise.all(characters.map(({mesh}) => applyHairShape(T, mesh, next.gender, next.hairstyle)));
      renderedStyle = next.hairstyle;
    });
    return pendingStyle;
  }
  function dispose() {
    if (disposed) return;
    disposed = true;
    root.removeFromParent();
    photograph.traverse(node => {
      if (!node.isMesh) return;
      node.geometry.dispose();
      node.material.map?.dispose();
      node.material.dispose();
    });
    model.scene.traverse(node => { if (node.isSkinnedMesh) node.skeleton.dispose(); });
    model.materials.forEach(material => material.dispose());
    pendingStyle.finally(() => {
      for (const {mesh,sharedGeometry} of characters) {
        if (mesh.geometry !== sharedGeometry) mesh.geometry.dispose();
      }
    }).catch(() => {});
  }
  try { await setAppearance(profile); } catch (error) { dispose(); throw error; }
  update();
  return {root, update, luggageHand, setAppearance, dispose, strideLength: 1.45};
}

function makePhotograph(T) {
  // The story prop is an actual two-sided print, with a small warm snapshot facing its owner.
  const print = new T.Group();
  const paper = new T.MeshStandardMaterial({color: '#f1e5c9', roughness: 0.87});
  const backing = new T.Mesh(new T.BoxGeometry(0.155, 0.109, 0.0015), paper);
  backing.castShadow = backing.receiveShadow = true;
  print.add(backing);
  const canvas = document.createElement('canvas');
  canvas.width = 240; canvas.height = 154;
  const pen = canvas.getContext('2d');
  const gradient = pen.createLinearGradient(0,0,190,154);
  gradient.addColorStop(0, '#d6c699');
  gradient.addColorStop(0.47, '#b4bb92');
  gradient.addColorStop(1, '#8f9263');
  pen.fillStyle = gradient; pen.fillRect(0,0,240,154);
  pen.fillStyle = '#bbab85'; pen.fillRect(2,27,104,72);
  pen.fillStyle = '#666d59'; pen.fillRect(14,40,25,35); pen.fillRect(70,40,25,35);
  function circle(x,y,r,colour) {
    pen.beginPath(); pen.fillStyle = colour; pen.arc(x,y,r,0,TAU); pen.fill();
  }
  function figure(x,y,clothes,skin,hair) {
    pen.fillStyle = clothes;
    pen.beginPath(); pen.moveTo(x-34,154); pen.quadraticCurveTo(x-29,y+17,x-7,y+18);
    pen.lineTo(x+9,y+17); pen.quadraticCurveTo(x+26,y+17,x+36,154); pen.fill();
    circle(x,y,19,hair); circle(x,y+4,15,skin);
    pen.fillStyle = hair; pen.beginPath(); pen.ellipse(x-2,y-10,15,6,-0.15,0,TAU); pen.fill();
    circle(x-5,y+2,1.1,'#433731'); circle(x+6,y+2,1.1,'#433731');
    pen.strokeStyle = '#7a4d40'; pen.lineWidth = 1.6;
    pen.beginPath(); pen.arc(x+1,y+7,5,0.24,Math.PI-0.24); pen.stroke();
  }
  figure(72,64,'#a55f41','#b57d5a','#423a31');
  figure(129,78,'#486763','#b48465','#3e3027');
  figure(185,65,'#a79972','#bd8c69','#706557');
  const texture = new T.CanvasTexture(canvas);
  texture.colorSpace = T.SRGBColorSpace;
  const image = new T.Mesh(new T.PlaneGeometry(0.143, 0.092),
    new T.MeshStandardMaterial({map:texture, roughness:0.64}));
  image.position.set(0,0.002,0.0011);
  print.add(image);
  print.visible = false;
  return print;
}
