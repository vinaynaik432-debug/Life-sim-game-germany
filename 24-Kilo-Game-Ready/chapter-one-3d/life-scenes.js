import {createActor} from './actor.js';
import {createRollingBag} from './airport.js';
import {makeLifeProps} from './life-props.js';

export const RESIDENTS = {
  amir: {name: 'Amir', gender: 'male', skin: 0, hair: 1, hairstyle: 1, outfit: 3},
  lena: {name: 'Lena', gender: 'female', skin: 5, hair: 2, hairstyle: 2, outfit: 1},
  newcomer: {name: 'Newcomer', gender: 'female', skin: 2, hair: 1, hairstyle: 0, outfit: 2}
};

export async function addResident(T, parent, profile, {x = 0, z = 0, yaw = 0, sit = 0, name = profile.name} = {}) {
  const actor = await createActor(T, profile);
  actor.root.name = name;
  actor.root.position.set(x, 0, z);
  actor.root.rotation.y = yaw;
  parent.add(actor.root);
  actor.updateIdle = time => actor.update({time, dt: 1 / 30, sit});
  actor.updateIdle(0);
  return actor;
}

function floorTexture(T, kit, kind) {
  let seed = 86;
  const random = () => ((seed = Math.imul(seed, 1664525) + 1013904223 >>> 0) / 4294967296);
  const map = kit.texture(512, 512, (c, w, h) => {
    c.fillStyle = kind === 'wood' ? '#a48d6c' : kind === 'paving' ? '#a6a39a' : '#b7b5aa';
    c.fillRect(0, 0, w, h);
    const tileWidth = kind === 'wood' ? 64 : 128;
    const tileHeight = kind === 'wood' ? 256 : 128;
    for (let x = 0; x < w; x += tileWidth) for (let y = -tileHeight; y < h; y += tileHeight) {
      const yy = y + (x / tileWidth % 2) * tileHeight / 2;
      c.fillStyle = `rgba(43,34,24,${.03 + random() * .08})`;
      c.fillRect(x, yy, tileWidth, tileHeight);
      c.fillStyle = 'rgba(54,52,42,.24)';
      c.fillRect(x, yy, 1, tileHeight);
      c.fillRect(x, yy, tileWidth, 1);
    }
    for (let i = 0; i < 14000; i++) {
      c.fillStyle = random() > .5 ? 'rgba(255,247,223,.10)' : 'rgba(34,33,26,.07)';
      c.fillRect(random() * w, random() * h, kind === 'wood' ? .5 : 1.4, kind === 'wood' ? 12 : 1.4);
    }
  });
  map.wrapS = map.wrapT = T.RepeatWrapping;
  map.repeat.set(6, 4);
  return new T.MeshStandardMaterial({map, roughness: kind === 'wood' ? .64 : .84});
}

function makeSet(T, scene, place) {
  const kit = makeLifeProps(T);
  const root = new T.Group();
  root.name = place;
  scene.add(root);
  const architecture = new T.Group();
  root.add(architecture);
  const set = {
    root, architecture, kit, spots: {}, targets: {}, obstacles: [], actors: [], loads: [],
    walkBounds: {minX: -4.8, maxX: 4.8, minZ: -2.55, maxZ: 2.7},
    spawn: {x: -.5, z: 1.8, yaw: Math.PI},
    camera: {offset: [1.1, 1.75, 5.8], height: 1.0, follow: .86},
    state: null,
    setState(state) { this.state = state; },
    update(time) { for (const actor of this.actors) if (actor.root.visible) actor.updateIdle(time); }
  };
  set.addActor = (profile, pose) => {
    const loading = addResident(T, root, profile, pose).then(actor => {
      set.actors.push(actor);
      return actor;
    });
    set.loads.push(loading);
    return loading;
  };
  set.obstacle = (x, z, width, depth) => set.obstacles.push({
    minX: x - width / 2, maxX: x + width / 2, minZ: z - depth / 2, maxZ: z + depth / 2
  });
  set.spot = (key, x, z, anchor, target, yaw = Math.PI) => {
    set.spots[key] = {x, z, yaw, anchor: {x: anchor[0], y: anchor[1], z: anchor[2]}};
    set.targets[key] = target;
  };
  const floor = kit.mesh(architecture, new T.PlaneGeometry(24, 16),
    floorTexture(T, kit, place === 'office' ? 'wood' : place === 'street' ? 'paving' : 'stone'), 0, -.006, 4.05);
  floor.rotation.x = -Math.PI / 2;
  const wall = kit.material(place === 'civic' ? '#b8c1b5' : '#d5cbb8');
  if (place !== 'platform') {
    kit.box(architecture, 0, 1.8, -2.95, 10.4, 3.6, .18, wall);
    kit.box(architecture, 0, .11, -2.82, 10.4, .22, .05, kit.material('#8c9386'));
  }
  if (place === 'office' || place === 'civic') {
    for (const side of [-1, 1]) {
      const wallFace = kit.mesh(architecture, new T.PlaneGeometry(6.4, 3.6), wall, side * 5.18, 1.8, .17);
      wallFace.rotation.y = -side * Math.PI / 2;
      kit.box(architecture, side * 5.14, .11, .17, .055, .22, 6.4, kit.material('#8c9386'));
    }
    kit.box(architecture, 0, 3.48, -2.78, 10.3, .095, .18, kit.material('#e4dac6'));
  }
  return set;
}

