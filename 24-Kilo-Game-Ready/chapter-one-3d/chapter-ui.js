import {StoryUI} from '../chapter-one/src/ui.js';
function node(tag,cls,text) {
  const el=document.createElement(tag);el.className=cls;if(text)el.textContent=text;return el;
}
export class ChapterUI extends StoryUI {
  ticketMachine() {
    const panel=this._mount('machine','Ticket machine');
    const render=language=>{
      panel.replaceChildren();
      const de=language==='de';
      panel.append(node('p','machine-line','Flughafen BER · Terminal 1–2'));
      if (!language) {
        panel.append(node('h2','machine-title','Fahrkarten'),node('p','machine-copy','Your finger hovers over the screen. Which language feels right tonight?'));
        const buttons=node('div','story-actions');
        buttons.append(this._button('Try it in German',()=>render('de')),this._button('Switch to English',()=>render('en'),true));panel.append(buttons);
      } else {
        panel.append(node('h2','machine-title',de?'Einzelfahrt':'Single ticket'));
        const route=node('div','ticket-route');route.append(node('span','','Flughafen BER'),node('span','ticket-to','↓'),node('strong','','Berlin Hauptbahnhof'));panel.append(route);
        panel.append(node('p','machine-copy',de?'1 Erwachsene Person · Berlin ABC':'1 adult · Berlin ABC'));
        panel.append(this._button(de?'Fahrkarte kaufen':'Buy ticket',()=>this._finish(language)));
      }
    };
    render(null);return this._promise();
  }
  framePicture(pictures) {
    const panel=this._mount('camera','Choose a photograph to send home');
    panel.append(node('p','story-eyebrow','A picture for home'),node('h2','camera-title','What do you let them see?'));
    const frames=node('div','camera-options');
    for (const [value,label] of [['whole','The whole room'],['tidy','The lamplit bed']]) {
      const button=this._button(label,()=>this._finish(value),true);
      const img=node('img','');img.src=pictures[value];img.alt=value==='whole'?'The room with your open suitcase on the floor':'A closer photograph of your bed';
      button.prepend(img);frames.append(button);
    }
    panel.append(frames);return this._promise();
  }
  familyPhone(options, attachment) {
    const result=this.phone(options);
    if (attachment) {
      const bubble=node('div','story-bubble story-bubble--player photo-bubble');
      const img=node('img','');img.src=attachment;img.alt='The photograph you sent home';bubble.append(img);
      this.root.querySelector('.story-messages').prepend(bubble);
    }
    return result;
  }
  async goodnightMessages(contact,conversation,reply) {
    return this.phone({contact,messages:[...conversation,{speaker:'player',text:reply==='honest'?'I got here. It’s quieter than I expected.':'The room is nice. I’m just tired.'},{speaker:'home',text:reply==='honest'?'I can stay on the phone while you unpack. We don’t have to talk.':'Get some sleep, then. Give us a ring tomorrow.'},{speaker:'home',text:'We miss you already.'}],draft:'Miss you too. Goodnight.',choices:[{label:'Say goodnight',value:'night',text:'Miss you too. Goodnight.'}]});
  }
  eveningMessages(state, picture) {
    const honest = state.choices.message === 'honest' || state.choices.coping === 'family';
    const words = 'Yes. I had someone over. ' + (honest
      ? 'Today was a good day.'
      : 'It’s been harder than I’ve been telling you. Today was a good day.');
    const sharingPhoto = state.choices.endingShare === 'photo';
    return this.familyPhone({
      contact: 'Home',
      messages: [
        {speaker: 'home', text: 'Have you eaten?'},
        {speaker: 'player', text: sharingPhoto ? words : `Your voice message\n“${words}”`},
        {speaker: 'home', text: 'I wish we could have been there.'}
      ],
      draft: 'Me too.',
      choices: [
        {label: '“Me too.”', value: 'meToo', text: 'Me too.'},
        {label: '“Next time I’ll cook for you.”', value: 'nextTime', text: 'Next time I’ll cook for you.'}
      ]
    }, sharingPhoto ? picture : null);
  }
  ending(state,onContinue,onTitle) {
    const panel=this._mount('end','Chapter one complete');
    panel.append(node('p','story-eyebrow','Chapter one · Arrivals'),node('h1','story-title','The first night.'),node('p','story-chapter-copy',`${state.appearance.name}, your alarm is set. Tomorrow you’ll learn the way to work. Tonight you know the way home.`));
    const recap=node('dl','story-recap');
    for(const [label,value] of [['The family photograph',state.choices.placement==='desk'?'On the desk':'Beside the bed'],['The picture you sent',state.choices.frame==='whole'?'The room as it was':'The lamplit bed'],['Your message home',state.choices.message==='honest'?'You told them how it felt':'You let them sleep easy']]){
      const row=node('div','story-recap-row');row.append(node('dt','',label),node('dd','',value));recap.append(row);
    }
    const actions=node('div','story-actions story-actions--end');actions.append(this._button('Continue to chapter two',onContinue),this._button('Back to title',onTitle,true));panel.append(recap,actions);
  }
  completeStory(state,onReplay,onTitle) {
    const panel=this._mount('end','24 KILO complete');
    panel.classList.add('story-finale');
    panel.append(
      node('p','story-eyebrow','24 KILO · A new life in Berlin'),
      node('h1','story-title','A little more at home.'),
      node('p','story-chapter-copy',`You arrived with twenty-four kilos. Tonight, ${state.appearance.name}, there are two clean plates by the sink and a familiar way home.`)
    );
    const memories=[
      ['Amir',state.choices.chairHelp==='together'?'You carried the chair together. Tonight he stayed for dinner.':'He held the doors. Tonight you opened yours for him.'],
      ['Lena',state.choices.lunch==='join'?'She made room at the lunch table. You stayed to hear the story.':'She remembered the quiet courtyard. Coffee is on Monday.'],
      ['The newcomer',state.choices.helpApproach==='show'?'You showed them the button you once searched for.':'You stopped, asked, and found the way together.']
    ];
    const recap=node('dl','story-recap');
    for(const [label,value] of memories){
      const row=node('div','story-recap-row');
      row.append(node('dt','',label),node('dd','',value));
      recap.append(row);
    }
    const reply=node('p','story-last-message',state.choices.lastReply==='nextTime'?'“Next time I’ll cook for you.”':'“Me too.”');
    const actions=node('div','story-actions story-actions--end');
    actions.append(this._button('Start a new story',onReplay),this._button('Back to title',onTitle,true));
    panel.append(recap,reply,actions);
  }
  documentFolder() {
    const panel=this._mount('folder','Check your documents');
    panel.append(
      node('p','story-eyebrow','Waiting room · Your folder'),
      node('h2','activity-title','Everything you brought.'),
      node('p','activity-copy','Take out each paper and check it once more.')
    );
    const cards=node('div','document-cards');
    const detail=node('p','document-detail','Amir waits beside you while you open the folder.');
    detail.setAttribute('aria-live','polite');
    const progress=node('p','activity-progress','0 of 3 papers checked');
    progress.setAttribute('role','status');
    const checked=new Set();
    const finish=this._button('Put the folder away',()=>this._finish(true));
    finish.disabled=true;
    const papers=[
      {key:'passport',title:'Passport',subtitle:'The familiar photograph',detail:'Your photograph. Your name. The edges have softened from being taken out and put away so often.'},
      {key:'form',title:'Registration form',subtitle:'The page you filled in',detail:'Your new address, written carefully in the boxes. You trace it with a finger. The same address that brought you here.'},
      {key:'host',title:'Host confirmation',subtitle:'The paper from your host',detail:'The confirmation your host gave you is tucked behind the form. You nearly left it on the desk this morning.'}
    ];
    for(const paper of papers){
      const card=this._button('',()=>{
        checked.add(paper.key);
        card.classList.add('checked');
        card.setAttribute('aria-pressed','true');
        mark.textContent='Checked';
        detail.textContent=paper.detail;
        progress.textContent=checked.size===papers.length?'All three are here. You can close the folder.':`${checked.size} of ${papers.length} papers checked`;
        finish.disabled=checked.size!==papers.length;
      },true);
      card.classList.add('document-card');
      card.setAttribute('aria-pressed','false');
      const mark=node('span','document-mark','Check');
      card.append(node('strong','document-name',paper.title),node('span','document-subtitle',paper.subtitle),mark);
      cards.append(card);
    }
    const actions=node('div','story-actions activity-actions');
    actions.append(progress,finish);
    panel.append(cards,detail,actions);
    return this._promise();
  }
  departureBoard() {
    const panel=this._mount('departures','Find the train to Hauptbahnhof');
    panel.append(
      node('p','story-eyebrow','Abfahrten · Departures'),
      node('h2','activity-title','Which platform?'),
      node('p','activity-copy','You and the newcomer look for Hauptbahnhof on the board.')
    );
    const board=node('div','departure-board');
    const header=node('div','departure-heading');
    header.append(node('span','','Destination'),node('span','','Departs'),node('span','','Platform'));
    board.append(header);
    const feedback=node('p','departure-feedback','Read the destination, then choose its row.');
    feedback.setAttribute('role','status');
    const finish=this._button('Show them the way to platform 2',()=>this._finish(2));
    finish.hidden=true;
    const trains=[
      {destination:'Alexanderplatz',time:'3 min',platform:1},
      {destination:'Berlin Hauptbahnhof',time:'5 min',platform:2},
      {destination:'Flughafen BER',time:'9 min',platform:3}
    ];
    for(const train of trains){
      const row=this._button('',()=>{
        if(train.platform!==2){
          feedback.textContent=`That train goes to ${train.destination}. You look together for Hauptbahnhof.`;
          return;
        }
        row.classList.add('correct');
        row.setAttribute('aria-pressed','true');
        feedback.textContent='Hauptbahnhof. Gleis 2. You both follow the same arrow.';
        finish.hidden=false;
        finish.focus({preventScroll:true});
      },true);
      row.classList.add('departure-row');
      row.setAttribute('aria-label',`${train.destination}, ${train.time}, platform ${train.platform}`);
      row.setAttribute('aria-pressed','false');
      row.append(node('strong','departure-destination',train.destination),node('span','departure-time',train.time),node('span','departure-platform',`Gleis ${train.platform}`));
      board.append(row);
    }
    panel.append(board,feedback,finish);
    return this._promise();
  }
}
