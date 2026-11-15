import * as THREE from 'three';
import {createApartment} from './apartment.js';
import {createRollingBag} from './airport.js';
import {addResident, RESIDENTS} from './life-scenes.js';

function material(color, roughness = .76) {
  return new THREE.MeshStandardMaterial({color, roughness});
}

function box(parent, size, position, surface) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), surface);
  mesh.position.set(...position);
  mesh.castShadow = mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function cylinder(parent, radius, height, position, surface) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, height, 24), surface);
  mesh.position.set(...position);
  mesh.castShadow = mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function woodenChair(parent, wood) {
  const chair = new THREE.Group();
  parent.add(chair);
  box(chair, [.45, .055, .44], [0, .46, 0], wood);
  for (const x of [-.18, .18]) {
    for (const z of [-.17, .17]) {
      box(chair, [.037, .44, .037], [x, .22, z], wood);
    }
    box(chair, [.037, .42, .037], [x, .69, .19], wood);
  }
  box(chair, [.43, .15, .036], [0, .84, .19], wood);
  for (const x of [-.09, 0, .09]) box(chair, [.018, .22, .018], [x, .67, .19], wood);
  const cushion = box(chair, [.40, .035, .38], [0, .498, 0], material('#a36b50'));
  cushion.rotation.z = .015;
  return chair;
}

function nameCard(parent) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 160;
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const card = new THREE.Mesh(new THREE.PlaneGeometry(.35, .11), material('#efe9dc'));
  card.material.map = texture;
  card.position.set(3.345, 1.30, 1.75);
  card.rotation.y = -Math.PI / 2;
  parent.add(card);
  let lastName;
  return {
    card,
    write(name) {
      if (name === lastName) return;
      lastName = name;
      const pen = canvas.getContext('2d');
      pen.fillStyle = '#eee5d4';
      pen.fillRect(0, 0, 512, 160);
      pen.fillStyle = '#36433c';
      pen.font = '48px sans-serif';
      pen.textAlign = 'center';
      pen.textBaseline = 'middle';
      pen.fillText(name, 256, 80, 460);
      texture.needsUpdate = true;
    }
  };
}

