! version = 2.00

// This file tests topic inclusions and inheritence:
//
// includes: this means that the topic "includes" the triggers present
//           in another topic. Matching triggers in the source and included
//           topic are possible, and the *reply* in the source topic overrides
//           the reply in the included topic.
// inherits: all triggers in the source topic have higher matching priority than
//           all triggers in the inherited topic. So if the source topic has a
//           trigger of simply *, it means NO triggers can possibly match on the
//           inherited topic, because '*' goes higher in the match list.

// Aliases
! sub n = north
! sub w = west
! sub s = south
! sub e = east

// This gets us into the game.
+ rpg demo
- You're now playing the game. Type "help" for help.\n\n{topic=nasa_lobby}{@look}

// Global triggers available everywhere
> topic global
	+ help
	- Commands that might be helpful:\n\n
	^ look: Give a description of the current room.\n
	^ exits: List the exits of the current room.\n
	^ north, south, east, west, up, down: Go through an exit.\n
	^ inventory: Display your inventory.\n
	^ exit: Quit the game.

	+ inventory
	- Your inventory: <get inventory>

	+ exit
	- Logging out of the game...<set inventory=undefined><set spacesuit=0>{topic=random}

	+ _ *
	- You don't need to use the word "<star1>" in this game.

	+ *
	- I'm not sure what you're trying to do.

	// The following triggers get overridden on a room-by-room basis.
	+ look
	- There is nothing special in this room.

	+ exits
	- There are no exits to this room.

	+ north
	- You can't go in that direction.

	+ west
	- You can't go in that direction.

	+ south
	- You can't go in that direction.

	+ east
	- You can't go in that direction.

	+ up
	- You can't go in that direction.

	+ down
	- You can't go in that direction.
< topic

/////////////
// World Topics: all the "rooms" in our game inherit their triggers from these
// "world" topics. The world topics include the triggers from the global topic
/////////////

// Global triggers available on Earth
> topic earth includes global
	+ breathe
	- There is plenty of oxygen here so breathing is easy!

	+ what world (is this|am i on)
	- You are on planet Earth right now.
< topic

// Global triggers available on Mars
> topic mars includes global
	+ breathe
	- Thanks to your space suit you can breathe. There's no oxygen on this planet.

	+ what world (is this|am i on)
	- You are on planet Mars right now.
< topic

/////////////
// Earth rooms: all these rooms are on Earth and their inherit the earth topic
// above. This means you can type "breathe" and "what world is this?" from every
// room on Earth.
/////////////

// The NASA building on Earth
> topic nasa_lobby inherits earth
	// All of these triggers have higher matching priority than all other
	// triggers from the other topics, because this topic inherits a topic. So
	// the matching list looks like this:
	//   exits
	//   north
	//   look
	//   (combined triggers from earth & global)
	// Because our "north" is near the top of the match list, ours always gets
	// called. But if we try saying "south", we end up matching the "south" from
	// the global topic.
	+ look
	- You are in the lobby of a NASA launch base on Earth. {@exits}

	+ exits
	- There is an elevator to the north.

	+ north
	- {topic=elevator}{@look}
< topic

// Elevator in NASA building on earth
> topic elevator inherits earth
	+ look
	- You are in the elevator that leads to the rocket ship. {@exits}

	+ exits
	- Up: the path to the rocket\n
	^ Down: the NASA lobby

	+ up
	- {topic=walkway}{@look}

	+ down
	- {topic=nasa_lobby}{@look}
< topic

// Path to the rocket
> topic walkway inherits earth
	+ look
	- You are on the walkway that leads to the rocket. {@exits}

	+ exits
	- The rocket is to the north. The elevator is to the south.

	+ north
	- {topic=rocket}{@look}

	+ south
	- {topic=elevator}{@look}
< topic

// Rocket ship
> topic rocket inherits earth
	+ look
	- You are on the rocket. There is a button here that activates the rocket. {@exits}

	+ exits
	- The walkway back to the NASA base is to the south.

	+ south
	- {topic=walkway}{@look}

	+ (push|press) button
	- You push the button and the rocket activates and flies into outer space. The
	^ life support system comes on, which includes an anesthesia to put you to sleep\s
	^ for the duration of the long flight to Mars.\n\n
	^ When you awaken, you are on Mars. The space shuttle seems to have crash-landed.\s
	^ There is a space suit here.{topic=crashed}
< topic

// Crashed on Mars
> topic crashed inherits mars
	+ look
	- You are in the ruins of your space shuttle. There is a space suit here. The\s
	^ door to the shuttle is able to be opened to get outside.

	+ open door
	* <get spacesuit> == 1 => You open the door and step outside onto the red Martian surface.{topic=crashsite}{@look}
	- You can't go outside or you'll die. There's no oxygen here.

	+ (take|put on) (space suit|suit|spacesuit)
	* <get spacesuit> == 1 => You are already wearing the space suit.
	- You put on the space suit. Now you can breathe outside with this.<set spacesuit=1><set inventory=spacesuit>

	+ exits
	- The only exit is through the door that leads outside.
< topic

// Martian surface
> topic crashsite inherits mars
	+ look
	- You are standing on the red dirt ground on Mars. There is nothing but desert in all directions.

	+ exits
	- You can go in any direction from here; there is nothing but desert all around.

	+ north
	- {topic=puzzle1}{@look}

	+ east
	@ look

	+ west
	@ look

	+ south
	@ look
< topic

// Puzzle on Mars. The sequence to solve the puzzle is:
// north, west, west, north.
// Topic "puzzle" is a placeholder that sets all the directions to return
// us to the crash site. puzzle inherits mars so that puzzle's directions
// will override the directions of mars. All the steps of the puzzle then
// "include" puzzle, and override only one direction. e.g. since "west"
// exists in puzzle1, the response from puzzle1 is given, but if you're
// in puzzle1 and type "north"... north was included from "puzzle", but
// puzzle1 doesn't have a reply, so the reply from "puzzle" is given.

> topic puzzle inherits mars
	// Provides common directional functions for wandering around on Mars.
	+ north
	- {topic=crashsite}{@look}

	+ east
	- {topic=crashsite}{@look}

	+ west
	- {topic=crashsite}{@look}

	+ south
	- {topic=crashsite}{@look}
< topic

> topic puzzle1 includes puzzle
	+ look
	- You wander to a part of the desert that looks different than other parts of the desert.

	// We get 'exits' from crashsite

	+ west
	- {topic=puzzle2}{@look}
< topic

> topic puzzle2 includes puzzle
	+ look
	- This part looks even more different than the rest of the desert.

	+ west
	- {topic=puzzle3}{@look}
< topic

> topic puzzle3 inherits mars puzzle
	+ look
	- Now this part is even MORE different. Also there is a space colony nearby.

	+ north
	- {topic=entrance}{@look}
< topic

> topic entrance inherits mars
	+ look
	- You're standing at the entrance to a space colony. {@exits}

	+ exits
	- The entrance to the space colony is to the north.

	+ north
	- {topic=vaccuum}{@look}
< topic

> topic vaccuum inherits mars
	+ look
	- You're in the air lock entrance to the space colony. {@exits}

	+ exits
	- The inner part of the space colony is to the north. The martian surface is to the south.

	+ north
	- {topic=colony}{@look}

	+ south
	- {topic=vaccuum}{@look}
< topic

> topic colony inherits mars
	+ look
	- You've made it safely to the space colony on Mars. This concludes the game.

	+ exits
	- There are no exits here.

	+ *
	- This is the end of the game. There's nothing more to do.
< topic