function createStreet(T, scene) {
  const set = makeSet(T, scene, 'street');
  const {root, architecture, kit: p} = set;
  scene.background = new T.Color('#afb8b3');
  const plaster = p.material('#d6c6a7'), green = p.material('#496353'), dark = p.material('#3b4c45');
  const oak = p.material('#ad885d'), linen = p.material('#e9d8b8'), glass = p.material('#71877e', .3, .1);
  p.box(architecture, -2.8, 1.35, -2.81, 3.8, 2.7, .12, green);
  p.box(architecture, -2.8, 1.4, -2.73, 3.46, 2.35, .10, glass);
  p.box(architecture, -2.8, .55, -2.64, 3.48, .98, .10, oak);
  p.sign(architecture, -2.8, 2.67, -2.58, 3.6, .52, 'BÄCKEREI', 'Brot · Brötchen · Kaffee', '#365346');
  for (const x of [-4.56, -2.8, -1.04]) p.box(architecture, x, 1.39, -2.62, .065, 2.38, .14, dark);
  for (const x of [-4.10, -3.2, -2.3, -1.4]) {
    p.box(architecture, x, 1.5, -2.56, .64, .035, .33, oak);
    p.sphere(architecture, x, 1.57, -2.48, .24, .09, .11, p.material('#ba844d'));
  }
  // The counter extends onto the open shop front, leaving room to approach from the pavement.
  const bakery = new T.Group();
  root.add(bakery);
  p.box(bakery, -2.8, .43, -1.78, 2.9, .86, .70, oak);
  p.box(bakery, -2.8, .88, -1.78, 2.98, .07, .77, linen);
  const clear = new T.MeshPhysicalMaterial({color: '#d5e9de', roughness: .15, transparent: true, opacity: .16, depthWrite: false});
  p.box(bakery, -2.8, 1.12, -1.40, 2.9, .44, .018, clear);
  for (const x of [-4.2, -1.4]) p.box(bakery, x, 1.1, -1.4, .027, .44, .033, dark);
  for (let i = 0; i < 7; i++) {
    const bread = p.sphere(bakery, -3.77 + i * .32, .96, -1.76, .13, .075, .085, p.material(i % 2 ? '#ba813d' : '#cfa064'));
    bread.rotation.y = .2;
    p.rod(bakery, [-3.8 + i * .32, 1.025, -1.78], [-3.75 + i * .32, 1.025, -1.72], .005, linen);
  }
  p.sign(bakery, -2.65, .57, -1.417, .81, .27, 'Guten Morgen', '', '#a78058', '#fff0d2');
  p.mug(bakery, -1.61, .92, -1.8, '#73866e');
  p.box(architecture, -2.8, 3.02, -2.05, 3.86, .06, 1.6, green);
  for (let i = 0; i < 10; i++) p.box(architecture, -4.54 + i * .386, 2.97, -1.28, .192, .20, .04, linen);
  p.plant(architecture, -4.57, -1.6, .68);
  set.obstacle(-2.8, -1.79, 2.98, .77);
  set.spot('bakery', -2.8, -.91, [-2.8, 1.31, -1.5], bakery);

  // The chair is where the connection with Amir begins.
  const freeChair = new T.Group();
  root.add(freeChair);
  p.chair(freeChair, -.02, -1.62, -.14, '#9f7351');
  const freeSign = p.sign(freeChair, -.02, .69, -1.355, .42, .22, 'Zu verschenken', '', '#e6dcc4', '#463e33');
  freeSign.rotation.z = -.04;
  p.box(architecture, .0, 1.43, -2.8, 1.18, 2.72, .12, p.material('#7e8b76'));
  for (const y of [.55, 1.14, 1.89]) p.box(architecture, .0, y, -2.72, .88, .48, .05, green);
  p.box(architecture, .37, 1.15, -2.66, .025, .15, .03, p.material('#b5a578', .35, .5));
  set.obstacle(0, -1.62, .62, .60);
  set.spot('chair', -.02, -.79, [0, 1.05, -1.6], freeChair);

  const groceries = new T.Group();
  root.add(groceries);
  p.box(architecture, 3.05, 1.4, -2.8, 3.36, 2.72, .10, p.material('#9d5b47'));
  p.box(architecture, 3.05, 1.35, -2.69, 3.03, 2.34, .06, p.material('#607b70', .36));
  p.sign(architecture, 3.05, 2.73, -2.59, 3.22, .5, 'OBST & GEMÜSE', 'Frisch aus der Nachbarschaft', '#8c513c');
  for (const y of [1.0, 1.51, 2.02]) {
    p.box(architecture, 3.05, y, -2.53, 2.92, .045, .30, oak);
    for (let jar = 0; jar < 8; jar++) {
      const x = 1.83 + jar * .34;
      p.cylinder(architecture, x, y + .13, -2.52, .068, .22,
        p.material(jar % 3 === 0 ? '#a58555' : jar % 3 === 1 ? '#c9b88a' : '#79906c'));
      p.cylinder(architecture, x, y + .245, -2.52, .07, .024, linen);
      p.box(architecture, x, y + .13, -2.449, .094, .07, .005, linen);
    }
  }
  for (let crate = 0; crate < 3; crate++) {
    const x = 2.14 + crate * .73;
    p.box(groceries, x, .31, -1.75, .68, .60, .62, oak);
    p.box(groceries, x, .62, -1.75, .64, .035, .58, dark);
    for (let row = 0; row < 3; row++) {
      p.box(groceries, x, .17 + row * .17, -1.426, .65, .10, .028, p.material('#b79661'));
    }
    for (let fruit = 0; fruit < 9; fruit++) {
      p.sphere(groceries, x + ((fruit % 3) - 1) * .16, .69, -1.75 + (Math.floor(fruit / 3) - 1) * .14,
        .067, .064, .064, p.material(['#b3533e', '#cbb14e', '#83a063'][crate]));
    }
  }
  p.sign(groceries, 2.87, .39, -1.407, .54, .20, 'Heute frisch', '', '#344c3d');
  set.obstacle(2.87, -1.76, 2.18, .64);
  set.spot('groceries', 2.88, -.91, [2.88, 1.05, -1.6], groceries);
  p.plant(architecture, 4.51, -1.71, .84);
  // Upper storeys give this compact play space the depth of a neighbourhood street.
  p.box(architecture, 0, 4.25, -3.02, 10.4, 1.35, .22, plaster);
  for (const x of [-3.8, -1.8, 1.0, 3.5]) p.windowFrame(architecture, x, 4.16, -2.87, 1.0, 1.05);
  p.box(architecture, 0, 3.45, -2.81, 10.45, .13, .24, linen);
  for (const z of [.73, 1.5]) {
    p.cylinder(architecture, -4.61, .39, z, .052, .78, dark);
    p.sphere(architecture, -4.61, .81, z, .062, .045, .062, dark);
  }
  p.box(architecture, 0, -.08, 3.1, 11.4, .12, .30, p.material('#c1bcb0'));
  const shopGlow = new T.PointLight('#ffd5a0', 3.0, 5);
  shopGlow.position.set(-2.8, 2.45, -1.7);
  root.add(shopGlow);
  let amir;
  set.addActor(RESIDENTS.amir, {x: .92, z: -1.5, yaw: -.65}).then(actor => {
    amir = actor;
    amir.root.visible = (set.state?.chapter || 2) === 2;
  });
  set.addActor({name: 'Baker', gender: 'female', skin: 4, hair: 4, hairstyle: 1, outfit: 3}, {x: -3.1, z: -2.37, yaw: .3});
  set.setState = state => {
    set.state = state;
    const early = state.chapter === 2;
    freeChair.visible = early;
    if (amir) amir.root.visible = early;
  };
  p.batch(architecture);
  p.batch(bakery);
  p.batch(freeChair);
  p.batch(groceries);
  return set;
}

