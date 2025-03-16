Please create a game using vanilla js, three.js, and html canvas.

The game should be in the style of Pokemon, with an overhead view, and retro pixel cozy game aesthetics.

The player should be looking at a map from overhead (bird's eye view), looking down at a peaceful field of grass, trees, sand, water, and other natural features. There should be grid borders around each "cell" of the world that are clickable by the player.

The gameplay involves the human player against the computer. The computer is an evil black mold which is trying to take over the world. Every so often the computer will spawn a black mold spot that covers up one cell of the gameboard (one part of the world). These mold spots should occur every so often.

The player's job is to defeat the mold and save humanity. If the player clicks on the slime mold, it will turn back into the original state (grass, water, sand, tree, etc. -- whatever the original state was).

If mold is left untouched, it should grow in size to neighboring cells. The larger a mold patch, the faster it should grow (exponential growth).

There should be a scoreboard container at the top which shows how many mold spots have been defeated, and how many mold spots are active in the world