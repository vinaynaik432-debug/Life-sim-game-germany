const cell = 0.16;
const clearance = 0.18;
const distance = (a, b) => Math.hypot(b.x - a.x, b.z - a.z);
const clamp = (n, low, high) => Math.min(high, Math.max(low, n));

/** Routes use metres on the room's floor. The margin models the player's width. */
export function createNavigation(bounds, furniture) {
  const room = {
    minX: bounds.minX + clearance, maxX: bounds.maxX - clearance,
    minZ: bounds.minZ + clearance, maxZ: bounds.maxZ - clearance
  };
  const solids = furniture.map(rect => ({
    minX: rect.minX - clearance, maxX: rect.maxX + clearance,
    minZ: rect.minZ - clearance, maxZ: rect.maxZ + clearance
  }));
  function open(x, z) {
    return x >= room.minX && x <= room.maxX && z >= room.minZ && z <= room.maxZ &&
      !solids.some(r => x > r.minX && x < r.maxX && z > r.minZ && z < r.maxZ);
  }
  function connected(a, b) {
    const steps = Math.max(1, Math.ceil(distance(a, b) / (cell / 3)));
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      if (!open(a.x + (b.x - a.x) * t, a.z + (b.z - a.z) * t)) return false;
    }
    return true;
  }
  const nodes = [];
  const rows = Math.floor((room.maxZ - room.minZ) / cell) + 1;
  const cols = Math.floor((room.maxX - room.minX) / cell) + 1;
  for (let z = 0; z < rows; z++) for (let x = 0; x < cols; x++) {
    const point = {x: room.minX + x * cell, z: room.minZ + z * cell};
    nodes.push(open(point.x, point.z) ? point : null);
  }
  const neighbours = nodes.map((point, i) => {
    if (!point) return [];
    const edges = [];
    for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
      if (!dz && !dx) continue;
      const x = i % cols + dx, z = Math.floor(i / cols) + dz;
      if (x < 0 || x >= cols || z < 0 || z >= rows) continue;
      const next = z * cols + x;
      if (nodes[next] && connected(point, nodes[next])) edges.push(next);
    }
    return edges;
  });
  function nearest(point, requireConnection) {
    let best = -1, bestDistance = Infinity;
    nodes.forEach((node, index) => {
      if (!node) return;
      const d = distance(node, point);
      if (d < bestDistance && (!requireConnection || connected(point, node))) {
        bestDistance = d;
        best = index;
      }
    });
    return best;
  }
  function route(from, target) {
    const goal = {x: clamp(target.x, room.minX, room.maxX), z: clamp(target.z, room.minZ, room.maxZ)};
    if (connected(from, goal)) return [goal];
    const first = nearest(from, true), last = nearest(goal, open(goal.x, goal.z));
    if (first < 0 || last < 0) return [];
    const queue = [first], parents = new Map([[first, -1]]);
    for (let index = 0; index < queue.length && !parents.has(last); index++) {
      for (const next of neighbours[queue[index]]) {
        if (!parents.has(next)) { parents.set(next, queue[index]); queue.push(next); }
      }
    }
    if (!parents.has(last)) return [];
    const path = [];
    for (let i = last; i !== -1; i = parents.get(i)) path.unshift(nodes[i]);
    if (connected(nodes[last], goal)) path.push(goal);
    const result = [];
    let current = from;
    for (let i = 0; i < path.length; i++) {
      while (i + 1 < path.length && connected(current, path[i + 1])) i++;
      result.push(path[i]);
      current = path[i];
    }
    return result;
  }
  return {open, route};
}
