// Shared furniture keeps the street, workplace and station in the same visual world.
export function makeLifeProps(T) {
  const materials = new Map();
  const unitBox = new T.BoxGeometry(1, 1, 1);
  const unitSphere = new T.SphereGeometry(1, 12, 8);
  const timberColours = new Set(['#997652','#a68a63','#ad885d','#9f7351','#b79661','#a9926e',
    '#b09b78','#b4a283','#a38c6b','#ac9872','#b2936b','#9a7655','#a28058','#aa8761']);
  let grain;
  function material(colour, roughness = .78, metalness = 0) {
    const key = `${colour}/${roughness}/${metalness}`;
    if (!materials.has(key)) {
      const finish = new T.MeshStandardMaterial({color: colour, roughness, metalness});
      if (timberColours.has(colour)) {
        grain ??= texture(256, 512, (c, w, h) => {
          c.fillStyle = '#e3dfd6';c.fillRect(0, 0, w, h);
          for (let i = 0; i < 200; i++) {
            c.strokeStyle = `rgba(75,66,54,${.025 + (i % 7) * .007})`;
            c.lineWidth = .4 + i % 3 * .3;
            c.beginPath();
            for (let y = 0; y <= h; y += 8) {
              const x = i * 1.31 + Math.sin(y / 81 + i * .31) * 2.6;
              if (y === 0) c.moveTo(x, y); else c.lineTo(x, y);
            }
            c.stroke();
          }
        });
        finish.map = grain;
      }
      materials.set(key, finish);
    }
    return materials.get(key);
  }
  function mesh(parent, geometry, finish, x = 0, y = 0, z = 0) {
    const object = new T.Mesh(geometry, finish);
    object.position.set(x, y, z);
    object.castShadow = object.receiveShadow = true;
    parent.add(object);
    return object;
  }
  function box(parent, x, y, z, width, height, depth, finish) {
    const object = mesh(parent, unitBox, finish, x, y, z);
    object.scale.set(width, height, depth);
    return object;
  }
  function sphere(parent, x, y, z, width, height, depth, finish) {
    const object = mesh(parent, unitSphere, finish, x, y, z);
    object.scale.set(width, height, depth);
    return object;
  }
  function cylinder(parent, x, y, z, radius, height, finish, topRadius = radius) {
    return mesh(parent, new T.CylinderGeometry(topRadius, radius, height, 18), finish, x, y, z);
  }
  function rod(parent, from, to, radius, finish) {
    const direction = new T.Vector3().fromArray(to).sub(new T.Vector3().fromArray(from));
    const object = cylinder(parent, (from[0] + to[0]) / 2, (from[1] + to[1]) / 2,
      (from[2] + to[2]) / 2, radius, direction.length(), finish);
    object.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), direction.normalize());
    return object;
  }
  function texture(width, height, draw) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    draw(canvas.getContext('2d'), width, height);
    const map = new T.CanvasTexture(canvas);
    map.colorSpace = T.SRGBColorSpace;
    map.anisotropy = 4;
    return map;
  }
  function panel(parent, x, y, z, width, height, map, lit = false) {
    const finish = lit ? new T.MeshBasicMaterial({map}) : new T.MeshStandardMaterial({map, roughness: .8});
    const object = mesh(parent, new T.PlaneGeometry(width, height), finish, x, y, z);
    object.castShadow = false;
    return object;
  }
  function sign(parent, x, y, z, width, height, title, subtitle = '', colour = '#253d3c', ink = '#f3e4c5') {
    const map = texture(768, 256, (c, w, h) => {
      c.fillStyle = colour;
      c.fillRect(0, 0, w, h);
      c.fillStyle = ink;
      c.textBaseline = 'middle';
      c.textAlign = 'center';
      c.font = '600 69px Arial';
      c.fillText(title, w / 2, subtitle ? 100 : h / 2, w - 48);
      if (subtitle) {
        c.globalAlpha = .78;
        c.font = '34px Arial';
        c.fillText(subtitle, w / 2, 184, w - 48);
      }
    });
    return panel(parent, x, y, z, width, height, map);
  }
  function chair(parent, x = 0, z = 0, yaw = 0, colour = '#997652') {
    const group = new T.Group();
    group.position.set(x, 0, z);
    group.rotation.y = yaw;
    parent.add(group);
    const wood = material(colour);
    box(group, 0, .47, 0, .46, .055, .43, wood);
    for (const side of [-1, 1]) {
      rod(group, [side * .21, .02, .19], [side * .17, .47, .15], .024, wood);
      rod(group, [side * .21, .02, -.20], [side * .18, .95, -.19], .024, wood);
      rod(group, [side * .19, .23, -.19], [side * .19, .23, .17], .013, wood);
    }
    for (const xx of [-.105, 0, .105]) rod(group, [xx, .49, -.19], [xx, .88, -.19], .014, wood);
    box(group, 0, .90, -.19, .47, .10, .048, wood);
    return group;
  }
  function table(parent, x, z, width, depth, colour = '#a68a63') {
    const group = new T.Group();
    parent.add(group);
    group.position.set(x, 0, z);
    const wood = material(colour);
    box(group, 0, .76, 0, width, .065, depth, wood);
    for (const xx of [-1, 1]) for (const zz of [-1, 1]) {
      box(group, xx * (width / 2 - .085), .37, zz * (depth / 2 - .08), .062, .74, .062, wood);
    }
    return group;
  }
  function plant(parent, x, z, scale = 1, y = 0) {
    const group = new T.Group();
    group.position.set(x, y, z);
    group.scale.setScalar(scale);
    parent.add(group);
    cylinder(group, 0, .19, 0, .19, .38, material('#b28366'), .24);
    cylinder(group, 0, .385, 0, .215, .015, material('#554d3d'));
    const stem = material('#617448');
    const leaf = material('#69875b');
    for (let i = 0; i < 9; i++) {
      const angle = i * 2.4;
      const top = .69 + (i % 3) * .15;
      const xx = Math.cos(angle) * .23, zz = Math.sin(angle) * .23;
      rod(group, [0, .39, 0], [xx, top, zz], .009, stem);
      const blade = sphere(group, xx, top, zz, .082, .22, .025, leaf);
      blade.rotation.set(.45, -angle, .4 * Math.cos(angle));
    }
    return group;
  }
  function mug(parent, x, y, z, colour = '#e7d7b5', full = true) {
    const group = new T.Group();
    group.position.set(x, y, z);
    parent.add(group);
    const ceramic = material(colour, .44);
    cylinder(group, 0, .049, 0, .040, .096, ceramic, .045);
    if (full) cylinder(group, 0, .0975, 0, .037, .002, material('#5b3f2d', .23));
    const handle = mesh(group, new T.TorusGeometry(.026, .006, 8, 20), ceramic, .048, .055, 0);
    return group;
  }
  function windowFrame(parent, x, y, z, width, height) {
    const frame = material('#d4caba');
    const glass = material('#799299', .32, .08);
    box(parent, x, y, z, width, height, .07, glass);
    const view = texture(384, 512, (c, w, h) => {
      const sky = c.createLinearGradient(0, 0, 0, h);
      sky.addColorStop(0, '#adc1c2');sky.addColorStop(1, '#e1d4b5');
      c.fillStyle = sky;c.fillRect(0, 0, w, h);
      for (let n = 0; n < 5; n++) {
        const left = n * 86 - 17, top = 170 + (n % 3) * 21;
        c.fillStyle = ['#a7aca1', '#b8b5a4', '#a9b4aa'][n % 3];
        c.fillRect(left, top, 80, h - top);
        c.fillStyle = '#818e86';
        for (let row = 0; row < 5; row++) for (let col = 0; col < 3; col++) {
          c.fillRect(left + 9 + col * 23, top + 18 + row * 55, 12, 25);
        }
      }
      c.fillStyle = 'rgba(220,233,221,.16)';c.fillRect(0, 0, w, h);
    });
    panel(parent, x, y, z + .04, width, height, view, true);
    for (const xx of [-1, 1]) box(parent, x + xx * width / 2, y, z + .05, .065, height + .10, .13, frame);
    for (const yy of [-1, 1]) box(parent, x, y + yy * height / 2, z + .05, width + .09, .065, .13, frame);
    box(parent, x, y, z + .055, .045, height, .12, frame);
    box(parent, x, y + height * .19, z + .06, width, .044, .13, frame);
    box(parent, x, y - height / 2 - .045, z + .14, width + .22, .065, .34, frame);
  }
  // One mesh per material for static scenery. Interactive groups are batched separately.
  function batch(group) {
    group.updateWorldMatrix(true, true);
    const inverse = group.matrixWorld.clone().invert();
    const byMaterial = new Map();
    group.traverse(object => {
      if (!object.isMesh || object.isSkinnedMesh || Array.isArray(object.material)) return;
      const key = object.material.uuid + '/' + object.castShadow;
      if (!byMaterial.has(key)) byMaterial.set(key, []);
      byMaterial.get(key).push(object);
    });
    for (const objects of byMaterial.values()) {
      if (objects.length < 2) continue;
      const positions = [], normals = [], uvs = [], indices = [];
      const vector = new T.Vector3(), transform = new T.Matrix4(), normalTransform = new T.Matrix3();
      let base = 0;
      for (const object of objects) {
        const geometry = object.geometry, attributes = geometry.attributes;
        transform.multiplyMatrices(inverse, object.matrixWorld);
        normalTransform.getNormalMatrix(transform);
        for (let i = 0; i < attributes.position.count; i++) {
          vector.fromBufferAttribute(attributes.position, i).applyMatrix4(transform).toArray(positions, positions.length);
          vector.fromBufferAttribute(attributes.normal, i).applyMatrix3(normalTransform).normalize().toArray(normals, normals.length);
          uvs.push(attributes.uv?.getX(i) || 0, attributes.uv?.getY(i) || 0);
        }
        const count = geometry.index?.count || attributes.position.count;
        for (let i = 0; i < count; i++) indices.push(base + (geometry.index ? geometry.index.getX(i) : i));
        base += attributes.position.count;
        object.removeFromParent();
      }
      const geometry = new T.BufferGeometry();
      geometry.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
      geometry.setAttribute('normal', new T.Float32BufferAttribute(normals, 3));
      geometry.setAttribute('uv', new T.Float32BufferAttribute(uvs, 2));
      geometry.setIndex(indices);
      const merged = mesh(group, geometry, objects[0].material);
      merged.castShadow = objects[0].castShadow;
    }
    return group;
  }
  return {material, mesh, box, sphere, cylinder, rod, texture, panel, sign, chair, table, plant, mug, windowFrame, batch};
}