function createCivic(T, scene) {
  const set = makeSet(T, scene, 'civic');
  const {root, architecture, kit: p} = set;
  scene.background = new T.Color('#9ea99f');
  const oak = p.material('#a9926e'), grey = p.material('#596762'), cream = p.material('#e8e1d1');
  p.sign(architecture, -2.85, 2.66, -2.82, 3.1, .47, 'BÜRGERAMT', 'Anmeldung · Waiting area', '#6a8076');
  const number = p.sign(architecture, .5, 2.6, -2.79, 1.35, .54, '128', 'Zimmer 3', '#263b36', '#e6bb76');
  p.box(architecture, .5, 2.6, -2.83, 1.43, .62, .11, grey);
  number.position.z = -2.76;
  for (const x of [-3.4, -2.8, -2.2]) {
    p.chair(architecture, x, -2.19, 0, '#697d75');
  }
  set.obstacle(-2.8, -2.2, 1.76, .60);
  const documents = new T.Group();
  root.add(documents);
  p.table(documents, -2.8, -1.18, 1.66, .61, '#b09b78');
  const page = p.box(documents, -2.8, .802, -1.18, .33, .012, .44, cream);
  const form = p.sign(documents, -2.8, .810, -1.18, .31, .42, 'ANMELDUNG', 'Name · Anschrift', '#ede6d5', '#5d655a');
  form.rotation.x = -Math.PI / 2;
  p.box(documents, -3.2, .813, -1.1, .17, .028, .23, p.material('#7a3940'));
  p.box(documents, -2.39, .817, -1.17, .25, .025, .34, p.material('#b8c3ac'));
  set.obstacle(-2.8, -1.18, 1.66, .61);
  set.spot('documents', -2.8, -.40, [-2.8, 1.05, -1.2], documents);
  const clerk = new T.Group();
  root.add(clerk);
  p.table(clerk, 2.0, -1.58, 2.35, .84, '#b4a283');
  p.box(clerk, 2.67, 1.10, -1.76, .63, .39, .05, grey);
  p.box(clerk, 2.67, .91, -1.76, .06, .22, .06, grey);
  p.box(clerk, 2.67, .80, -1.76, .30, .023, .22, grey);
  p.box(clerk, 2.65, .81, -1.37, .48, .019, .13, p.material('#c0c7bc'));
  p.box(clerk, 1.42, .81, -1.41, .32, .015, .43, cream);
  p.rod(clerk, [1.67, .825, -1.5], [1.69, .825, -1.29], .005, grey);
  p.sign(clerk, 1.23, .92, -1.13, .42, .21, '3', '', '#607b6b');
  p.chair(architecture, 2.0, -2.38, 0, '#52665d');
  set.obstacle(2, -1.57, 2.35, .86);
  set.obstacle(2, -2.4, .6, .5);
  set.spot('clerk', 1.5, -.59, [1.65, 1.30, -1.45], clerk);
  p.windowFrame(architecture, 3.88, 1.99, -2.81, 1.12, 1.57);
  p.plant(architecture, 4.2, -2.19, .93);
  p.box(architecture, .28, .52, -2.52, .94, 1.04, .60, p.material('#8c9b8b'));
  for (const y of [.24, .57, .87]) {
    p.box(architecture, .28, y, -2.208, .87, .29, .025, p.material('#aab2a0'));
    p.box(architecture, .28, y + .07, -2.181, .16, .021, .02, grey);
    p.box(architecture, .28, y -.015, -2.178, .12, .055, .01, cream);
  }
  set.obstacle(.28, -2.52, .94, .6);
  const clockFace = p.texture(256, 256, (c,w,h) => {
    c.fillStyle = '#e9e2d2';c.fillRect(0,0,w,h);
    c.strokeStyle = '#53655c';c.lineWidth = 6;c.beginPath();c.arc(128,128,116,0,Math.PI*2);c.stroke();
    for(let n=0;n<12;n++){const a=n*Math.PI/6;c.beginPath();c.moveTo(128+Math.sin(a)*98,128-Math.cos(a)*98);c.lineTo(128+Math.sin(a)*108,128-Math.cos(a)*108);c.stroke();}
    c.lineWidth=8;c.beginPath();c.moveTo(128,128);c.lineTo(76,107);c.moveTo(128,128);c.lineTo(144,42);c.stroke();
  });
  p.panel(architecture, -4.35, 2.56, -2.79, .42, .42, clockFace);
  const coffee = new T.Group();
  root.add(coffee);
  p.table(coffee, -4.13, .64, .79, .64, '#a38c6b');
  p.box(coffee, -4.2, 1.04, .59, .36, .46, .34, grey);
  p.box(coffee, -4.2, 1.14, .777, .25, .20, .012, p.material('#2c3c36'));
  p.box(coffee, -4.2, 1.04, .80, .10, .035, .07, p.material('#b5b9ab', .35, .5));
  p.mug(coffee, -4.14, .805, .89);
  p.mug(coffee, -3.9, .805, .89, '#a7b5a4');
  set.obstacle(-4.13, .64, .8, .68);
  set.spot('coffee', -3.31, .70, [-4.1, 1.24, .65], coffee, -Math.PI / 2);
  p.sign(architecture, -.5, 1.45, -2.80, .70, .92, 'Bitte warten', 'Wir rufen Sie auf.', '#e4e0d1', '#52655a');
  set.addActor(RESIDENTS.amir, {x: -.95, z: -1.6, yaw: -.55});
  set.addActor({name: 'Clerk', gender: 'female', skin: 5, hair: 4, hairstyle: 1, outfit: 2}, {x: 2, z: -2.37, sit: 1});
  set.obstacle(-.95, -1.6, .40, .40);
  p.batch(architecture);
  p.batch(documents);
  p.batch(clerk);
  p.batch(coffee);
  return set;
}

