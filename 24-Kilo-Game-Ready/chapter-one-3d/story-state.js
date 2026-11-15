import {cleanAppearance} from './appearance.js';
import {LATER_STEPS} from './later-story.js';

const arrivalStages = ['landed','bag','ticket','train','ride','drop','portrait','spices','blanket','settle','picture','message','rest','done'];
export const stepsById = new Map(LATER_STEPS.map(step => [step.id, step]));
export const stages = [...arrivalStages, ...LATER_STEPS.map(step => step.id), 'finished'];

export function chapterFor(stage) {
  return stepsById.get(stage)?.chapter || (stage === 'finished' ? 8 : 1);
}

export function locationFor(stage) {
  if (stage === 'finished') return 'home';
  if (stepsById.has(stage)) return stepsById.get(stage).place;
  if (stage === 'ride') return 'ride';
  return arrivalStages.indexOf(stage) < arrivalStages.indexOf('ride') ? 'airport' : 'room';
}

export function newChapter(appearance) {
  return {
    version: 2, stage: 'landed', chapter: 1, appearance: cleanAppearance(appearance),
    choices: {}, unpacked: {spices: false, blanket: false}, flags: {},
    position: null, beat: 0, pendingChapter: null
  };
}

const allowed = {
  language: ['de', 'en'], placement: ['bed', 'desk'],
  frame: ['whole', 'tidy'], message: ['honest', 'reassure']
};
for (const step of LATER_STEPS) {
  for (const beat of step.beats) {
    if (beat.choiceKey) allowed[beat.choiceKey] = beat.choices.map(choice => choice.value);
  }
}

export function resumeChapter(raw) {
  if (!raw || ![1, 2].includes(raw.version) || !stages.includes(raw.stage)) return null;
  if (raw.version === 1 && !arrivalStages.includes(raw.stage)) return null;
  const state = newChapter(raw.appearance);
  state.stage = raw.stage;
  state.chapter = chapterFor(state.stage);
  for (const [key,values] of Object.entries(allowed)) if (values.includes(raw.choices?.[key])) state.choices[key]=raw.choices[key];
  for (const key of ['tea','window','radiator','reunion','newTea','returnedHome']) state.flags[key]=raw.flags?.[key]===true;
  state.unpacked.spices = stages.indexOf(state.stage)>stages.indexOf('spices');
  state.unpacked.blanket = stages.indexOf(state.stage)>stages.indexOf('blanket');
  const beatCount = stepsById.get(state.stage)?.beats.length || 0;
  state.beat = Number.isInteger(raw.beat) ? Math.max(0, Math.min(beatCount, raw.beat)) : 0;
  if (raw.pendingChapter === state.chapter && state.chapter > 1) state.pendingChapter = state.chapter;
  const p = raw.position;
  if (p && p.scene === locationFor(state.stage) && [p.x,p.z,p.yaw].every(Number.isFinite)) state.position={scene:p.scene,x:p.x,z:p.z,yaw:p.yaw};
  return state;
}

export function chapterStorage(playtest=false, storage) {
  // Keep the original key so a saved first evening continues into the full story.
  const key='24kilo.arrivals3d.v1'+(playtest?'.playtest':'');
  return {
    load(){try{return resumeChapter(JSON.parse((storage??globalThis.localStorage).getItem(key)));}catch{return null;}},
    save(state){try{(storage??globalThis.localStorage).setItem(key,JSON.stringify(state));return true;}catch{return false;}}
  };
}
