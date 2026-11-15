export const CHAPTERS = [
  {number: 1, title: 'Arrivals', day: 'Day one', description: 'One suitcase. A key for twenty-seven nights.'},
  {number: 2, title: 'Something for the Room', day: 'Day two', description: 'A warm paper bag. An unfamiliar word. Someone nearby.'},
  {number: 3, title: 'Your Number', day: 'Day five', description: 'A folder on your knees and a friend beside you.'},
  {number: 4, title: 'The Empty Seat', day: 'Week two', description: 'Learning the work is easier than joining the conversation.'},
  {number: 5, title: 'On the Way Back', day: 'Day fourteen', description: 'One difficult journey. A little time to find your feet.'},
  {number: 6, title: 'A Place for Your Name', day: 'Days eighteen to twenty-four', description: 'A new key. The same things from home.'},
  {number: 7, title: 'The Other Side of the Machine', day: 'Day twenty-seven', description: 'Someone else has only just arrived.'},
  {number: 8, title: 'Have You Eaten?', day: 'That evening', description: 'You are cooking for two.'}
];

export const LATER_STEPS = [
  {
    id: 'c2_bakery', chapter: 2, place: 'street', spot: 'bakery',
    label: 'Order breakfast', objective: 'Walk over to the bakery.',
    beats: [
      {
        speaker: 'THE BAKERY',
        text: 'You woke before the alarm. Now there is warm bread behind the glass and a sentence you have practised all the way here.\n\n“Ein Brötchen, bitte.”\n\nThe baker asks something much faster.',
        choiceKey: 'bakery',
        choices: [
          {label: '“Langsam, bitte?” Try again slowly', value: 'german'},
          {label: 'Point to the bread and ask for help', value: 'point'}
        ]
      },
      {
        speaker: 'A PAPER BAG',
        text: state => state.choices.bakery === 'german'
          ? '“Körner?” The baker points to the seeds, waits, then smiles when you nod.\n\nYou leave with breakfast and one more word than you arrived with.'
          : 'The baker follows your finger. “This one?”\n\nYou nod. They put it in a paper bag, still warm enough to hold with both hands.',
        continueLabel: 'Step back onto the street'
      }
    ]
  },
  {
    id: 'c2_chair', chapter: 2, place: 'street', spot: 'chair',
    label: 'Read the sign on the chair', objective: 'Look at the chair by the wall.',
    beats: [
      {
        speaker: 'ZU VERSCHENKEN',
        text: 'A wooden chair stands beneath a handwritten sign. You check it, then the windows above.\n\n“Free,” says a man carrying shopping bags. “You can take it. I walked past my first one three times.”',
        continueLabel: 'Introduce yourself'
      },
      {
        speaker: 'AMIR',
        text: state => `“I’m Amir. Second floor.”\n\n“${state.appearance.name}.” You gesture towards your building. “For twenty-seven nights.”\n\nHe puts his bags down. “Want a hand?”`,
        choiceKey: 'chairHelp',
        choices: [
          {label: 'Carry it together', value: 'together'},
          {label: 'Ask him to hold the doors', value: 'doors'}
        ]
      },
      {
        speaker: 'THE STAIRWELL',
        text: state => state.choices.chairHelp === 'together'
          ? '“Your end first.”\n\nYou both turn the same way. The chair catches on the corner. For a second you stare at each other. Then you laugh, and try the other way.'
          : 'Amir holds the door with his shoe. The chair catches on the corner.\n\n“Very elegant,” you say.\n\n“I wasn’t going to mention it.”',
        continueLabel: 'Bring it upstairs'
      }
    ]
  },
  {
    id: 'c2_place', chapter: 2, place: 'room', spot: 'chair',
    label: 'Find a place for the chair', objective: 'Make room for your new chair.',
    beats: [
      {
        speaker: 'SOMETHING OF YOUR OWN',
        text: 'One leg has a scuff. It rocks slightly until Amir finds a folded receipt in his pocket.\n\n“Where do you want it?”',
        choiceKey: 'chairPlacement',
        choices: [
          {label: 'By the desk, for writing home', value: 'desk'},
          {label: 'By the window, for morning tea', value: 'window'}
        ]
      },
      {
        speaker: 'HOME',
        text: 'You send a picture without moving anything out of the frame.\n\n“Did you buy that?”\n\n“No. Found it.”\n\nThree messages arrive asking whether you checked for loose screws.',
        continueLabel: 'Check the screws, just in case'
      }
    ]
  },
  {
    id: 'c2_invite', chapter: 2, place: 'room', spot: 'desk',
    label: 'Check your appointment', objective: 'Look at the appointment on your desk.',
    beats: [
      {
        speaker: 'THURSDAY · BÜRGERAMT',
        text: 'Amir notices the appointment printout.\n\n“I finish early that day. I can meet you outside.”\n\nYou read the address once more, then save his number. There is someone in your phone who lives two floors away.',
        choiceKey: 'appointmentCompany',
        choices: [
          {label: '“I’d like that. Thank you.”', value: 'accept'},
          {label: '“Could we check my papers first?”', value: 'prepare'}
        ]
      }
    ]
  },
  {
    id: 'c3_documents', chapter: 3, place: 'civic', spot: 'documents',
    label: 'Check the folder', objective: 'Check your papers in the waiting area.',
    beats: [
      {
        speaker: 'WAITING ROOM',
        text: state => state.choices.appointmentCompany === 'prepare'
          ? 'Amir helped you put the papers in order yesterday. You check them again anyway. Passport. Form. Confirmation from your host.\n\n“I brought an entire folder to my first appointment,” he says. “They needed three pages.”'
          : 'Passport. Form. Confirmation from your host. You count them again.\n\n“I brought an entire folder to my first appointment,” Amir says.\n\n“Did you need it?”\n\n“Three pages.”',
        continueLabel: 'Put the papers in order'
      },
      {
        speaker: 'NUMBER 128',
        text: 'The number on the screen matches the slip in your hand.\n\nAmir stands when you do. “Ready?”',
        continueLabel: 'Go to the desk'
      }
    ]
  },
  {
    id: 'c3_clerk', chapter: 3, place: 'civic', spot: 'clerk',
    label: 'Speak to the official', objective: 'Take your folder to the registration desk.',
    beats: [
      {
        speaker: 'AT THE DESK',
        text: 'The official asks a question and looks up from the screen. You catch “Adresse”. The rest runs together.',
        choiceKey: 'registration',
        choices: [
          {label: 'Ask them to repeat it slowly', value: 'slow'},
          {label: 'Ask Amir to help translate', value: 'amir'}
        ]
      },
      {
        speaker: 'YOUR SIGNATURE',
        text: state => state.choices.registration === 'slow'
          ? 'This time you hear it. The date you moved in.\n\nYou answer, pass over the host’s confirmation, and sign where the official points. The printer begins to whirr.'
          : '“They’re asking when you moved in,” Amir says quietly.\n\nYou give the date yourself, pass over the host’s confirmation, and sign where the official points. The printer begins to whirr.',
        continueLabel: 'Take the certificate'
      },
      {
        speaker: 'ANMELDUNG',
        text: state => `There is your name. ${state.appearance.name}. And this address, here in Berlin.\n\nYou take a photograph before putting the paper safely away.`,
        continueLabel: 'Find Amir outside'
      }
    ]
  },
  {
    id: 'c3_coffee', chapter: 3, place: 'civic', spot: 'coffee',
    label: 'Buy two coffees', objective: 'Thank Amir with a coffee.',
    beats: [
      {
        speaker: 'TWO COFFEES',
        text: 'Amir reaches for his wallet. You have already paid.\n\n“My turn.”\n\nYou stand with the hot cups until a booking reminder lights up your phone. Twenty-two nights left.',
        continueLabel: 'Ask about finding a room'
      },
      {
        speaker: 'AMIR',
        text: '“My first message was six paragraphs,” he says. “I thought they needed my whole life.”\n\n“Did it work?”\n\n“Eventually I made it shorter. Come on. Let’s try yours.”',
        continueLabel: 'Go home with a next step'
      }
    ]
  },
  {
    id: 'c3_application', chapter: 3, place: 'room', spot: 'desk',
    label: 'Write a room introduction', objective: 'Send your first room enquiry.',
    beats: [
      {
        speaker: 'A FEW LINES ABOUT YOU',
        text: 'Your name. Your new job. When you can move in. Amir reads over your shoulder.\n\n“Add one thing that sounds like you.”',
        choiceKey: 'introduction',
        choices: [
          {label: '“I like cooking for people.”', value: 'cooking'},
          {label: '“I like a quiet evening and a good book.”', value: 'quiet'}
        ]
      },
      {
        speaker: 'SENT',
        text: 'You attach the documents and read the message once more. Then you send it.\n\nAmir collects the empty cups. You leave the laptop open for a while.',
        continueLabel: 'Let the evening end'
      }
    ]
  },
  {
    id: 'c4_desk', chapter: 4, place: 'office', spot: 'desk',
    label: 'Read the note on your desk', objective: 'Settle in at your desk.',
    beats: [
      {
        speaker: 'THE SECOND WEEK',
        text: 'The work is starting to make sense. At the coffee machine, the conversation still moves too fast. You smile after everyone else has stopped laughing.\n\nOn your desk is a note. “Welcome! — Lena”',
        continueLabel: 'Keep the note'
      },
      {
        speaker: 'LENA',
        text: 'The woman from the next row of desks stops with a lunchbox in her hand.\n\n“We’re over there, if you want.” She points towards an empty chair.',
        continueLabel: 'Take a lunch break'
      }
    ]
  },
  {
    id: 'c4_lunch', chapter: 4, place: 'office', spot: 'lunch',
    label: 'Talk to Lena', objective: 'Meet Lena by the lunch table.',
    beats: [
      {
        speaker: 'THE EMPTY SEAT',
        text: 'You are hungry. You are also tired of concentrating on every sentence. Lena moves her bag off the chair.',
        choiceKey: 'lunch',
        choices: [
          {label: 'Sit with her for lunch', value: 'join'},
          {label: 'Say you need a quiet break today', value: 'quiet'}
        ]
      },
      {
        speaker: 'LENA',
        text: state => state.choices.lunch === 'join'
          ? 'You miss the beginning of a story about someone’s bicycle. Lena leans over. “He locked it to a fence they were removing.”\n\nThis time, you laugh with everyone else.'
          : '“Of course. I sometimes eat outside.” She points out the courtyard door. “It’s quiet there.”\n\nLater, she asks whether you found a spot in the sun.',
        continueLabel: 'Finish the working day'
      }
    ]
  },
  {
    id: 'c4_applications', chapter: 4, place: 'room', spot: 'desk',
    label: 'Check the housing replies', objective: 'Check your room enquiries.',
    beats: [
      {
        speaker: 'THREE EVENINGS',
        text: state => `Another introduction. An unanswered message. A viewing after work.\n\n${state.choices.chairPlacement === 'desk' ? 'The chair Amir helped you carry has become your place for waiting.' : 'You pull the chair over from the window to check your messages.'}\n\nThen the room you liked replies.`,
        continueLabel: 'Open the message'
      },
      {
        speaker: 'THE ROOM WITH THE BIG WINDOW',
        text: '“Thank you for coming. We’ve decided to offer the room to someone else.”\n\nYou had already imagined where the photograph would go.\n\nYour family group lights up with a picture of dinner.',
        continueLabel: 'Look at the photograph'
      }
    ]
  },
  {
    id: 'c4_home', chapter: 4, place: 'room', spot: 'phone',
    label: 'Answer home', objective: 'Take a moment with the message from home.',
    beats: [
      {
        speaker: 'DINNER AT HOME',
        text: 'Someone has made your favourite food. You enlarge the photograph until you can see the familiar bowl at the back.\n\n“You would have finished this by now,” the message says.',
        choiceKey: 'homeReply',
        choices: [
          {label: '“Save me some. I miss all of you.”', value: 'reply'},
          {label: 'Put the phone down and make food', value: 'cook'}
        ]
      },
      {
        speaker: 'A DIFFERENT MESSAGE',
        text: state => `${state.choices.homeReply === 'reply' ? '“We’ll make it again when you come,” they write.' : 'You put a pan on the stove. The familiar spice packet is still where you left it.'}\n\nLena has sent a message too. ${state.choices.lunch === 'join' ? '“Coffee tomorrow? I’ll tell you how he got the bike back.”' : '“Coffee tomorrow? The quiet courtyard kind.”'}`,
        continueLabel: '“Coffee sounds good.”'
      }
    ]
  },
  {
    id: 'c5_bench', chapter: 5, place: 'platform', spot: 'bench',
    label: 'Take a moment on the platform', objective: 'Find the bench. Take your time.',
    beats: [
      {
        speaker: 'ONE STOP TOO FAR',
        text: 'On the train, a passenger told you that people like you do not belong here. Someone nearby told him to leave you alone. He moved away.\n\nThe doors closed at your stop before you noticed. Now you are on the next platform, still holding your bag too tightly.',
        continueLabel: 'Let your shoulders drop'
      },
      {
        speaker: 'YOUR PHONE',
        text: 'An announcement passes overhead. You look at the draft you usually send.\n\n“Long day. Heading back now.”',
        choiceKey: 'coping',
        choices: [
          {label: 'Tell family what happened', value: 'family'},
          {label: 'Call Amir', value: 'amir'},
          {label: 'Keep it private and take a quiet walk', value: 'quiet'}
        ]
      },
      {
        speaker: 'A LITTLE TIME',
        text: state => ({
          family: 'You tell them in pieces. Nobody interrupts.\n\n“We’re here,” they say. “Do you want us to stay on the phone?”\n\nYou do.',
          amir: '“Do you want to talk?” Amir asks.\n\n“I don’t know what to say.”\n\n“That’s okay. I can stay on the phone while you walk.”',
          quiet: 'You send the short message, then put the phone away.\n\nYou loosen your grip on the bag. There is cool air coming down the stairs. You stay until you feel ready to move.'
        })[state.choices.coping],
        continueLabel: 'Stand when you are ready'
      }
    ]
  },
  {
    id: 'c5_walk', chapter: 5, place: 'platform', spot: 'exit',
    label: 'Take the way home', objective: 'Walk towards the station exit.',
    beats: [
      {
        speaker: 'ON THE WAY BACK',
        text: state => state.choices.coping === 'quiet'
          ? 'You recognise the street beyond the stairs. The bakery is closed, but its lights are still on. You take the quieter side of the road.'
          : state.choices.coping === 'amir'
            ? 'Amir tells you which corner he is standing on. He has put a jacket over his pyjamas.\n\nYou walk the last street together.'
            : 'For part of the walk, neither side says anything. The sound of someone washing dishes comes through the phone.\n\nYou keep walking towards your building.',
        continueLabel: 'Unlock your door'
      }
    ]
  },
  {
    id: 'c5_light', chapter: 5, place: 'room', spot: 'light',
    label: 'Turn on the lamp', objective: 'Switch on the light in your room.',
    beats: [
      {
        speaker: 'BACK IN YOUR ROOM',
        text: 'The photograph. The blanket. The chair with the folded receipt under its leg.\n\nYou leave your shoes by the door. There is nothing else you need to finish tonight.',
        continueLabel: 'Stay here for a while'
      }
    ]
  },
  {
    id: 'c6_viewing', chapter: 6, place: 'home', spot: 'door',
    label: 'Look around the room', objective: 'Meet the housemate at the new room.',
    beats: [
      {
        speaker: 'ANOTHER VIEWING',
        text: state => `Four days later, another person answers your message.\n\nThe kitchen is small. One cupboard handle is loose. ${state.choices.introduction === 'cooking' ? '“You said you like cooking,” the housemate says, showing you an empty shelf.' : '“You mentioned books,” the housemate says. “You’re welcome to borrow mine.”'}\n\nThey ask when you would need to move in.`,
        choiceKey: 'houseQuestion',
        choices: [
          {label: 'Ask about quiet evenings', value: 'quiet'},
          {label: 'Ask how they share the kitchen', value: 'kitchen'}
        ]
      },
      {
        speaker: 'THE HOUSEMATE',
        text: state => state.choices.houseQuestion === 'quiet'
          ? '“Mostly quiet. Tell us if the music carries.”\n\nThey wait while you look out of the window. You can imagine opening it in the morning.'
          : '“We take turns cleaning. Sometimes we cook together.”\n\nThey clear a forgotten mug from the shelf. “You’d have space for your things here.”',
        continueLabel: 'Thank them for showing you around'
      }
    ]
  },
  {
    id: 'c6_offer', chapter: 6, place: 'room', spot: 'suitcase',
    label: 'Read the room offer', objective: 'Open the message beside your suitcase.',
    beats: [
      {
        speaker: 'THREE DAYS LATER',
        text: '“We’d be happy for you to take the room. Would moving in on Saturday work?”\n\nYou read it twice, then check the date against your booking. Three nights to spare.',
        continueLabel: '“Saturday works. Thank you.”'
      },
      {
        speaker: 'PACKING AGAIN',
        text: state => `The blanket folds around the photograph. The spices go into two plastic bags again.\n\n${state.choices.chairHelp === 'together' ? 'Amir takes the same end of the chair. “Your end first?”' : 'Amir holds the door. “Still carrying it yourself?”'}\n\n“We’re better at this now,” you say.`,
        continueLabel: 'Carry the chair to the new place'
      }
    ]
  },
  {
    id: 'c6_name', chapter: 6, place: 'home', spot: 'door',
    label: 'Put your name by the door', objective: 'Add your name to the doorbell.',
    beats: [
      {
        speaker: 'YOUR NAME',
        text: state => `You write ${state.appearance.name} on the little paper strip. It takes two tries to slide it under the plastic.\n\nAmir presses the bell from outside.\n\nIt works.`,
        continueLabel: 'Let him in'
      }
    ]
  },
  {
    id: 'c6_unpack', chapter: 6, place: 'home', spot: 'photo',
    label: 'Unpack the familiar things', objective: 'Find a place for the family photograph.',
    beats: [
      {
        speaker: 'THE SAME PHOTOGRAPH',
        text: 'The blanket fits this bed too. The spices have their own shelf.\n\nYou unwrap the photograph. There is a small crease in one corner from all the travelling.',
        choiceKey: 'newPlacement',
        choices: [
          {label: 'Keep it beside the bed', value: 'bed'},
          {label: 'Put it on the desk', value: 'desk'}
        ]
      },
      {
        speaker: 'A MESSAGE FROM LENA',
        text: state => state.choices.lunch === 'join'
          ? '“New address! Congratulations. Coffee on Monday?”\n\nYou send a picture of the name by the bell. She replies with a row of clapping hands.'
          : '“Heard you found a place! Quiet courtyard coffee on Monday?”\n\nYou send a picture of the name by the bell. “Yes. I’ll bring something from the bakery.”',
        continueLabel: 'Put the last things away'
      }
    ]
  },
  {
    id: 'c6_birthday', chapter: 6, place: 'home', spot: 'phone',
    label: 'Join the birthday call', objective: 'Answer the call from home.',
    beats: [
      {
        speaker: 'THE BIRTHDAY TABLE',
        text: 'Someone carries the phone around the table. Faces lean in too close. Someone else shouts that you cannot hear them from the kitchen.\n\nYou can hear everything.',
        choiceKey: 'birthday',
        choices: [
          {label: 'Ask to see the cake', value: 'cake'},
          {label: 'Show them the new room', value: 'room'}
        ]
      },
      {
        speaker: 'AFTER THE CALL',
        text: state => `${state.choices.birthday === 'cake' ? 'The cake tilts dangerously towards the camera. Everyone laughs. You ask them to save you the corner piece.' : 'You turn the phone slowly. They spot the blanket immediately. “You brought it!”'}\n\nThen the call ends. The little room is quiet again. You keep holding the phone for a moment.`,
        continueLabel: 'Set the phone down'
      }
    ]
  },
  {
    id: 'c6_tea', chapter: 6, place: 'home', spot: 'tea',
    label: 'Put the kettle on', objective: 'Make yourself a cup of tea.',
    beats: [
      {
        speaker: 'THE LITTLE CLICK',
        text: 'You fill the kettle. Find a cup. Wait for the familiar click.\n\nYour new housemate knocks on the open door. “Making tea?”\n\nYou take down a second cup.',
        continueLabel: 'Make enough for two'
      }
    ]
  },
  {
    id: 'c7_groceries', chapter: 7, place: 'street', spot: 'groceries',
    label: 'Buy something for dinner', objective: 'Pick up groceries for Amir’s visit.',
    beats: [
      {
        speaker: 'DINNER FOR TWO',
        text: 'Amir is coming over at seven. You want to make something you used to eat at home.\n\nYou find the familiar ingredients, then stop by the produce outside.',
        choiceKey: 'ingredient',
        choices: [
          {label: 'Add mushrooms to try in the sauce', value: 'mushrooms'},
          {label: 'Add a pumpkin for a roasted side dish', value: 'pumpkin'}
        ]
      },
      {
        speaker: 'ON THE WAY BACK',
        text: 'At the station entrance, someone keeps returning to the first screen of the ticket machine. A suitcase rests against their leg.\n\nYou recognise the pause before they try again.',
        continueLabel: 'Walk over'
      }
    ]
  },
  {
    id: 'c7_machine', chapter: 7, place: 'platform', spot: 'machine',
    label: 'Offer a little help', objective: 'Approach the newcomer at the machine.',
    beats: [
      {
        speaker: 'THE OTHER SIDE OF THE MACHINE',
        text: 'They look from the screen to the signs above it, then back again. You set your shopping bag down.',
        choiceKey: 'helpApproach',
        choices: [
          {label: '“Would you like some help?”', value: 'ask'},
          {label: '“The language button is down here.”', value: 'show'}
        ]
      },
      {
        speaker: 'THE NEWCOMER',
        text: state => `“Yes, please. I only arrived today.”\n\n${state.choices.language === 'de' ? '“I tried to do it in German my first evening. Took me a while,” you say.' : '“I missed this button my first evening too,” you say.'}\n\nThey choose English. “I’m going to Hauptbahnhof.”`,
        choiceKey: 'ticketHelp',
        choices: [
          {label: 'Point out the destination and let them choose', value: 'guide'},
          {label: 'Read the ticket options together', value: 'together'}
        ]
      },
      {
        speaker: 'A TICKET IN THEIR HAND',
        text: state => `${state.choices.ticketHelp === 'guide' ? 'They find the destination, check the route and press the button. You wait while the ticket prints.' : 'You read the route together. They choose their ticket and press the button. The little printer whirs.'}\n\n“Which platform?”\n\nYou look up. “Let’s check.”`,
        continueLabel: 'Look at the departure board together'
      }
    ]
  },
  {
    id: 'c7_sign', chapter: 7, place: 'platform', spot: 'sign',
    label: 'Check the departure board', objective: 'Find the platform on the sign.',
    beats: [
      {
        speaker: 'HAUPTBAHNHOF →',
        text: 'The destination is on the board. You follow the arrow together.\n\n“Thank you,” they say. “I was starting to think I’d be here all evening.”\n\nYou remember holding an address on your phone, wondering the same thing.',
        continueLabel: 'Wish them a good first evening'
      }
    ]
  },
  {
    id: 'c7_return', chapter: 7, place: 'platform', spot: 'exit',
    label: 'Head home with the shopping', objective: 'Take your groceries home.',
    beats: [
      {
        speaker: 'AMIR',
        text: '“Still okay for seven?”\n\nYou pick up the shopping. Behind you, suitcase wheels rattle across the platform.\n\nYou type, “Yes. See you at home.”',
        continueLabel: 'Send it and keep walking'
      }
    ]
  },
  {
    id: 'c8_cook', chapter: 8, place: 'home', spot: 'meal',
    label: 'Cook dinner', objective: 'Use the spices you brought from home.',
    beats: [
      {
        speaker: 'THE SPICE PACKET',
        text: state => `You open the bag from your suitcase. The smell reaches you before the spoon does.\n\n${state.choices.ingredient === 'pumpkin' ? 'The pumpkin goes in beside the familiar dish, its edges beginning to brown.' : 'You add the mushrooms to the familiar sauce and taste it carefully.'}`,
        continueLabel: 'Give it one more stir'
      },
      {
        speaker: 'TWO PLACES',
        text: state => `${state.choices.newPlacement === 'desk' ? 'You move the photograph a little to make room for the plates.' : 'From beside the bed, the photograph catches the lamplight.'}\n\nYou pull the free chair up to the table. There is a knock at the door.`,
        continueLabel: '“Come in!”'
      }
    ]
  },
  {
    id: 'c8_dinner', chapter: 8, place: 'home', spot: 'chair',
    label: 'Share dinner with Amir', objective: 'Join Amir at the table.',
    beats: [
      {
        speaker: 'AMIR',
        text: 'He has brought dessert in a supermarket bag. You bring the food over and notice it has caught on the bottom of the pan.\n\n“It’s usually better than this.”\n\n“Good,” he says. “Then you’ll have to make it again.”',
        choiceKey: 'dinnerTalk',
        choices: [
          {label: 'Tell him about the newcomer', value: 'newcomer'},
          {label: 'Remember carrying the chair', value: 'chair'}
        ]
      },
      {
        speaker: 'OVER DINNER',
        text: state => state.choices.dinnerTalk === 'newcomer'
          ? '“Did you know the platform?” Amir asks.\n\n“No. We checked.”\n\nHe nods, reaching for more. “That’s usually how it goes.”'
          : '“I thought we’d leave it in the stairwell forever,” you say.\n\nAmir lifts one foot. The folded receipt is still under the chair leg.\n\n“Solid engineering.”',
        continueLabel: 'Stay for another helping'
      },
      {
        speaker: 'LATER',
        text: 'The dessert is too sweet. You both finish it. Amir finds his jacket, promises to send you the name of a shop, and says goodnight.\n\nTwo used plates are left on the table.',
        continueLabel: 'Close the door behind him'
      }
    ]
  },
  {
    id: 'c8_message', chapter: 8, place: 'home', spot: 'phone',
    label: 'Answer “Have you eaten?”', objective: 'Send a little of this evening home.',
    beats: [
      {
        speaker: 'HOME',
        text: '“Have you eaten?”\n\nYou look at the two plates and the chair pulled close to the table.',
        choiceKey: 'endingShare',
        choices: [
          {label: 'Send a picture of the plates', value: 'photo'},
          {label: 'Record a short voice message', value: 'voice'}
        ]
      },
      {
        speaker: 'WHAT YOU SEND',
        text: state => {
          const openWithHome = state.choices.message === 'honest' || state.choices.coping === 'family';
          const first = state.choices.endingShare === 'photo'
            ? 'You leave the crumbs in the picture. Under it, you write'
            : 'You hold the phone close and say';
          return `${first}\n\n“Yes. I had someone over.”\n\n${openWithHome ? '“Today was a good day.”' : '“It’s been harder than I’ve been telling you. Today was a good day.”'}\n\n“I wish we could have been there,” comes the reply.`;
        },
        choiceKey: 'lastReply',
        choices: [
          {label: '“Me too.”', value: 'meToo'},
          {label: '“Next time I’ll cook for you.”', value: 'nextTime'}
        ]
      },
      {
        speaker: 'HOME',
        text: state => state.choices.lastReply === 'nextTime'
          ? '“We’re holding you to that.”\n\nThen, “Goodnight.”\n\nYou send it back. “Goodnight.”'
          : '“We know.”\n\nThen, “Goodnight.”\n\nYou send it back. “Goodnight.”',
        continueLabel: 'Put the phone down'
      }
    ]
  },
  {
    id: 'c8_putaway', chapter: 8, place: 'home', spot: 'dishes',
    label: 'Wash the two plates', objective: 'Clear the table and put things away.',
    beats: [
      {
        speaker: 'THE END OF THE EVENING',
        text: 'You wash the plates and leave them side by side to dry.\n\nThe blanket goes over the bed. The empty suitcase slides underneath. Its yellow ribbon catches for a moment on the bed frame. You tuck it in carefully.',
        continueLabel: 'Leave everything ready for morning'
      }
    ]
  },
  {
    id: 'c8_light', chapter: 8, place: 'home', spot: 'light',
    label: 'Switch off the light', objective: 'Turn off the lamp when you are ready.',
    beats: [
      {
        speaker: 'GOODNIGHT',
        text: 'A tram passes outside. In the window, its light travels across the photograph, the chair and the edge of your old blanket.\n\nYour alarm is set.',
        continueLabel: 'Switch off the light'
      }
    ]
  }
];
