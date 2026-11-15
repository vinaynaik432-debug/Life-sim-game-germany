# 24 KILO — A New Life in Berlin

An eight-chapter 3D story about moving to Germany, finding a room, missing home, and making room for someone else. Create your character and follow their first month in Berlin.

[Play the game](https://vinaynaik432-debug.github.io/Life-sim-game-germany/)

Walk with WASD, the arrow keys, or a click or tap on the floor. The arrow near your feet points towards the next interaction. Press E or tap the interaction when you are close enough. Sound is optional.

Progress saves automatically in your browser on the current device and website. The public game and a localhost preview have separate saves.

## Run locally

From the repository folder, start a local web server.

```sh
python3 -m http.server 8765 --bind 127.0.0.1
```

Open http://127.0.0.1:8765/ in a WebGL 2 capable browser. On macOS, you can also double-click `24-Kilo-Game-Ready/chapter-one-3d/Play Arrivals.command`.

## Source and checks

The complete story lives in `24-Kilo-Game-Ready/chapter-one-3d/`. Shared room rendering and locally bundled Three.js files live in `24-Kilo-Game-Ready/movement-test/`. The dialogue interface uses `24-Kilo-Game-Ready/chapter-one/src/ui.js` and `ui.css`.

Run the save-state regression checks with Node.js.

```sh
node --test 24-Kilo-Game-Ready/chapter-one-3d/tests/*.test.mjs
```

Adding `?playtest=1` to the game URL keeps test progress in a separate save.

## Asset credits

Character models are adapted from Grab3D CC0 assets. The oak floor uses CC0 texture assets. Source and adaptation details are included in the two `assets` directories. Three.js is distributed under its included MIT license in `movement-test/vendor/LICENSE`.
