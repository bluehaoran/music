# Music Sketcher App — Key Decisions

A living document. Update as decisions are made during refinement.

---

## Decided

| # | Decision | Choice | Rationale | Date |
|---|----------|--------|-----------|------|
| 1 | Target device | Pixel 9 (PWA via Chrome) | Personal use, skip compatibility matrix | 2026-04-04 |
| 2 | UI framework | React + TypeScript (Vite) | Web stack; see infrastructure decisions | 2026-04-04 |
| 3 | Recording/loopback | Deferred to v2 | Reduce scope for initial build | 2026-04-04 |
| 4 | Export format | ChordPro | Widely supported standard for guitar chord notation | 2026-04-04 |
| 5 | Platform | Web app (PWA) | Eliminates native toolchain; Web Audio sufficient for scheduled playback | 2026-04-04 |
| 6 | Audio engine | Tone.js over Web Audio API | Handles transport, scheduling, samplers; replaces Oboe + FluidSynth + JNI | 2026-04-04 |
| 7 | Local persistence | IndexedDB via Dexie.js | Async structured storage; auto-save on every meaningful mutation | 2026-04-04 |
| 8 | Song naming | Auto-save with default "Song N" title | Allow explicit rename at any time | 2026-04-04 |
| 9 | Data model hierarchy | Song → Section → Part → Bar → BeatSlot | Sections have names (Verse, Chorus…); Parts have repeat counts | 2026-04-04 |
| 10 | Beat subdivision | Explicit tick-based (16th-note resolution), default even split | UI: long-press drag with snap; prefer quarter/eighth snap over 16th | 2026-04-04 |
| 11 | Rhythm (drum pattern) | Cascading override: Song → Section → Part → Bar | Each level may override; undefined = inherit from parent | 2026-04-04 |
| 12 | Capo behaviour | Voicing/audio layer only — no effect on pitch, chord names, or data model | Separate from transpose function | 2026-04-04 |
| 13 | Chord quality storage | Baked into the BeatSlot (e.g. IVsus4) | No separate override layer | 2026-04-04 |
| 14 | Enharmonic spelling | Key-appropriate (circle of fifths) | F major → Bb; G major → F#; minor keys use relative major's convention | 2026-04-04 |
| 15 | Score display | Both Nashville numeral + resolved chord name simultaneously | e.g. "IV / F" | 2026-04-04 |
| 16 | Scale modes (v1) | Major and minor only | Covers the vast majority of use cases | 2026-04-04 |
| 17 | Key changes | One global key per song | Out-of-key chords stored with explicit root+quality; displayed with accidental numeral (e.g. bVII) | 2026-04-04 |
| 18 | Time signature | One global time signature per song | No mid-song changes in v1 | 2026-04-04 |
| 19 | Lyrics model | One string per bar, stored on Bar | Pipe-delimited segments align to bars | 2026-04-04 |
| 20 | Slash chords | Deferred to v2 | No `bass` field in v1 data model | 2026-04-04 |

---

## Open — Needs Decision

### Song Library UI
- Does the app open to a song list, or directly to the last song?
- How is the library presented (list, grid, recents)?

### Specific SoundFont / Sample Set
- FluidR3 GM, MuseScore General, or other?
- Affects bundle size and instrument realism.

### State Management
- Zustand vs. React context/reducer for UI state?

---

## Parking Lot (ideas noted, not yet scoped)
- MIDI export
- Sharing songs between devices
- Metronome click track (separate from drum pattern)
- Strum pattern notation for guitar
- Dark mode / theme customisation
- Slash chords (G/B) — deferred to v2