// The same belongings travel into the permanent flat. Their state is driven by
// saved story choices, so returning to a room reconstructs the chosen arrangement.
export function createStoryHome(scene, permanent = false) {
  const room = createApartment(scene);
  const originalState = room.setState;
  const originalUpdate = room.update;
  const baseObstacles = room.obstacles.slice();
  const additions = new THREE.Group();
  room.root.add(additions);
  const wood = material('#9a7150');
  const cream = material('#e0d4bb');
  const dark = material('#3f4942');
  const chair = woodenChair(additions, wood);
  const name = nameCard(additions);
  box(additions, [.028, .19, .43], [3.36, 1.30, 1.75], dark);
  const lightSwitch = box(additions, [.025, .10, .085], [3.35, 1.13, 1.30], cream);
  const closedBag = createRollingBag(THREE);
  additions.add(closedBag);
  closedBag.rotation.set(Math.PI / 2, 0, .1);
  closedBag.scale.setScalar(.76);
  closedBag.position.set(-1.96, .16, .69);
  closedBag.visible = false;

  const paper = new THREE.Group();
  additions.add(paper);
  box(paper, [.26, .004, .33], [1.68, .806, -1.51], material('#f0e9d9'));
  for (let i = 0; i < 5; i++) {
    box(paper, [.17, .001, .006], [1.68, .809, -1.60 + i * .035], material('#969e92'));
  }
  const tabletop = new THREE.Group();
  additions.add(tabletop);
  tabletop.position.set(.02, 0, 1.33);
  box(tabletop, [1.18, .065, .74], [0, .755, 0], wood);
  for (const x of [-.49, .49]) {
    for (const z of [-.28, .28]) box(tabletop, [.055, .72, .055], [x, .36, z], wood);
  }
  const guestChair = woodenChair(additions, wood);
  guestChair.position.set(.02, 0, .65);
  guestChair.rotation.y = Math.PI;
  const plates = new THREE.Group();
  tabletop.add(plates);
  const food = new THREE.Group();
  plates.add(food);
  for (const z of [-.20, .20]) {
    const plate = cylinder(plates, .145, .018, [0, .80, z], cream);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(.136, .007, 8, 40), cream);
    rim.rotation.x = Math.PI / 2;
    rim.position.y = .009;
    plate.add(rim);
    box(plates, [.015, .008, .20], [.19, .80, z], dark);
    for (let i = 0; i < 8; i++) {
      const morsel = new THREE.Mesh(new THREE.SphereGeometry(.035, 8, 6), material(i % 3 ? '#bf703f' : '#647c4d'));
      morsel.scale.set(1, .45, .8);
      morsel.position.set(Math.sin(i * 2.4) * .075, .825, z + Math.cos(i * 2.4) * .065);
      food.add(morsel);
    }
  }
  const dessert = new THREE.Group();
  tabletop.add(dessert);
  box(dessert, [.18, .055, .24], [-.37, .82, 0], material('#bf9d6e'));
  box(dessert, [.19, .01, .25], [-.37, .852, 0], cream);
  const crumbs = new THREE.Group();
  tabletop.add(crumbs);
  const crumbSurface = material('#b18a57');
  for (let i = 0; i < 9; i++) {
    const crumb = new THREE.Mesh(new THREE.SphereGeometry(.006, 6, 4), crumbSurface);
    crumb.scale.set(1, .35, .7);
    crumb.position.set(Math.sin(i * 2.4) * .24, .793, Math.cos(i * 2.4) * .28);
    crumbs.add(crumb);
  }
  const cleanPlates = new THREE.Group();
  cleanPlates.name = 'Two washed plates beside the kettle';
  additions.add(cleanPlates);
  for (const x of [2.77, 3.14]) {
    const plate = cylinder(cleanPlates, .105, .012, [x, .833, 1.0], cream);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(.099, .005, 8, 32), cream);
    rim.rotation.x = Math.PI / 2;
    rim.position.y = .008;
    plate.add(rim);
  }
  const plant = new THREE.Group();
  plant.position.set(.35, 0, -2.17);
  additions.add(plant);
  cylinder(plant, .12, .20, [0, .10, 0], material('#b5775b'));
  const leaves = material('#687f59');
  for (let i = 0; i < 8; i++) {
    const leaf = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), leaves);
    leaf.scale.set(.075, .16, .025);
    const a = i * 2.4;
    leaf.position.set(Math.sin(a) * .10, .24 + i * .025, Math.cos(a) * .10);
    leaf.rotation.set(.2, a, Math.sin(a) * .5);
    plant.add(leaf);
  }
  let resident = null;
  let housemate = null;
  let residentSeated = false;
  let latestState;
  let layout = '';
  let roomDark = false;
  const lights = [];
  scene.traverse(object => {
    if (object.isLight) lights.push({object, intensity: object.intensity});
  });
  if (permanent) {
    const changed = new Set();
    room.root.traverse(object => {
      const surface = object.material;
      if (!surface?.color || changed.has(surface)) return;
      changed.add(surface);
      if (surface.color.getHexString() === '939d87') surface.color.set('#b0aa92');
      if (surface.color.getHexString() === 'aaa995') surface.color.set('#b6b6a0');
    });
    room.spawn = {x: 2.05, z: 1.95, yaw: -2.4};
  }
  const anchor = (x, y, z) => ({x, y, z});
  const bed = {...room.spots.photo, yaw: room.seat.yaw, anchor: anchor(-1.7, .84, -.1)};
  Object.assign(room.spots, {
    desk: {x: 1.04, z: -.70, anchor: anchor(1.76, 1.04, -1.48)},
    phone: {...bed, anchor: anchor(-2.45, .76, -.1)},
    photo: bed,
    blanket: {...room.spots.blanket, anchor: anchor(-2.27, .73, .71)},
    tea: {...room.spots.tea, anchor: anchor(2.92, 1.17, .37)},
    chair: {x: 1.42, z: .74, anchor: anchor(1.42, 1.1, 1.55)},
    door: {x: 2.65, z: 1.80, anchor: anchor(3.31, 1.5, 1.75)},
    light: {x: 2.65, z: 1.45, anchor: anchor(3.31, 1.24, 1.30)},
    suitcase: {x: -.45, z: .75, anchor: anchor(-1.96, .43, .69)},
    meal: {x: .60, z: 2.15, yaw: Math.PI, anchor: anchor(.02, .95, 1.33)},
    dishes: {x: 2.30, z: .62, anchor: anchor(2.94, 1.05, .78)}
  });
  room.dinnerSeat = {x: .02, z: 2.05, yaw: Math.PI};
  room.targets = {...room.targets, chair, door: name.card, light: lightSwitch, desk: paper, meal: tabletop, dishes: plates};
  room.navigationVersion = 0;
  function updateResidents() {
    const stage = latestState?.stage;
    residentSeated = permanent && stage === 'c8_dinner';
    if (resident) {
      resident.root.visible = permanent
        ? residentSeated || ['c6_name', 'c6_unpack'].includes(stage)
        : ['c2_place', 'c2_invite', 'c3_application'].includes(stage);
      resident.root.position.set(residentSeated ? .02 : 1.35, 0, residentSeated ? .65 : .2);
      resident.root.rotation.y = residentSeated ? 0 : -.70;
      resident.update({sit: residentSeated ? 1 : 0});
    }
    if (housemate) {
      housemate.root.visible = ['c6_viewing', 'c6_tea'].includes(stage);
    }
  }
  room.ready = Promise.all([
    room.ready,
    addResident(THREE, additions, RESIDENTS.amir, {x: 1.35, z: .2, yaw: -.70, name: 'Amir'}).then(actor => {
      resident = actor;
      updateResidents();
    }),
    permanent ? addResident(THREE, additions,
      {name: 'Housemate', gender: 'female', skin: 4, hair: 4, hairstyle: 1, outfit: 0},
      {x: 1.5, z: .4, yaw: .7, name: 'Your housemate'}).then(actor => {
      housemate = actor;
      updateResidents();
    }) : Promise.resolve()
  ]);
  room.setState = state => {
    latestState = state;
    const hasMoved = permanent && (state.chapter > 6 || !['c6_viewing', 'c6_offer'].includes(state.stage));
    const unpacked = !permanent || !!state.choices.newPlacement;
    const arranged = {
      ...state,
      choices: {...state.choices, placement: unpacked ? (permanent ? state.choices.newPlacement : state.choices.placement) : undefined},
      unpacked: {spices: unpacked && state.unpacked.spices, blanket: unpacked && state.unpacked.blanket},
      flags: {...state.flags, tea: permanent ? !!state.flags.newTea : !!state.flags.tea}
    };
    originalState(arranged);
    const hasChair = (state.stage === 'c2_place' || !!state.choices.chairPlacement) && (!permanent || hasMoved);
    const dinner = permanent && state.chapter === 8;
    const atWindow = state.choices.chairPlacement === 'window';
    chair.visible = hasChair;
    chair.position.set(dinner ? .02 : atWindow ? .77 : 1.43, 0, dinner ? 2.05 : atWindow ? -1.65 : 1.55);
    chair.rotation.y = dinner ? 0 : atWindow ? -.18 : -.6;
    room.spots.chair.x = dinner ? .60 : atWindow ? .85 : 1.43;
    room.spots.chair.z = dinner ? 2.15 : atWindow ? -.94 : .74;
    room.spots.chair.yaw = dinner ? Math.PI : 0;
    room.spots.chair.anchor = anchor(chair.position.x, 1.08, chair.position.z);
    tabletop.visible = guestChair.visible = dinner;
    plates.visible = dinner && state.stage !== 'c8_cook' && state.stage !== 'c8_light' && state.stage !== 'finished';
    food.visible = state.stage === 'c8_dinner';
    dessert.visible = state.stage === 'c8_dinner';
    crumbs.visible = state.stage === 'c8_message' || state.stage === 'c8_putaway';
    updateResidents();
    plant.visible = permanent;
    paper.visible = state.chapter >= 3 && state.chapter <= 6;
    name.card.visible = permanent && hasMoved;
    const namePlaced = permanent && (state.chapter > 6 || ['c6_unpack', 'c6_birthday', 'c6_tea'].includes(state.stage));
    name.write(namePlaced ? state.appearance.name : '');
    const packedAway = state.stage === 'c8_light' || state.stage === 'finished';
    cleanPlates.visible = dinner && packedAway;
    room.belongings.bag.visible = !packedAway && state.stage !== 'drop' && (!permanent || hasMoved);
    closedBag.visible = packedAway;
    const amirStanding = permanent ? ['c6_name', 'c6_unpack'].includes(state.stage)
      : ['c2_place', 'c2_invite', 'c3_application'].includes(state.stage);
    const housemateStanding = permanent && ['c6_viewing', 'c6_tea'].includes(state.stage);
    const footprint = [hasChair, dinner, atWindow, packedAway, amirStanding, housemateStanding].join(':');
    if (footprint !== layout) {
      layout = footprint;
      room.obstacles = baseObstacles.filter((_, index) => index !== 2 || !packedAway);
      if (hasChair) room.obstacles.push({minX: chair.position.x - .24, maxX: chair.position.x + .24, minZ: chair.position.z - .24, maxZ: chair.position.z + .24});
      if (dinner) room.obstacles.push({minX: -.58, maxX: .62, minZ: .40, maxZ: 1.72});
      if (amirStanding) room.obstacles.push({minX: 1.15, maxX: 1.55, minZ: -.02, maxZ: .42});
      if (housemateStanding) room.obstacles.push({minX: 1.30, maxX: 1.70, minZ: .18, maxZ: .62});
      room.navigationVersion++;
    }
    roomDark = state.stage === 'finished' || (state.stage === 'c5_light' && !state.flags.returnedHome);
  };
  room.update = (time, sit) => {
    originalUpdate(time, sit);
    if (resident?.root.visible) resident.update({time, dt: 1 / 30, sit: residentSeated ? 1 : 0});
    if (housemate?.root.visible) housemate.updateIdle(time);
    for (const light of lights) {
      const target = light.intensity * (roomDark ? .08 : 1);
      light.object.intensity += (target - light.object.intensity) * .045;
    }
  };
  return room;
}
