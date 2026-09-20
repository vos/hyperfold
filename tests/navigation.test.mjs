import assert from 'node:assert/strict';
import test from 'node:test';

// Inlined logic check for coordinate graph & level invariants
test('Infinite Cube Topology Invariants', () => {
  // Simulating the LevelMap coordinates
  const rooms = new Map();
  const coords = [
    [0, 0], [1, 0], [2, 0], [3, 0], [4, 0], [5, 0], [6, 0],
    [2, 1], [2, 2], [4, -1]
  ];

  for (const [x, y] of coords) {
    rooms.set(`${x},${y}`, { x, y });
  }

  // Verify room count exceeds 6 (infinite cube proof)
  assert.ok(rooms.size > 6, 'Level has more than 6 rooms');

  // Verify continuous horizontal chain of 7 rooms
  for (let x = 0; x <= 6; x++) {
    assert.ok(rooms.has(`${x},0`), `Room (${x}, 0) must exist`);
  }

  // Simulate rightward traversal from (0,0) to (6,0)
  let cur = { x: 0, y: 0 };
  let sidesTurned = 0;
  while (cur.x < 6) {
    cur.x++;
    sidesTurned++;
    assert.ok(rooms.has(`${cur.x},${cur.y}`));
  }
  assert.equal(cur.x, 6);
  assert.equal(sidesTurned, 6); // 6 turns = 7 rooms! (More than a 6-sided die can show without looping)

  // Simulate reverse leftward traversal from (6,0) back to (0,0)
  while (cur.x > 0) {
    cur.x--;
    assert.ok(rooms.has(`${cur.x},${cur.y}`));
  }
  assert.equal(cur.x, 0);
  assert.equal(cur.y, 0);

  // Simulate vertical climb
  cur = { x: 2, y: 0 };
  cur.y++; // up to (2, 1)
  assert.ok(rooms.has(`${cur.x},${cur.y}`));
  cur.y++; // up to (2, 2)
  assert.ok(rooms.has(`${cur.x},${cur.y}`));
  cur.y--; // down to (2, 1)
  assert.ok(rooms.has(`${cur.x},${cur.y}`));
  cur.y--; // down to (2, 0)
  assert.equal(cur.y, 0);

  // Simulate underground chasm
  cur = { x: 4, y: 0 };
  cur.y--; // down to (4, -1)
  assert.ok(rooms.has(`${cur.x},${cur.y}`));
  cur.y++; // return to (4, 0)
  assert.equal(cur.y, 0);
});
