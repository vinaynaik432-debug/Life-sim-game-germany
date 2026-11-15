import test from 'node:test';
import assert from 'node:assert/strict';
import {chapterStorage, chapterFor, locationFor, newChapter, resumeChapter, stages} from '../story-state.js';
import {LATER_STEPS} from '../later-story.js';

function memoryStorage() {
  const entries = new Map();
  return {
    getItem(key) { return entries.get(key) ?? null; },
    setItem(key, value) { entries.set(key, String(value)); }
  };
}

const appearance = {name: 'Živa', gender: 'female', skin: 4, hair: 3, hairstyle: 2, outfit: 1};

test('every playable checkpoint resumes in the right chapter and location', () => {
  const store = chapterStorage(false, memoryStorage());
  assert.equal(new Set(stages).size, stages.length, 'Checkpoints must have unique identities');
  for (const stage of stages) {
    const state = newChapter(appearance);
    state.stage = stage;
    state.chapter = chapterFor(stage);
    state.position = {scene: locationFor(stage), x: .56, z: 1.44, yaw: -.7};
    assert.equal(store.save(state), true);
    const restored = store.load();
    assert.equal(restored.stage, stage);
    assert.equal(restored.chapter, state.chapter);
    assert.deepEqual(restored.appearance, appearance);
    assert.deepEqual(restored.position, state.position);
  }
  assert.equal(chapterFor('c2_bakery'), 2);
  assert.equal(locationFor('c3_clerk'), 'civic');
  assert.equal(chapterFor('c6_unpack'), 6);
  assert.equal(locationFor('c6_unpack'), 'home');
  assert.equal(chapterFor('finished'), 8);
  assert.equal(locationFor('finished'), 'home');
});

test('an existing first-evening save migrates without losing the character or room choices', () => {
  const legacy = {
    version: 1, stage: 'message', appearance,
    choices: {language: 'en', placement: 'desk', frame: 'whole'},
    flags: {tea: true, window: true, reunion: true},
    unpacked: {spices: true, blanket: true},
    position: {scene: 'room', x: .8, z: 1.7, yaw: -.4}
  };
  const store = chapterStorage(false, memoryStorage());
  store.save(legacy);
  const restored = store.load();
  assert.equal(restored.version, 2);
  assert.equal(restored.stage, 'message');
  assert.equal(restored.chapter, 1);
  assert.deepEqual(restored.appearance, appearance);
  assert.deepEqual(restored.choices, legacy.choices);
  assert.deepEqual(restored.position, legacy.position);
  assert.equal(restored.flags.tea, true);
  assert.equal(restored.flags.reunion, true);
  assert.equal(restored.unpacked.blanket, true);
});

test('a finished legacy first chapter remains available to continue into chapter two', () => {
  const restored = resumeChapter({
    version: 1, stage: 'done', appearance,
    choices: {placement: 'bed', frame: 'tidy', message: 'honest'},
    flags: {radiator: true}
  });
  assert.equal(restored.version, 2);
  assert.equal(restored.stage, 'done');
  assert.equal(restored.chapter, 1);
  assert.equal(restored.choices.message, 'honest');
  assert.deepEqual(restored.unpacked, {spices: true, blanket: true});
  assert.equal(restored.beat, 0);
  assert.equal(restored.pendingChapter, null);
});

test('choices from later chapters survive a saved ending', () => {
  const choices = {
    language: 'de', placement: 'desk', frame: 'whole', message: 'reassure',
    bakery: 'german', chairHelp: 'doors', chairPlacement: 'window',
    appointmentCompany: 'prepare', registration: 'amir',
    houseQuestion: 'kitchen', newPlacement: 'bed', birthday: 'cake',
    ingredient: 'pumpkin', helpApproach: 'ask', ticketHelp: 'together',
    dinnerTalk: 'newcomer', endingShare: 'voice', lastReply: 'nextTime'
  };
  const state = {...newChapter(appearance), stage: 'finished', chapter: 8, choices};
  const store = chapterStorage(false, memoryStorage());
  assert.equal(store.save(state), true);
  assert.deepEqual(store.load().choices, choices);
  state.choices.chairPlacement = 'desk';
  state.appearance.name = 'Changed';
  assert.equal(store.load().choices.chairPlacement, 'window');
  assert.equal(store.load().appearance.name, 'Živa');
});

