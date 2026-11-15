import {ChapterWorld} from './world.js';
import {ChapterUI} from './chapter-ui.js';
import {showCreator} from './creator.js';
import {DEFAULT_APPEARANCE} from './appearance.js';
import {chapterStorage,chapterFor,locationFor,newChapter,stepsById} from './story-state.js';
import {Ambience} from './audio.js';
import * as THREE from 'three';
import {CHAPTERS,LATER_STEPS} from './later-story.js';
import {createLifeScene} from './life-scenes.js';
import {createStoryHome} from './home-details.js';

const byId=id=>document.getElementById(id);
const ui=new ChapterUI(byId('story-ui'));
const store=chapterStorage(new URLSearchParams(location.search).has('playtest'));
const sound=new Ambience();
let world,state,saved=store.load(),screen='title',locked=false,closeCreator=null,photos=null;
const objectives={
  landed:'Let home know you landed.',bag:'Find the suitcase with the yellow ribbon.',ticket:'Get a ticket into Berlin.',train:'Take your suitcase to the trains.',
  drop:'Put down your suitcase.',portrait:'Sit with the photograph from home.',spices:'Unpack the spices.',blanket:'Spread your blanket over the bed.',
  settle:'Take a moment to look around.',picture:'Send a picture of the room.',message:'Answer the message from home.',rest:'Get some rest before tomorrow.'
};
function setBusy(text=''){byId('busy').hidden=!text;byId('busy').textContent=text;}
function remember(){
  if(!state||screen!=='play')return;
  const p=world.position();if(p&&p.scene===locationFor(state.stage))state.position=p;
  const ok=store.save(state);if(ok)saved=state;
  byId('save-note').textContent=ok?'Saved on this device':'Saving unavailable';
}
function showPrompt(label,alternate,details={}){
  byId('act-label').textContent=label;byId('actions').hidden=!label;
  byId('act').disabled=!details.canInteract;
  byId('act').querySelector('kbd').hidden=!details.canInteract;
  byId('next-action').hidden=!alternate;byId('next-action').textContent=alternate?alternate.label+' →':'';
  const choices=byId('quiet-choices');choices.replaceChildren();
  if(!label||state?.stage!=='settle'||world?.pending)return;
  byId('next-action').hidden=true;
  for(const action of world.actions.filter(action=>action.label!==label)){
    const button=document.createElement('button');button.textContent=action.label;
    button.onclick=()=>world.go(action);choices.append(button);
  }
}
function activateWorld(enabled){
  world.setEnabled(enabled);byId('actions').hidden=!enabled||!world.prompt;
  byId('menu').disabled=!enabled;byId('markers').hidden=!enabled;
}
function spot(key,label,anchor,primary=false,extra={}){
  const point=world.set.spots[key], [x,y,z]=anchor;
  return {key,label,anchor:{x,y,z},point,primary,yaw:Math.atan2(x-point.x,z-point.z),target:world.set.targets?.[key],...extra};
}
function actions(){
  const stage=state.stage;
  const step=stepsById.get(stage);
  if(step){
    const point=world.set.spots[step.spot];
    if(!point)throw new Error(`Missing interaction ${step.spot} in ${step.place}`);
    const anchor=point.anchor||{x:point.x,y:1,z:point.z};
    return [{key:step.id,label:step.label,anchor,point,primary:true,
      yaw:point.yaw??Math.atan2(anchor.x-point.x,anchor.z-point.z),
      target:world.set.targets?.[step.spot],bounds:point.bounds}];
  }
  if(world.place==='airport'){
    if(stage==='bag')return [spot('bag','Check the yellow ribbon',[-.93,1.28,-.54],true,{markerLabel:'Yellow ribbon'}),spot('wrongBag','Check the other suitcase',[-3.20,1.23,-.54])];
    if(stage==='ticket')return [spot('ticket','Use the ticket machine',[3.04,1.78,-2.50],true,{markerLabel:'Fahrkarten'})];
    if(stage==='train')return [spot('train','Go to the trains',[4.96,1.55,.06],true,{markerLabel:'Bahnhof'})];
    return [];
  }
  if(world.place!=='room')return [];
  const bed={yaw:world.set.seat.yaw,bounds:[-3.05,0,-1.45,-1.57,.83,1.09]};
  const main={
    drop:()=>spot('drop','Put down your suitcase',[-.30,.16,-1.16],true,{bounds:[-.89,0,-1.7,.26,.75,-.76]}),
    portrait:()=>spot('photo','Sit with the photograph',[-1.65,.75,-.1],true,{...bed,markerLabel:'Family photograph'}),
    spices:()=>spot('spice','Set out the spices',[2.94,1.05,.78],true,{bounds:[2.60,.3,.04,3.28,1.25,1.12]}),
    blanket:()=>spot('blanket','Unfold your blanket',[-2.27,.66,.71],true,bed),
    picture:()=>spot('picture','Take a room photograph',[.58,.28,1.72],true,{markerLabel:'Take a picture',yaw:-2.7}),
    message:()=>spot('phone','Message home',[-2.45,.70,-.12],true,{...bed,markerLabel:'Phone'}),
    rest:()=>spot('rest','Turn in for the night',[-2.32,.83,-1.00],true,bed)
  }[stage];
  const list=main?[main()]:[];
  if(['settle','picture','message','rest'].includes(stage)){
    if(!state.flags.window)list.push(spot('window','Look out the window',[.44,1.94,-2.43],stage==='settle',{bounds:[-1.0,1.16,-2.65,1.23,2.42,-2.43]}));
    if(!state.flags.tea)list.push(spot('tea','Make a cup of tea',[2.92,1.14,.37],false,{bounds:[2.59,.6,.04,3.28,1.26,1.12]}));
    if(!state.flags.radiator)list.push(spot('radiator','Turn up the radiator',[.74,.58,-2.34],false,{bounds:[-.90,.12,-2.59,1.13,.76,-2.27]}));
  }
  return list;
}
function refresh(){
  const place=locationFor(state.stage);
  const chapter=CHAPTERS[state.chapter-1];
  const step=stepsById.get(state.stage);
  world.setState(state);world.setActions(actions());
  byId('objective').textContent=step?.objective||objectives[state.stage]||'';
  byId('clock').textContent=state.chapter===1
    ?(place==='airport'?'BER · 18:47':'Temporary room · 27 nights')
    :`${chapter.day} · ${placeNames[place]}`;
  byId('place').textContent=`${state.chapter} / 8 · ${chapter.title}`;
  byId('hud').hidden=place==='ride'||['landed','done','finished'].includes(state.stage);
}
function advance(next){
  state.stage=next;
  state.chapter=chapterFor(next);
  state.beat=0;
  if(locationFor(next)!==world.place){state.position=null;world.scene(locationFor(next),state);sound.setPlace(world.place);}
  refresh();remember();
}
const placeNames={airport:'Arrivals',ride:'Into Berlin',room:'Temporary room',home:'Your new room',street:'The neighbourhood',civic:'Bürgeramt',office:'At work',platform:'The station'};
const say=(speaker,text,choices)=>ui.dialogue({speaker,text,choices});

