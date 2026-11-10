Concept art extracted from the official *SteamDreams: Lab & Workshop — Project Pitch* PDF.

| File | Use |
|---|---|
| `cover-heroes.png` | Cover art (page 1) |
| `env-workshop.png`, `env-office.png` | Retired. They were the blended interior band on page 2 until the day/night pair replaced it; kept because the archived `index-v1-brass.html` still shows them |
| `workshop-day.png`, `workshop-night.png` | The page-2 band: one room painted twice. Split from `art-src/workshop-day-night.png` by `python tools/make_env.py`, which finds the seam in the pixel data and cuts both halves to the same size so they register under the cross-fade |
| `vexor.png`, `tinkel.png`, `grindel.png` | Cast sheets. Slides 1-3 of the page-3 reel, at 1.57:1. Shown as style samples, uncaptioned — the reel is not a cast list |
| `steambots-lineup.png` | Steambot studies. Slide 4 of the page-3 reel, at 2.25:1. It also ran as a cropped strip on page 4 until the reel made the strip redundant |
| `steambots-core.png` | Chassis and core studies. Slide 5 of the reel, same story as the lineup |
| `ui-mood.png` | Unused — kept for reference only |

Steam textures are generated, not concept art. Regenerate with `python tools/make_steam.py`, which reports each file's border alpha (it must be 0, or the texture's bounding box prints as a grey rectangle).

| File | Use |
|---|---|
| `steam-plume-a/b/c.png` | Rising plumes — cover, and the workshop band on page 2 |
| `steam-corner-a/b.png` | Corner creep. Mirrored on either axis and rescaled to seep from all eight page corners, behind the cards |
| `steam-wisp-a/b.png` | Thin drifting streaks for mid-page trims |
| `steam-haze.png` | Shallow floor bank; its bottom edge is deliberately open, so it only works run off a trim |

## `ui/` — journal furniture and logo

Cut from the game's own UI, lettering and logo sheets in `art-src/` by `python tools/make_ui.py`. The sources are breakdown sheets painted on solid black (journal, lettering) or flat grey (logo), several elements to a sheet, so the script keys the backdrop out, cuts each element and writes the files below. Don't hand-edit them; edit the script.

| File | Use |
|---|---|
| `journal-page.png` | The parchment card behind every text block. Sliced by CSS `border-image` with `156 101 107 128 fill`, so a card is as tall as its copy and the corners never stretch |
| `tagline.png` | The cover strapline, hand-lettered. Commissioned art, not from the pitch PDF, and not typeset — it replaces the line the cover used to set in Anton |
| `rod-vial.png`, `rod-lit.png` | The clasp over the welcome card's top edge, bulb dark and bulb lit. Same canvas, so the pair cross-fades in register as the reader scrolls; print shows the lit one. It is the only clasp left — every other heading is on a nameplate |
| `rod-bellows.png` | Alternate bellows clasp, currently unused |
| `plate.png` | Brass nameplate. The painted glyphs are repainted out so it can carry our own type: it heads every card except the welcome one, hung across the card's top edge |
| `stamp.png` | Wax seal, lifted off the journal page so it can be placed deliberately — it sits on the welcome card that opens page 2 |
| `chain-1/2/3.png` | Linkage plates, currently unused — they closed the page foot, which is gone |
| `logo-horizontal.png` | Cover title lockup: STEAM · emblem · DREAMS, centred at the top of the cover |
| `logo-stacked.png` | Alternate stacked lockup, currently unused |
| `logo-emblem.png` | Emblem on its own, currently unused — it was the mark in the page foot |