function createOffice(T, scene) {
  const set = makeSet(T, scene, 'office');
  const {root, architecture, kit: p} = set;
  scene.background = new T.Color('#bac2b4');
  const graphite = p.material('#49544e'), white = p.material('#e5ddc9'), sage = p.material('#84937a');
  for (const x of [-3.6, .4, 3.5]) p.windowFrame(architecture, x, 2.05, -2.81, 1.44, 1.71);
  p.box(architecture, -1.4, 1.8, -2.8, 1.32, 1.11, .08, p.material('#aa8761'));
  for (let i = 0; i < 5; i++) {
    const note = p.box(architecture, -1.85 + (i % 3) * .43, 1.62 + Math.floor(i / 3) * .38, -2.749,
      .32, .28, .007, p.material(i % 2 ? '#c4c9ad' : '#e1d4af'));
    note.rotation.z = (i % 3 - 1) * .04;
  }
  const desk = new T.Group();
  root.add(desk);
  p.table(desk, -2.31, -1.35, 2.64, 1.0, '#ac9872');
  p.box(desk, -2.34, 1.115, -1.55, .83, .48, .055, graphite);
  p.sign(desk, -2.34, 1.12, -1.514, .78, .435, 'Guten Morgen', 'Your second week', '#aabcb5', '#3d5350');
  p.box(desk, -2.34, .912, -1.55, .07, .25, .07, graphite);
  p.box(desk, -2.34, .81, -1.55, .34, .025, .23, graphite);
  p.box(desk, -2.31, .807, -.995, .57, .019, .17, white);
  p.box(desk, -1.89, .812, -1.01, .065, .032, .10, white);
  p.mug(desk, -3.32, .797, -1.33, '#af7655');
  const note = p.sign(desk, -1.57, .809, -1.02, .28, .22, 'Welcome!', '— Lena', '#e5d598', '#514c35');
  note.rotation.x = -Math.PI / 2;
  p.chair(architecture, -2.31, -.40, Math.PI, '#7e8873');
  set.obstacle(-2.31, -1.35, 2.64, 1.0);
  set.obstacle(-2.31, -.40, .56, .58);
  set.spot('desk', -1.40, -.38, [-2.31, 1.30, -1.35], desk, -2.4);

  const lunch = new T.Group();
  root.add(lunch);
  p.table(lunch, 2.46, -1.25, 1.72, 1.05, '#b2936b');
  p.chair(architecture, 2.18, -2.09, 0, '#9a7655');
  p.chair(architecture, 3.55, -1.25, -Math.PI / 2, '#9a7655');
  p.chair(architecture, 2.18, -.33, Math.PI, '#9a7655');
  for (const [x, z] of [[2.18, -1.53], [2.91, -1.25]]) {
    p.cylinder(lunch, x, .8, z, .155, .014, white);
    p.sphere(lunch, x, .833, z, .092, .026, .073, p.material('#c99b56'));
    p.mug(lunch, x + .22, .798, z - .1, '#a5b28e');
  }
  p.plant(lunch, 2.3, -1.03, .22, .79);
  set.obstacle(2.46, -1.25, 1.72, 1.05);
  set.obstacle(2.18, -2.09, .58, .56);
  set.obstacle(3.55, -1.25, .58, .56);
  set.obstacle(2.18, -.33, .58, .56);
  set.spot('lunch', 3.08, -.25, [2.65, 1.21, -1.25], lunch, -2.65);
  p.plant(architecture, 1.15, -2.24, .78);
  p.plant(architecture, 4.26, -2.17, .83);
  p.box(architecture, -4.3, .54, .29, .66, 1.08, 1.23, sage);
  p.box(architecture, -4.3, 1.09, .29, .71, .04, 1.27, white);
  p.box(architecture, -4.3, 1.32, .15, .38, .43, .46, graphite);
  p.mug(architecture, -4.3, 1.11, .67, '#c8a37c');
  set.obstacle(-4.3, .29, .71, 1.27);
  // Low filing shelf and well-used books fill the space between work and lunch.
  p.box(architecture, .38, .51, -2.38, 1.23, 1.02, .50, p.material('#aa8761'));
  for (const shelf of [.10, .49, .92]) p.box(architecture, .38, shelf, -2.07, 1.13, .045, .14, white);
  for (let book=0;book<9;book++) {
    const x=-.1+book*.12;
    p.box(architecture,x,.69,-2.11,.077,.34-(book%3)*.04,.22,p.material(['#747e6a','#b4a085','#a26b51'][book%3]));
    p.box(architecture,x,.60,-1.994,.054,.025,.006,white);
  }
  set.obstacle(.38, -2.38, 1.23, .50);
  set.obstacle(1.15, -2.24, .38, .38);
  const pendant = p.cylinder(architecture, 2.46, 2.78, -1.25, .36, .22, sage, .12);
  p.rod(architecture, [2.46, 2.89, -1.25], [2.46, 3.8, -1.25], .012, graphite);
  const light = new T.PointLight('#ffe0b1', 2.1, 4.5);
  light.position.set(2.46, 2.6, -1.25);
  root.add(light);
  set.addActor(RESIDENTS.lena, {x: 3.55, z: -1.25, yaw: -Math.PI / 2, sit: 1});
  set.addActor({name: 'Colleague', gender: 'male', skin: 4, hair: 2, hairstyle: 2, outfit: 2}, {x: 2.18, z: -2.09, sit: 1});
  p.batch(architecture);
  p.batch(desk);
  p.batch(lunch);
  return set;
}

