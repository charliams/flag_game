# Flag Reveal

A flag guessing game that works with no internet connection. Built for playing on a
phone on a plane.

A flag is hidden behind flat grey. You guess a country; every colour its flag shares
with the hidden one is unlocked, and every part of the hidden flag painted in an
unlocked colour fills in with its real colour. Parts whose colour is still locked stay
grey. The design emerges piece by piece until you can name it. Guesses are unlimited.

197 flags: all 193 UN member states plus Vatican City, Palestine, Taiwan and Kosovo,
filterable to three difficulty tiers.

## Getting it onto your phone

**The reliable way — one file, no network ever.** Download `index.html` and save it to
your phone (AirDrop, email it to yourself, or save into Files/Drive and keep it
offline). Open it from the Files app and it plays. There is no server, no CDN, no
fonts to fetch and no `fetch` call anywhere in it — the whole game is that one 66 KB
file. Progress and stats are kept in the browser's local storage.

**The nicer way — install it to your home screen.** Serve the repo over https (GitHub
Pages works: Settings → Pages → deploy from the default branch), open it on your phone
**once while you still have signal**, then Share → Add to Home Screen. A service worker
caches the page on that first visit, so it opens from the icon with no connection. Do
this before you get on the plane; an app that has never been opened online has nothing
cached.

Both can coexist — the same `index.html` is the file you save and the page Pages serves.

## Playing

- **Colour chips** under the flag track every colour: ✓ it is in the answer, ✗ it is
  not, faded means no guess has tested it yet.
- **How many colours the answer has is never shown.** Working out whether the flag is
  finished is part of the puzzle — the chips let you establish it by elimination.
- **Tiers** (in *How & settings*): famous flags only, well-known flags, or all 197.

## How it is built

Plain HTML, CSS and JavaScript. No framework, no dependencies at runtime.

```
src/render.js          shape primitives → SVG, and the reveal/grey logic
src/flags.js           the 197 flag definitions
src/game.js            game state, guessing, stats
src/style.css          styles
src/template.html      shell with {{CSS}} / {{JS}} placeholders
build.mjs              inlines all of the above into index.html
index.html             the built, self-contained game (committed — nothing to build to play)
sw.js, manifest.webmanifest, icons/   the installable-app pieces
tools/                 verification scripts (see below)
```

After editing anything in `src/`, run:

```sh
node build.mjs
```

### Two things the design depends on

**Every flag is drawn on the same 60×40 canvas.** Real aspect ratios would make the
blank grey board a different shape for a 2:1 flag than a 3:2 one, which narrows the
answer before you have guessed anything. Nepal's pennant is therefore drawn as a shape
*inside* the canvas, and only appears once crimson is unlocked.

**Flags are never built from shapes that merely abut.** Two grey shapes sharing an
exact edge antialias into a faint hairline that would trace the whole design of an
unsolved flag. Every flag starts from a full-bleed background and layers on top of it,
and the band helpers overlap their neighbours deliberately. `tools/leak-check.mjs`
enforces this. If you add a flag, keep to that pattern.

### Verifying changes

```sh
node tools/leak-check.mjs        # proves an unsolved flag leaks nothing (exit 1 if it does)
node tools/contact-sheet.mjs     # renders every flag to build/sheet.png to check by eye
node tools/spot.mjs Canada Peru  # renders named flags large
node tools/playtest.mjs          # plays a round at phone size over file://
```

`leak-check.mjs` is the important one: it rasterises every flag with nothing unlocked
and fails if any pixel deviates more than 2/255 from flat grey, then unlocks each
colour in turn and fails if any colour the player has not earned appears. It needs
`npm install playwright` and Chromium.

## Simplifications, deliberately

- **Emblems are stand-ins.** Coats of arms, Arabic calligraphy and animals are drawn as
  simplified shapes in the right position — Mexico's eagle, Sri Lanka's lion and Egypt's
  are approximations. A stand-in never introduces a colour the real flag lacks, because
  a flag's colour set is what the game is played on.
- **Eight colours.** Everything is normalised to red, orange, yellow, green, light blue,
  blue, black and white. Maroon folds into red (Qatar, Latvia, Sri Lanka) and medium
  blues like Greece's read as blue — a colour you cannot confidently predict produces
  misses that feel unfair, which is the worst failure in a deduction game.
- One consequence: Dominica's sisserou parrot is really purple and Cyprus's island is
  really copper. There is no purple chip at all, so Dominica's parrot is drawn green and
  Cyprus's island orange. Nothing is lost from play — a colour that does not exist in
  the palette can never be guessed or missed — but the flags are not exact.
- **Afghanistan** is the black-red-green tricolour, the flag used at the UN and the
  Olympics, rather than the Islamic Emirate's white flag.
- Syria is the green-white-black flag with three red stars adopted in March 2025.
