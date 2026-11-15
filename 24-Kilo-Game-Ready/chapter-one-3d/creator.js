import * as THREE from 'three';
import {createActor} from './actor.js';
import {cleanAppearance, PALETTES} from './appearance.js';

const hairstyleNames = {female:['Waves','Tucked','Fuller'], male:['Quiff','Brushed back','Fuller']};

export function showCreator(container, initial = {}, {onStart, onCancel} = {}) {
  const profile = cleanAppearance(initial);
  const previousFocus = document.activeElement;
  const wrapper = document.createElement('section');
  wrapper.className = 'traveller-creator';
  wrapper.setAttribute('aria-label', 'Create your character');
  wrapper.setAttribute('role', 'dialog');
  wrapper.setAttribute('aria-modal', 'true');
  wrapper.tabIndex = -1;
  wrapper.innerHTML = `
    <div class="traveller-shell">
      <div class="traveller-portrait">
        <canvas aria-label="Three-dimensional preview of your character"></canvas>
        <div class="traveller-preview-status" role="status">Loading character…</div>
        <div class="traveller-rotate" role="group" aria-label="Rotate preview">
          <button type="button" aria-label="Turn left">↶</button>
          <span>Rotate</span>
          <button type="button" aria-label="Turn right">↷</button>
        </div>
      </div>
      <div class="traveller-controls">
        <form class="traveller-form">
          <h1>Your character</h1>
          <label class="traveller-label" for="traveller-name">Name</label>
          <input id="traveller-name" name="name" type="text" maxlength="20" autocomplete="off" spellcheck="false">
          <div class="traveller-options"></div>
          <div class="traveller-actions">
            <button class="traveller-begin" type="submit" disabled>Begin your journey <span aria-hidden="true">→</span></button>
            <button class="traveller-back" type="button">Back</button>
          </div>
        </form>
      </div>
    </div>`;
  container.append(wrapper);
  const abort = new AbortController();
  const eventOptions = {signal:abort.signal};
  const form = wrapper.querySelector('form');
  const fields = wrapper.querySelector('.traveller-options');
  const status = wrapper.querySelector('[role="status"]');
  const begin = wrapper.querySelector('.traveller-begin');
  const input = wrapper.querySelector('input[name="name"]');
  const canvas = wrapper.querySelector('canvas');
  let disposed = false, version = 0, selection = 0, accepted = false;
  let stage = null, actor = null, ready = false;
  input.value = profile.name;
  wrapper.focus({preventScroll:true});
  const setName = () => { profile.name = cleanAppearance({name:input.value}).name; };
  input.addEventListener('input', setName, eventOptions);

  function group(key, title, options) {
    const fieldset = document.createElement('fieldset');
    const legend = document.createElement('legend');
    legend.textContent = title;
    fieldset.append(legend);
    const choices = document.createElement('div');
    choices.className = 'traveller-choices traveller-choices-' + key;
    fieldset.append(choices);
    for (const {name, value, color} of options) {
      const label = document.createElement('label');
      label.className = color ? 'traveller-choice traveller-swatch' : 'traveller-choice';
      label.title = name;
      const radio = document.createElement('input');
      radio.type = 'radio'; radio.name = key; radio.value = String(value);
      radio.setAttribute('aria-label', name);
      radio.checked = profile[key] === value;
      const chip = document.createElement('span');
      chip.className = 'traveller-chip';
      if (color) chip.style.setProperty('--chip', color);
      else chip.textContent = name;
      label.append(radio,chip);
      if (color && key === 'outfit') {
        const text = document.createElement('span'); text.textContent = name; label.append(text);
      }
      radio.addEventListener('change', () => {
        if (!radio.checked) return;
        profile[key] = value;
        if (key === 'gender') {
          refreshHairLabels();
          loadCharacter();
        } else updateProfile();
      }, eventOptions);
      choices.append(label);
    }
    fields.append(fieldset);
  }
  function choiceData(key) { return PALETTES[key].map((choice, value) => ({...choice, value})); }
  group('gender','Appearance',[{name:'Female',value:'female'},{name:'Male',value:'male'}]);
  group('skin','Skin tone', choiceData('skin'));
  group('hair','Hair colour', choiceData('hair'));
  group('hairstyle','Hairstyle', choiceData('hairstyle'));
  group('outfit','Jacket colour', choiceData('outfit'));
  function refreshHairLabels() {
    const labels = fields.querySelectorAll('.traveller-choices-hairstyle label');
    labels.forEach((label,i) => {
      const name = hairstyleNames[profile.gender][i];
      label.title = name;
      label.querySelector('input').setAttribute('aria-label',name);
      label.querySelector('.traveller-chip').textContent = name;
    });
  }
  refreshHairLabels();

  function reportError(error) {
    ready = false; begin.disabled = true;
    console.error(error);
    const retry = document.createElement('button');
    retry.type = 'button'; retry.className = 'traveller-retry'; retry.textContent = 'Try again';
    retry.addEventListener('click', loadCharacter, {once:true, signal:abort.signal});
    status.replaceChildren(document.createTextNode('The character preview could not load. '),retry);
    status.hidden = false;
  }
  async function updateProfile() {
    const token = ++selection;
    if (!actor || !ready) return;
    try { await actor.setAppearance({...profile}); }
    catch (error) { if (!disposed && token === selection) reportError(error); }
  }
  async function loadCharacter() {
    const token = ++version;
    selection++; ready = false; begin.disabled = true;
    status.textContent = 'Loading character…'; status.hidden = false;
    try {
      if (!stage) stage = portraitStage(canvas);
      const next = await createActor(THREE, {...profile});
      if (disposed || token !== version) { next.dispose(); return; }
      actor?.dispose();
      actor = next;
      stage.setActor(next);
      // A colour may have been selected while the model was loading.
      await next.setAppearance({...profile});
      if (disposed || token !== version) return;
      ready = true; status.hidden = true; begin.disabled = false;
      await updateProfile();
    } catch (error) {
      if (!disposed && token === version) reportError(error);
    }
  }
  form.addEventListener('submit', event => {
    event.preventDefault();
    if (accepted || !ready || disposed) return;
    accepted = true; begin.disabled = true; setName();
    onStart?.(cleanAppearance(profile));
  }, eventOptions);
  const back = wrapper.querySelector('.traveller-back');
  back.hidden = !onCancel;
  back.addEventListener('click', () => onCancel?.(), eventOptions);
  wrapper.addEventListener('keydown', event => {
    if (event.key === 'Escape' && onCancel) { event.preventDefault(); onCancel(); return; }
    if (event.key !== 'Tab') return;
    const eligible = [...wrapper.querySelectorAll('button:not(:disabled),input[type="text"],input[type="radio"]:checked')]
      .filter(element => !element.hidden);
    const first = eligible[0], last = eligible[eligible.length-1];
    if (event.shiftKey && (document.activeElement === first || document.activeElement === wrapper)) {
      event.preventDefault(); last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault(); first?.focus();
    }
  }, eventOptions);
  wrapper.querySelector('[aria-label="Turn left"]').addEventListener('click',()=>stage?.turn(-Math.PI/5),eventOptions);
  wrapper.querySelector('[aria-label="Turn right"]').addEventListener('click',()=>stage?.turn(Math.PI/5),eventOptions);
  let drag = null;
  canvas.addEventListener('pointerdown', event => {
    drag = {id:event.pointerId,x:event.clientX}; canvas.setPointerCapture(event.pointerId);
  },eventOptions);
  canvas.addEventListener('pointermove', event => {
    if (!drag || drag.id !== event.pointerId) return;
    stage?.turn((event.clientX-drag.x)*0.013); drag.x = event.clientX;
  },eventOptions);
  for (const type of ['pointerup','pointercancel','lostpointercapture']) {
    canvas.addEventListener(type,()=>{drag=null;},eventOptions);
  }
  loadCharacter();
  return () => {
    if (disposed) return;
    disposed = true; version++; selection++;
    abort.abort();
    actor?.dispose();
    stage?.dispose();
    wrapper.remove();
    if (previousFocus?.isConnected) previousFocus.focus({preventScroll:true});
  };
}