async function chapterWelcome(){
  if(!state.pendingChapter)return;
  const chapter=CHAPTERS[state.chapter-1];
  await ui.chapterCard({eyebrow:`Chapter ${chapter.number} of 8 · ${chapter.day}`,
    title:chapter.title,text:chapter.description,button:'Continue'});
  state.pendingChapter=null;
  remember();
}

async function enterStep(next){
  const changingChapter=chapterFor(next)!==state.chapter;
  const changingPlace=locationFor(next)!==world.place;
  if(changingChapter)state.pendingChapter=chapterFor(next);
  if(changingPlace)setBusy('On your way…');
  advance(next);
  try{await world.set.ready;}finally{setBusy();}
  await chapterWelcome();
}

const resolveText=value=>typeof value==='function'?value(state):value;

async function playLater(step){
  if(step.id==='c5_light')state.flags.returnedHome=true;
  if(step.id==='c6_tea')state.flags.newTea=true;
  world.setState(state);
  const seated=step.id==='c5_bench'||step.id==='c8_dinner';
  const originalSeat=world.set.seat;
  if(step.id==='c8_dinner')world.set.seat=world.set.dinnerSeat;
  try{
    if(seated)await world.pose(true);
    for(let index=state.beat;index<step.beats.length;index++){
      const beat=step.beats[index];
      let answer;
      if(step.id==='c8_message'&&index===1){
        answer=await ui.eveningMessages(state,world.dinnerPicture());
      }else if(step.id==='c7_return'){
        answer=await ui.phone({contact:'Amir',messages:[{speaker:'home',text:'Still okay for seven?'}],
          draft:'Yes. See you at home.',choices:[{label:'Send it and keep walking',value:'sent',text:'Yes. See you at home.'}]});
      }else{
        answer=await ui.dialogue({speaker:beat.speaker,text:resolveText(beat.text),
          choices:beat.choices,continueLabel:beat.continueLabel});
      }
      if(answer===undefined)return;
      if(beat.choiceKey)state.choices[beat.choiceKey]=answer;
      // These small tasks reuse the objects the player is standing beside.
      if(step.id==='c3_documents'&&index===0)await ui.documentFolder();
      if(step.id==='c7_sign'&&index===0)await ui.departureBoard();
      state.beat=index+1;
      world.setState(state);
      remember();
    }
  }finally{
    if(seated)await world.pose(false);
    world.set.seat=originalSeat;
  }
  if(step.id==='c8_light'){
    advance('finished');
    await new Promise(resolve=>setTimeout(resolve,world.reduced?0:1300));
    ending();
    return;
  }
  const next=LATER_STEPS[LATER_STEPS.indexOf(step)+1];
  await enterStep(next.id);
}