function createPlatform(T, scene) {
  const set = makeSet(T, scene, 'platform');
  const {root, architecture, kit: p} = set;
  const iron = p.material('#4b6060', .58, .22), dark = p.material('#283c42'), cream = p.material('#dfd4b6');
  const timber = p.material('#a28058'), yellow = p.material('#d3a23d', .5, .08);
  scene.background = new T.Color('#6d818a');
  set.camera = {offset: [1.0, 1.65, 5.8], height: 1.0, follow: .86};
  p.box(architecture, 0, -.10, -3.09, 13.6, .20, .37, p.material('#b8b8ae'));
  p.box(architecture, 0, -.32, -4.7, 16, .28, 2.8, p.material('#566360'));
  for (const z of [-3.94, -5.1]) p.box(architecture, 0, -.14, z, 17, .11, .08, iron);
  for (let x = -8; x < 8; x += .52) p.box(architecture, x, -.24, -4.52, .18, .12, 1.92, timber);
  // Brick blocks across the tracks remain visible after a passing train has gone.
  for (let block = 0; block < 7; block++) {
    const x = -9 + block * 3.1;
    const height = 3.6 + (block % 3) * .6;
    p.box(architecture, x, height / 2, -8.6, 2.9, height, 1.4, p.material(block % 2 ? '#8c8d7c' : '#9c9582'));
    p.box(architecture, x, height, -8.6, 3.04, .12, 1.55, iron);
    for (let row = 0; row < 3; row++) for (let col = 0; col < 3; col++) {
      p.box(architecture, x + (col - 1) * .79, .82 + row * 1.05, -7.89, .40, .65, .025,
        p.material(row === 1 && col === block % 3 ? '#c9b887' : '#647b7a'));
    }
  }
  p.box(architecture, 0, .008, -2.57, 10.9, .014, .065, yellow);
  for (let x = -5.3; x < 5.4; x += .22) {
    p.box(architecture, x, .013, -2.81, .11, .024, .18, cream);
  }
  for (const x of [-4.8, -.5, 4.6]) {
    p.box(architecture, x, 1.75, -2.75, .115, 3.5, .13, iron);
    p.box(architecture, x, .18, -2.75, .25, .36, .27, iron);
  }
  p.box(architecture, 0, 3.36, -1.45, 11.8, .11, 3.35, iron);
  p.box(architecture, 0, 3.28, -1.45, 11.5, .045, 3.16, cream);
  const glow = new T.MeshBasicMaterial({color: '#e4e9db'});
  for (const x of [-3.2, .1, 3.2]) p.box(architecture, x, 3.235, -1.15, 1.32, .035, .14, glow);
  const shelterGlass = new T.MeshPhysicalMaterial({color: '#a0b5b8', transparent: true, opacity: .15, depthWrite: false, roughness: .25});
  p.box(architecture, -2.45, 1.4, -2.35, 2.60, 2.3, .025, shelterGlass);
  for (const x of [-3.78, -1.12]) p.box(architecture, x, 1.4, -2.36, .045, 2.4, .06, iron);
  const bench = new T.Group();
  root.add(bench);
  for (let slat = 0; slat < 5; slat++) p.box(bench, -2.45, .48, -1.89 + slat * .09, 2.39, .05, .067, timber);
  for (let slat = 0; slat < 3; slat++) p.box(bench, -2.45, .66 + slat * .11, -1.99, 2.39, .078, .045, timber);
  for (const x of [-3.36, -1.55]) {
    p.box(bench, x, .23, -1.73, .07, .46, .40, iron);
    p.rod(bench, [x, .49, -1.99], [x, .91, -1.99], .026, iron);
  }
  set.obstacle(-2.45, -1.75, 2.43, .62);
  set.spot('bench', -2.45, -.81, [-2.45, 1.04, -1.74], bench);
  set.seat = {x: -2.45, z: -1.72, yaw: 0};
  const machine = new T.Group();
  root.add(machine);
  machine.position.set(.98, 0, -1.97);
  p.box(machine, 0, .92, 0, .70, 1.84, .47, yellow);
  p.box(machine, 0, .08, 0, .78, .16, .57, iron);
  p.box(machine, 0, 1.22, .245, .51, .40, .045, dark);
  p.sign(machine, 0, 1.23, .272, .46, .34, 'Fahrkarten', 'Deutsch  |  English', '#477377');
  p.sign(machine, 0, 1.66, .246, .55, .15, 'Tickets', '', '#d3a23d', '#3d4e45');
  p.box(machine, -.10, .83, .259, .29, .022, .025, dark);
  p.box(machine, .20, .91, .26, .07, .13, .027, iron);
  p.box(machine, 0, .45, .26, .42, .15, .025, dark);
  set.obstacle(.98, -1.97, .78, .57);
  set.spot('machine', .98, -.99, [.98, 1.90, -1.97], machine);
  const sign = new T.Group();
  root.add(sign);
  p.box(sign, 3.15, 2.45, -2.59, 2.51, .75, .15, dark);
  p.sign(sign, 3.15, 2.45, -2.50, 2.43, .68, 'Berlin Hauptbahnhof', 'Gleis 2     5 min', '#20343d', '#f4d993');
  p.sign(architecture, -2.4, 2.44, -2.29, 2.44, .39, 'BERLIN', 'S-Bahn · Richtung Innenstadt', '#294a54');
  set.spot('sign', 3.12, -1.17, [3.15, 2.8, -2.50], sign);
  const exit = new T.Group();
  root.add(exit);
  p.box(exit, 4.49, 1.1, .48, .08, 2.20, 1.09, iron);
  p.sign(exit, 4.25, 1.85, .12, .90, .31, 'Ausgang →', '', '#31584e');
  set.obstacle(4.49, .48, .10, 1.12);
  set.spot('exit', 3.90, .85, [4.2, 1.9, .4], exit, Math.PI / 2);
  // Moving windows beyond the platform give the scene a quiet sense of time passing.
  const passingTrain = new T.Group();
  root.add(passingTrain);
  p.box(passingTrain, 0, 1.14, -4.65, 14, 2.45, 1.55, p.material('#bfc4b8'));
  p.box(passingTrain, 0, .51, -3.86, 14, .53, .05, p.material('#a75746'));
  p.box(passingTrain, 0, 2.15, -3.86, 14, .22, .05, p.material('#c2a866'));
  for (let x = -6.2; x < 6.5; x += 1.5) {
    p.box(passingTrain, x, 1.47, -3.84, 1.05, .77, .05, p.material('#54717b', .32));
    p.box(passingTrain, x, 1.46, -3.807, .034, .76, .01, cream);
  }
  p.batch(passingTrain);
  let newcomer;
  const caseAtMachine = createRollingBag(T);
  caseAtMachine.name = 'Newcomer’s suitcase with a coral ribbon';
  caseAtMachine.traverse(object => {
    if (object.isMesh && object.material.color?.getHexString() === 'eab63e') {
      object.material = object.material.clone();
      object.material.color.set('#c67a68');
    }
  });
  caseAtMachine.position.set(2.27, 0, -1.08);
  caseAtMachine.rotation.y = -.24;
  root.add(caseAtMachine);
  set.addActor(RESIDENTS.newcomer, {x: 1.91, z: -1.17, yaw: -2.15}).then(actor => {
    newcomer = actor;
    newcomer.root.visible = set.state?.chapter === 7;
  });
  set.setState = state => {
    set.state = state;
    const helping = state.chapter === 7;
    caseAtMachine.visible = helping;
    if (newcomer) newcomer.root.visible = helping;
    scene.background.set(helping ? '#9faeac' : '#657b87');
  };
  const updateActors = set.update.bind(set);
  set.update = time => {
    updateActors(time);
    const cycle = time % 44;
    passingTrain.visible = cycle < 19;
    passingTrain.position.x = 17 - cycle * 1.85;
  };
  p.batch(architecture);
  p.batch(bench);
  p.batch(machine);
  p.batch(sign);
  p.batch(exit);
  return set;
}

export function createLifeScene(T, scene, place) {
  const builders = {street: createStreet, civic: createCivic, office: createOffice, platform: createPlatform};
  const build = builders[place];
  if (!build) throw new Error(`Unknown place: ${place}`);
  const set = build(T, scene);
  set.ready = Promise.all(set.loads);
  set.dispose = () => {
    for (const actor of set.actors) actor.dispose();
    set.root.removeFromParent();
  };
  return set;
}
