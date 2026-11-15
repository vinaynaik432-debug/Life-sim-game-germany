// The two relative shapes move existing strands while keeping their original skin weights.
const shapeFiles = new Map();
const meshes = new WeakMap();

async function loadShapes(body, expectedCount) {
  const filename = body === 'male' ? 'man-hair.bin' : 'woman-hair.bin';
  if (!shapeFiles.has(filename)) {
    const request = fetch(new URL('./assets/' + filename, import.meta.url))
      .then(response => {
        if (!response.ok) throw new Error('Could not load the hairstyle.');
        return response.arrayBuffer();
      })
      .catch(error => { shapeFiles.delete(filename); throw error; });
    shapeFiles.set(filename, request);
  }
  const file = await shapeFiles.get(filename);
  const view = new DataView(file);
  const count = view.getUint32(8, true);
  if (view.getUint32(0, false) !== 0x4b323448 ||
      view.getUint32(4, true) !== expectedCount || file.byteLength !== 12 + count * 14) {
    throw new Error('The hairstyle does not match this character.');
  }
  const deltas = [new Float32Array(expectedCount * 3), new Float32Array(expectedCount * 3)];
  for (let row = 0; row < count; row++) {
    const offset = 12 + row * 14;
    const vertex = view.getUint16(offset, true);
    if (vertex >= expectedCount) throw new Error('The hairstyle contains an invalid vertex.');
    for (let style = 0; style < 2; style++) {
      for (let axis = 0; axis < 3; axis++) {
        deltas[style][vertex * 3 + axis] = view.getInt16(offset + 2 + style * 6 + axis * 2, true) / 10000;
      }
    }
  }
  return deltas;
}

export async function applyHairShape(THREE, mesh, body, style) {
  const choice = style === 1 || style === 2 ? style : 0;
  let state = meshes.get(mesh);
  if (!state && !choice) return;
  if (!state) {
    const geometry = mesh.geometry;
    state = { choice };
    meshes.set(mesh, state);
    state.ready = loadShapes(body, geometry.attributes.position.count).then(shapes => {
      const copy = geometry.clone();
      copy.morphTargetsRelative = true;
      copy.morphAttributes.position = shapes.map(delta => new THREE.BufferAttribute(delta, 3));
      mesh.geometry = copy;
      mesh.updateMorphTargets();
    }).catch(error => { meshes.delete(mesh); throw error; });
  }
  state.choice = choice;
  await state.ready;
  mesh.morphTargetInfluences[0] = state.choice === 1 ? 1 : 0;
  mesh.morphTargetInfluences[1] = state.choice === 2 ? 1 : 0;
}