async function arrival(){
  await ui.phone({contact:'Home',messages:[{speaker:'home',text:'Landed?'},{speaker:'home',text:'Send us a picture when you get to the room.'}],draft:'Just landed. Going to find my suitcase.',choices:[{label:'Let them know you arrived',value:'sent',text:'Just landed. Going to find my suitcase.'}]});
  advance('bag');
}
async function ride(){
  await ui.dialogue({speaker:'AIRPORT → BERLIN',text:'The suitcase rests against your knee. The window turns into a mirror, then back into someone else’s street.\n\nYou check the address once more.',continueLabel:'Get off at your stop'});
  setBusy('Unlocking the room…');
  advance('drop');await world.set.ready;setBusy();
  await ui.dialogue({speaker:'TWENTY-SEVEN NIGHTS',text:'The key sticks. You lift the door a little, like the landlord showed you.\n\nThe room looks exactly like the listing. You hadn’t imagined how quiet it would be.',continueLabel:'Step inside'});
}
async function perform(key){
  if(locked||screen!=='play')return;
  locked=true;activateWorld(false);
  try{
    if(stepsById.has(key)){
      await playLater(stepsById.get(key));
      return;
    }
    switch(key){
      case 'landed': await arrival();break;
      case 'wrongBag': await say('BAGGAGE CLAIM','The same navy shell. You lift the tag with your thumb. Someone else’s name.');break;
      case 'bag':
        await ui.dialogue({speaker:'24.0 KG',text:'There’s the yellow ribbon. You remember someone at home pulling the knot tight, then checking it one more time.',continueLabel:'Lift it off the belt'});
        advance('ticket');break;
      case 'ticket':
        if(!state.flags.reunion){await say('ARRIVALS','Across the hall, someone drops their bag to hug the person waiting for them.\n\nYou take your phone out. Your address is still there.');state.flags.reunion=true;remember();}
        state.choices.language=await ui.ticketMachine();sound.chime();
        await say('ONE TICKET',state.choices.language==='de'?'You knew “ein”. You guessed the rest. The little printer whirs and there’s your ticket.':'The English button was in the corner. The little printer whirs and there’s your ticket.');
        advance('train');break;
      case 'train':advance('ride');await ride();break;
      case 'ride':await ride();break;
      case 'drop':
        await ui.dialogue({speaker:'YOUR SUITCASE',text:'The wheels stop rattling. You unzip the case. Tucked inside the blanket is the photograph everyone insisted you take.',continueLabel:'Take out the photograph'});
        advance('portrait');break;
      case 'photo':
        await world.pose(true,true);
        state.choices.placement=await say('THE FAMILY PHOTOGRAPH','Everyone squeezed together to fit in the frame. Someone was still laughing when it was taken.\n\nWhere will you keep it?',[{label:'Beside the bed',value:'bed'},{label:'On the desk',value:'desk'}]);
        await world.pose(false,true);advance('spices');break;
      case 'spice':
        await ui.dialogue({speaker:'A TASTE OF HOME',text:'Inside one plastic bag is another, and inside that, the spices. You can almost hear the person who packed them. “Otherwise all your clothes will smell.”',continueLabel:'Put them beside the stove'});
        state.unpacked.spices=true;advance('blanket');break;
      case 'blanket':
        await ui.dialogue({speaker:'THE OLD BLANKET',text:'This nearly stayed behind to make the weight limit. Now you smooth it over the bed and recognise one small corner of the room.',continueLabel:'Smooth out the last fold'});
        state.unpacked.blanket=true;advance('settle');break;
      case 'window':case 'tea':case 'radiator':{
        const detail={window:['THE COURTYARD','A kitchen window across the courtyard lights up. Someone is setting the table. You watch until the kettle in that kitchen starts to steam.'],tea:['THE KETTLE','Water. A cup. The little click when it boils.\n\nAt least one thing here sounds exactly the same.'],radiator:['THE RADIATOR','You turn the dial. For a few seconds, nothing. Then a quiet knock travels along the pipes and the metal warms beneath your hand.']}[key];
        await say(...detail);state.flags[key]=true;if(state.stage==='settle')advance('picture');else{refresh();remember();}break;
      }
      case 'picture':
        photos=world.pictures();state.choices.frame=await ui.framePicture(photos);sound.chime();advance('message');break;
      case 'phone':{
        photos??=world.pictures();const conversation=[{speaker:'home',text:`There you are, ${state.appearance.name}.`},{speaker:'home',text:state.choices.frame==='whole'?'I can see your suitcase. Leave the rest for tomorrow. How are you feeling?':'That lamp makes it look cosy. How are you feeling?'}];
        const reply=await ui.familyPhone({contact:'Home',messages:conversation,draft:'I got here. It’s quieter than I expected.',choices:[{label:'Send what you’re feeling',value:'honest',text:'I got here. It’s quieter than I expected.'},{label:'Reassure them for tonight',value:'reassure',text:'The room is nice. I’m just tired.'}]},photos[state.choices.frame]);
        await ui.goodnightMessages('Home',conversation,reply);state.choices.message=reply;advance('rest');break;
      }
      case 'rest':
        await world.pose(true,false);
        await ui.dialogue({speaker:'MONDAY · 09:00',text:'First day at work. You check the alarm twice. Across the courtyard, another window goes dark.',continueLabel:'Put the phone down'});
        advance('done');ending();break;
    }
  }catch(error){console.error(error);await say('A MOMENT','That moment was interrupted. You can try it again.');}
  finally{locked=false;if(screen==='play'&&!ui.isOpen()){activateWorld(true);byId('world').focus({preventScroll:true});}}
}
function ending(){
  activateWorld(false);byId('menu').hidden=true;
  if(state.stage==='finished'){
    ui.completeStory(state,()=>{ui.hide();openCreator();},()=>{ui.hide();title();});
    return;
  }
  ui.ending(state,async()=>{
    ui.hide();locked=true;
    try{await enterStep(LATER_STEPS[0].id);byId('menu').hidden=false;}
    catch(error){console.error(error);setBusy();await say('A MOMENT','The next place is taking a while to open. Your progress is saved. Please reload to continue.');title();}
    finally{locked=false;if(screen==='play'){activateWorld(true);byId('world').focus({preventScroll:true});}}
  },()=>{ui.hide();title();});
}
async function pause(){
  if(locked||screen!=='play'||ui.isOpen())return;
  locked=true;activateWorld(false);remember();
  const chapter=CHAPTERS[state.chapter-1];
  const answer=await say(`CHAPTER ${state.chapter} · ${chapter.title.toUpperCase()}`,'Your progress is saved. Take your time.',[{label:'Keep playing',value:'resume'},{label:'Back to title',value:'title'}]);
  locked=false;if(answer==='title')title();else{activateWorld(true);byId('world').focus();}
}
function title(){
  ui.hide();screen='title';locked=false;photos=null;world.suspended=false;world.title=true;activateWorld(false);world.setActions([]);
  world.scene('airport',newChapter(DEFAULT_APPEARANCE));byId('menu').hidden=true;byId('hud').hidden=true;byId('title-screen').hidden=false;byId('creator-root').hidden=true;byId('place').textContent='A month in Berlin';
  saved=store.load();byId('continue').hidden=!saved;byId('begin').disabled=false;byId('begin').classList.toggle('secondary',!!saved);
  byId('begin').firstChild.textContent=saved?'Start a new story ':'Begin story ';
  byId('continue').firstChild.textContent=saved?.stage==='finished'?'Your ending ':saved?.stage==='done'?'Continue to chapter two ':saved?`Continue chapter ${saved.chapter} `:'Continue ';
  byId('title-status').textContent='';byId('save-note').textContent='';
}
function openCreator(){
  ui.hide();screen='creator';world.suspended=true;activateWorld(false);byId('menu').hidden=true;byId('hud').hidden=true;byId('title-screen').hidden=true;byId('creator-root').hidden=false;
  closeCreator=showCreator(byId('creator-root'),state?.appearance||saved?.appearance||DEFAULT_APPEARANCE,{
    onCancel(){closeCreator?.();closeCreator=null;title();},
    onStart(profile){closeCreator?.();closeCreator=null;start(newChapter(profile));}
  });
}
async function start(next){
  screen='loading';state=next;photos=null;byId('title-screen').hidden=true;byId('creator-root').hidden=true;setBusy('Opening your chapter…');
  try{
    await world.useActor(state.appearance);world.title=false;world.suspended=false;
    world.scene(locationFor(state.stage),state,state.position);await world.set.ready;sound.setPlace(world.place);refresh();screen='play';remember();byId('menu').hidden=false;setBusy();
    if(state.stage==='done'||state.stage==='finished'){ending();return;}
    await chapterWelcome();
    if(state.stage==='landed'||state.stage==='ride'){await perform(state.stage);return;}
    activateWorld(true);byId('world').focus({preventScroll:true});
  }catch(error){console.error(error);setBusy();title();byId('title-status').textContent='Your character could not load. Please try again.';}
}
byId('menu').onclick=pause;
byId('begin').onclick=async()=>{
  if(saved&&saved.stage!=='finished'){
    const answer=await say('START AGAIN?','Starting a new story will replace the progress saved on this device.',[{label:'Keep my progress',value:'keep'},{label:'Start a new story',value:'new'}]);
    if(answer!=='new')return;
  }
  openCreator();
};
byId('continue').onclick=()=>{const checkpoint=store.load();if(checkpoint)start(checkpoint);};
byId('next-action').onclick=()=>{if(world.alternate)world.go(world.alternate);};
byId('act').onclick=()=>world.activate();byId('sound').onclick=async()=>{try{const on=await sound.toggle();byId('sound').textContent=on?'Sound on':'Sound off';byId('sound').setAttribute('aria-pressed',String(on));}catch{byId('sound').textContent='Sound unavailable';}};
window.addEventListener('pagehide',remember);document.addEventListener('visibilitychange',()=>{if(document.hidden){remember();sound.context?.suspend();}else if(sound.enabled)sound.context?.resume();});
try{
  world=new ChapterWorld(byId('world'),byId('markers'),{onAction:perform,onMenu:pause,onStop:remember,onPrompt:showPrompt,
    createScene(place,scene){return place==='room'||place==='home'?createStoryHome(scene,place==='home'):createLifeScene(THREE,scene,place);}
  });title();
}catch(error){console.error(error);byId('title-status').textContent='The 3D chapter needs WebGL 2. Open this preview in a current Safari, Chrome or Firefox browser.';}
