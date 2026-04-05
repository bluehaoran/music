# Music Sketcher App — Concept Overview

## Purpose

A web app (PWA, Pixel 9 primary target) for quickly sketching out music — chords, arrangement, playback, and lyrics in a minimal UI.

**UI Inspiration:** Hichord, Telepathic Instruments Orchid — radically simple surfaces hiding deep functionality.

---

## Major Sections

### 1. Data Model & Music Theory Engine ✅ COMPLETE

- Song hierarchy: Song → Section → Part → Bar → BeatSlot
- Key signatures, Nashville number system mapping (major + minor)
- Chord construction: triads, 7ths, sus2, sus4, maj7, dom7, dim, aug, add9, min7b5
- Enharmonic spelling: key-appropriate (circle of fifths)
- Beat subdivision: explicit 16th-note tick system, default even split
- Rhythm (drum pattern): cascading override Song → Section → Part → Bar
- Transposition logic (capo is voicing-layer only)
- Pure TypeScript module, zero framework dependencies
- 81/81 unit tests passing
- **Files:** `src/theory/` — notes.ts, scales.ts, chords.ts, nashville.ts, transposition.ts, model.ts, beatSlots.ts, songFactory.ts, index.ts

### 2. React App Scaffolding ✅ COMPLETE

- Vite + TypeScript project setup
- PWA manifest + service worker
- React routing and layout
- Dexie.js schema and song repository
- Zustand or context/reducer for UI state (TBD)
- *Not yet started*

### 3. Audio Playback Engine ✅ COMPLETE

- Tone.js Transport + Sampler
- SoundFont-derived samples for guitar, piano, drum kit
- Drum pattern player (Strudel notation → Tone.js Sequence)
- BPM control + tempo presets
- *Not yet started*

### 4. Chord Input & Selection UI ✅ COMPLETE

- Select a Key (e.g. C Major)
- 7 Nashville number buttons for chords in that key
- Each button shows numeral + resolved chord name (e.g. "IV / F")
- Long-press popover for chord variants (sus2, sus4, maj7, dom7, etc.)
- Quick-push chords then press "loop" to play 1 bar each, looping
- *Not yet started*

### 5. Score / Arrangement Display & Editing ✅ COMPLETE

- Bar notation: `|: C | C | F G | G :|`
- `|:` and `:|` denote repeat markers
- Click on a bar to edit; long-press drag to resize beat slots (snaps to quarter/eighth/16th)
- **Structure hierarchy:**
  - **BeatSlot** → chord + tick position + duration
  - **Bar** → 1+ BeatSlots (total ticks = ticksPerBar)
  - **Part** → sequence of bars with repeat count (e.g. `x3`)
  - **Section** → named grouping of Parts (Intro, Verse, Chorus, Bridge, Interlude, Outro)
- *Not yet started*

### 6. Instrument & Voicing Management

- Toggle between guitar and piano
- Guitar: default open chord voicings (e.g. C = x-3-2-0-1-0)
- Long-press for variant voicings + chord diagram view
- Custom voicing input and save
- Capo setting: changes voicing diagrams only — no pitch effect
- *Not yet started*

### 7. Drum Patterns

- Bank of standard patterns per time signature
- Strudel notation: bd, sn, hh, oh, etc.
- Override at Song / Section / Part / Bar level
- *Not yet started*

### 8. Lyrics Alignment ✅ COMPLETE

- One lyric string per bar stored on the Bar (`Bar.lyric?: string`)
- `LyricsSheet` bottom-sheet editor: one textarea per section, pipe `|` delimiters align text to bars
- Lyrics previewed inline on bar cells in `ScoreView` (truncated, italic)
- ♪ button in editor meta bar opens the sheet
- Single-write batch save via `updateBarLyrics`

### 9. Import / Export

- **Export:** ChordPro format
- **Import:** ChordPro with heuristics for bar/section inference
- *Not yet started*

### 10. UI Improvements

- Introduce concept of "current" section.
- As default behaviour, create and edit "in-place", in the current section
- When chords are selected, automatically add them to the "current" section,
- When a section or its children is clicked on, set that section to "current".

- The Play button should play contextually. Default, play the entire song. If a section is selected, play that section. If a note or note alterative is selected, play should play just that chord so user can hear what it sounds like.

### 11. Recording / Loopback (DEFERRED — v2)

- Record audio through the app
- Replay recording in time with a loop

---

## Refinement Order

1. ✅ Data model & music theory engine
2. ✅React app scaffolding (Vite, PWA, Dexie, routing)
3. ✅Chord input UI
4. ✅Score display & editing
5. ✅Audio playback (Tone.js, SoundFont samples)
6. Instrument/voicing management & drum patterns
7. ✅ Lyrics alignment
8. Import/Export
