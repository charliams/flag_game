# Flag Reveal

A flag guessing game that works with no internet connection. Built for playing on a
phone on a plane.

A flag is hidden behind flat grey. Guess any country, and **wherever your flag has the
same colour in the same place as the hidden one, that part is uncovered** — for good.
Guess France against a flag with a white band down the middle and you uncover that
middle strip, not every white region on the flag. Matching the layout is what uncovers
ground, not merely sharing a colour. Guesses are unlimited.

197 flags: all 193 UN member states plus Vatican City, Palestine, Taiwan and Kosovo,
filterable to three difficulty tiers.

## Getting it onto your phone

**The reliable way — one file, no network ever.** Download `index.html` and save it to
your phone (AirDrop, email it to yourself, or save into Files/Drive and keep it
offline). Open it from the Files app and it plays. There is no server, no CDN, no font
to fetch and no `fetch` call anywhere in it — the whole game, artwork included, is that
one file. Progress and stats live in the browser's local storage.

**The nicer way — install it to your home screen.** Serve the repo over https (GitHub
Pages works: Settings → Pages → deploy from the default branch), open it on your phone
**once while you still have signal**, then Share → Add to Home Screen. A service worker
caches the page on that first visit, so it opens from the icon with no connection. Do
this before you get on the plane; an app that has never been opened online has nothing
cached.

Both can coexist — the same `index.html` is the file you save and the page Pages serves.

## How it works

Every flag is real SVG artwork from [flag-icons](https://github.com/lipis/flag-icons)
(MIT), so coats of arms, calligraphy and dragons are the genuine article rather than
approximations, and the board stays sharp at any size.

The reveal is **spatial**. Each flag is rasterised once onto a fixed 640×480 grid and
every cell sorted into one of eight broad colour families. A guess uncovers exactly the
cells where its family matches the hidden flag's family at the same position, and the
uncovered set accumulates across guesses. The board is drawn by painting the flag and
then masking it to those cells, so grey is simply the absence of paint.

Two consequences worth knowing about, since they are what keeps the game fair:

**Every flag shares one 4:3 canvas.** Real proportions would make the blank grey board a
different shape for a 2:1 flag than a 3:2 one, narrowing the answer before you have
guessed anything. Nepal's pennant is therefore drawn inside that canvas like everything
else.

**The colour families are deliberately coarse.** France's blue and the Netherlands' blue
are different hex values but must count as the same colour, or matching would turn on
shade differences no player can see. The thresholds in `classify()` are measured against
the actual artwork rather than guessed — `tools/colour-audit.mjs` prints the hue
distribution each family spans, and the comments in `src/render.js` record why each
boundary sits where it does. Two flags genuinely cannot be separated (Armenia's orange
sits on top of other flags' golds, Estonia's blue on top of other flags' pale blues);
both are noted in the code and neither changes much in play.

## Build

Plain HTML, CSS and JavaScript. No framework and no runtime dependencies.

```
src/render.js       artwork loading, colour classification, the spatial reveal
src/flag-art.js     GENERATED -- 197 optimised flag SVGs plus names and tiers
src/game.js         game state, guessing, stats
src/style.css       styles
src/template.html   shell with {{CSS}} / {{JS}} placeholders
build.mjs           inlines all of the above into index.html
index.html          the built, self-contained game (committed -- nothing to build to play)
tools/countries.mjs the country list: ids, display names, tiers, alternative names
sw.js, manifest.webmanifest, icons/   the installable-app pieces
```

```sh
npm install        # build and verification tools only
npm run build      # src/* -> index.html
npm run art        # regenerate src/flag-art.js from the flag-icons package
```

`npm run art` reads `tools/countries.mjs`, pulls each flag from `flag-icons` and runs it
through SVGO. Flags that are almost entirely one elaborate coat of arms get integer
coordinate precision rather than one decimal place: Serbia alone was 177 KB and a handful
of them were half the total, and at the size an emblem actually renders the difference is
invisible. That takes the set from 1278 KB to 707 KB.

## Verifying changes

```sh
npm run check                       # the three below, in order
node tools/verify.mjs               # the invariants, across all 197 flags
node tools/playtest.mjs             # plays a round at phone size over file://
node tools/offline-test.mjs         # caches, stops the server, reloads
node tools/contact-sheet.mjs             # build/sheet.png -- the artwork
node tools/contact-sheet.mjs --quantised # what the matching code actually sees
node tools/colour-audit.mjs              # hue/lightness of every major colour region
```

`verify.mjs` is the important one. For all 197 flags it checks the artwork loads, that a
board with nothing uncovered is one flat grey (so the blank board gives nothing away and
is identical for every flag), and that a flag matches itself in every cell. It then
checks the composite is spatially exact — mask half the board and the other half must be
untouched grey — and that shades of one colour classify together. It exits non-zero on
any failure.

`--quantised` is worth a look after changing `classify()`: it paints each flag as the
matcher sees it, which is how the two misfiled colours above were found.

## Simplifications, deliberately

- **Eight colour families**, used only for deciding whether two regions match: red,
  orange, yellow, green, light blue, blue, black and white. Maroon lands in red (Qatar,
  Latvia), copper in orange (Cyprus), purple in blue. The artwork itself is unaffected —
  Dominica's parrot is drawn in its real purple, it just matches as blue.
- **Afghanistan** is the black-red-green tricolour, the flag used at the UN and the
  Olympics, rather than the Islamic Emirate's white flag.
- Syria is the green-white-black flag with three red stars adopted in March 2025.

## Credits

Flag artwork from [flag-icons](https://github.com/lipis/flag-icons) by Panayiotis Lipiridis,
MIT licensed.