test('each dialogue choice is retained after reloading midway through its scene', () => {
  const store = chapterStorage(true, memoryStorage());
  for (const step of LATER_STEPS) {
    for (const [index, beat] of step.beats.entries()) {
      if (!beat.choiceKey) continue;
      for (const choice of beat.choices) {
        const state = {
          ...newChapter(appearance), stage: step.id, chapter: step.chapter,
          beat: index + 1, choices: {[beat.choiceKey]: choice.value}
        };
        assert.equal(store.save(state), true);
        const restored = store.load();
        assert.equal(restored.choices[beat.choiceKey], choice.value);
        assert.equal(restored.beat, index + 1);
        assert.equal(restored.stage, step.id);
      }
    }
  }
});

test('chapter cards and completed dialogue checkpoints survive a reload', () => {
  const first = resumeChapter({
    ...newChapter(appearance), stage: 'c7_groceries', chapter: 7,
    pendingChapter: 7, beat: 0
  });
  assert.equal(first.pendingChapter, 7);
  assert.equal(first.beat, 0);
  const midway = resumeChapter({...first, pendingChapter: null, beat: 1});
  assert.equal(midway.beat, 1);
  assert.equal(midway.pendingChapter, null);
  const finishedStep = resumeChapter({...first, beat: 2, pendingChapter: null});
  assert.equal(finishedStep.beat, 2, 'A completed step can advance without replaying its last line');
  assert.equal(resumeChapter({...first, pendingChapter: 6}).pendingChapter, null);
});

test('malformed counters, choices and positions are normalized at load', () => {
  const raw = {
    ...newChapter(appearance), stage: 'c8_message', chapter: 2, beat: 999,
    pendingChapter: 2, choices: {lastReply: 'invalid', unknown: 'value', endingShare: 'photo'},
    flags: {tea: 'yes', window: true, unknown: true},
    position: {scene: 'home', x: Infinity, z: 0, yaw: 0}
  };
  const restored = resumeChapter(raw);
  assert.equal(restored.chapter, 8);
  assert.equal(restored.beat, 3);
  assert.equal(restored.pendingChapter, null);
  assert.deepEqual(restored.choices, {endingShare: 'photo'});
  assert.equal(restored.flags.tea, false);
  assert.equal(restored.flags.window, true);
  assert.equal(restored.flags.unknown, undefined);
  assert.equal(restored.position, null);
  assert.equal(resumeChapter({...raw, beat: -3}).beat, 0);
  assert.equal(resumeChapter({...raw, beat: '1'}).beat, 0);
  assert.equal(resumeChapter({...raw, position: {scene: 'airport', x: 0, z: 0, yaw: 0}}).position, null);
});

test('incompatible or corrupted saves are rejected', () => {
  for (const raw of [null, {}, [], 'text', {version: 8, stage: 'bag'},
    {version: 2, stage: 'missing'}, {version: 1, stage: 'c7_machine'}]) {
    assert.equal(resumeChapter(raw), null);
  }
  const storage = memoryStorage();
  storage.setItem('24kilo.arrivals3d.v1', '{unfinished');
  assert.equal(chapterStorage(false, storage).load(), null);
});

test('playtesting saves never overwrite the normal player save', () => {
  const storage = memoryStorage();
  const normal = chapterStorage(false, storage);
  const playtest = chapterStorage(true, storage);
  normal.save({...newChapter({name: 'Player'}), stage: 'c6_birthday'});
  assert.equal(playtest.load(), null);
  playtest.save({...newChapter({name: 'Test'}), stage: 'finished'});
  assert.equal(normal.load().appearance.name, 'Player');
  assert.equal(normal.load().stage, 'c6_birthday');
  assert.equal(playtest.load().appearance.name, 'Test');
  assert.equal(playtest.load().stage, 'finished');
});

test('storage restrictions do not throw into gameplay', () => {
  const restricted = {
    getItem() { throw new Error('Unavailable'); },
    setItem() { throw new Error('Full'); }
  };
  for (const storage of [restricted, null, {}]) {
    const store = chapterStorage(false, storage);
    assert.equal(store.load(), null);
    assert.equal(store.save(newChapter()), false);
  }
});

test('a browser that blocks access to localStorage can still start a story', () => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    get() { throw new Error('Storage is blocked'); }
  });
  try {
    const store = chapterStorage();
    assert.equal(store.load(), null);
    assert.equal(store.save(newChapter()), false);
  } finally {
    if (descriptor) Object.defineProperty(globalThis, 'localStorage', descriptor);
    else delete globalThis.localStorage;
  }
});