function portraitStage(canvas) {
  const renderer = new THREE.WebGLRenderer({canvas, antialias:true, alpha:false, powerPreference:'low-power'});
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.6));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#9ba9a5');
  const camera = new THREE.PerspectiveCamera(37,1,.05,20);
  camera.position.set(.45,1.28,3.07); camera.lookAt(0,.88,0);
  const fill = new THREE.HemisphereLight(0xf2f1df,0xb2a18a,2.0);
  scene.add(fill);
  const key = new THREE.DirectionalLight(0xffe1b4,2.45);
  key.position.set(-2.0,3.75,2.7); key.target.position.set(0,.75,0);
  key.castShadow = true; key.shadow.mapSize.set(512,512);
  Object.assign(key.shadow.camera,{left:-2.2,right:2.2,top:2.2,bottom:-2.2,near:.1,far:9});
  key.shadow.bias=-.0004; key.shadow.normalBias=.015;
  scene.add(key,key.target);
  const rim = new THREE.DirectionalLight(0xc4dae5,1.2); rim.position.set(1.3,2,-2);
  scene.add(rim);
  const set = new THREE.Group();
  scene.add(set);
  const materials = [], geometries = [];
  const surface = color => {
    const m = new THREE.MeshStandardMaterial({color, roughness:.88});
    materials.push(m); return m;
  };
  function box(x,y,z,w,h,d,material,shadow=false) {
    const g=new THREE.BoxGeometry(w,h,d); geometries.push(g);
    const mesh=new THREE.Mesh(g,material);
    mesh.position.set(x,y,z); mesh.receiveShadow=true; mesh.castShadow=shadow; set.add(mesh);
    return mesh;
  }
  const stone=surface('#b8b3a5'), window=surface('#a9c1bf'), metal=surface('#576661');
  box(0,-.045,0,8,.08,7,stone);
  box(0,2.1,-1.45,8,4.3,.05,window);
  for (const x of [-2.75,-1.25,.25,1.75,3.25]) box(x,2.1,-1.41,.044,4.3,.067,metal);
  box(0,.72,-1.41,8,.038,.072,metal);
  box(0,.05,-1.39,8,.10,.07,metal);
  const mullion = surface('#cbd7ca');
  box(0,2.43,-1.41,8,.024,.04,mullion);
  let actor = null, yaw = .10, displayed = .10, clock = 0, then = 0, frame;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  function resize() {
    const width = canvas.clientWidth, height = canvas.clientHeight;
    if (!width || !height) return;
    renderer.setSize(width,height,false); camera.aspect=width/height;
    camera.updateProjectionMatrix();
  }
  const resizeObserver = new ResizeObserver(resize); resizeObserver.observe(canvas);
  resize();
  function render(now) {
    const dt = then ? Math.min((now-then)/1000,.05) : 0; then=now; clock+=dt;
    if (!document.hidden) {
      displayed += (yaw-displayed)*(reduced?1:1-Math.exp(-dt*16));
      if (actor) {
        actor.root.rotation.y=displayed;
        actor.update({dt,time:reduced?0:clock});
      }
      renderer.render(scene,camera);
    }
    frame=requestAnimationFrame(render);
  }
  frame=requestAnimationFrame(render);
  return {
    turn(amount) { yaw+=amount; },
    setActor(next) { actor=next; scene.add(next.root); },
    dispose() {
      cancelAnimationFrame(frame); resizeObserver.disconnect(); renderer.setAnimationLoop(null);
      materials.forEach(m=>m.dispose()); geometries.forEach(g=>g.dispose());
      key.shadow.map?.dispose(); renderer.dispose(); renderer.forceContextLoss();
    }
  };
}
