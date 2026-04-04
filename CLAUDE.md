# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is **Unchorded**, a Music Sketcher web app (PWA) for quickly sketching out music — chords, arrangement, playback, and lyrics.

**Primary target device:** Pixel 9 (Chrome/PWA), but works on any modern browser.

## Current State

**✅ Complete:**

- Music theory engine in `src/theory/` (81/81 tests passing)
- Core data model: Song → Section → Part → Bar → BeatSlot
- Nashville number system, chord construction, transposition, enharmonic spelling
- Beat subdivision with explicit 16th-note tick system
- React app scaffolding (Vite + TypeScript + React)
- PWA configuration (vite-plugin-pwa configured)
- Core dependencies installed: Tone.js, Dexie.js, Zustand
- Directory structure: `src/app/`, `src/ui/`, `src/audio/`, `src/data/`, `src/theory/`

**🚧 Next Steps:**

- Dexie.js schema definition and database setup
- Tone.js audio engine implementation
- React UI components (chord input, score display, etc.)

## Architecture

### Module Structure

- **`src/theory/`** — Pure TypeScript music theory engine. Zero framework dependencies. Fully unit-testable.
  - Files: note.ts, scales.ts, chords.ts, nashville.ts, transposition.ts, model.ts, beatSlots.ts, songFactory.ts
  - Exports: Note, Scale, Chord, Key, Song, Section, Part, Bar, BeatSlot, transposition utilities

- **`src/app/`** — React application shell, routing, global layout

- **`src/ui/`** — React components organized by feature area

- **`src/audio/`** — Audio playback engine
  - Tone.js Transport with BPM and time signature
  - Theory engine resolves chords → MIDI note arrays
  - Scheduler maps bars → Tone.Part events
  - Tone.Sampler loads SoundFont-derived samples (guitar, piano, drums)
  - No native code; runs entirely in Web Audio API

- **`src/data/`** — Persistence layer
  - Dexie.js schema for songs, voicings, settings
  - Auto-save on every meaningful mutation
  - ChordPro export/import with bar/section inference

### Audio Engine Integration Path

1. Initialize Tone.js Transport with BPM and time signature
2. Music theory engine resolves chords to MIDI note arrays
3. Scheduler maps bars → Tone.Part events with note-on/note-off times
4. Tone.Sampler loads SoundFont-derived samples
5. Transport.start() begins looping playback; Transport.stop() halts it

### Key Architectural Decisions

**Data Model Hierarchy:**

- Song → Section → Part → Bar → BeatSlot
- Sections have names (Intro, Verse, Chorus, Bridge, Interlude, Outro)
- Parts have repeat counts (e.g. `x3`)
- BeatSlots contain chord + tick position + duration

**Beat Subdivision:**

- Explicit tick-based system with 16th-note resolution
- Default: even split of beats
- UI: long-press drag with snap to quarter/eighth/16th

**Rhythm (Drum Patterns):**

- Cascading override: Song → Section → Part → Bar
- Strudel notation (bd, sn, hh, oh)
- Parsed into Tone.js Sequence/Part events

**Chord Quality:**

- Baked into BeatSlot (e.g. IVsus4)
- Supported: triads, 7ths, sus2, sus4, maj7, dom7, dim, aug, add9, min7b5

**Enharmonic Spelling:**

- Key-appropriate via circle of fifths
- F major → Bb; G major → F#
- Minor keys use relative major's convention

**Capo Behavior:**

- Affects voicing/audio layer only
- No effect on pitch, chord names, or data model
- Separate from transpose function

**Persistence:**

- IndexedDB via Dexie.js (local-only)
- Auto-save on every meaningful mutation
- Default song naming: "Song N" with explicit rename option

**Scope Limits (v1):**

- One global key per song (out-of-key chords use explicit root+quality, displayed with accidental numeral like bVII)
- One global time signature per song
- Major and minor scales only (no modes)
- No slash chords (deferred to v2)
- Recording/loopback deferred to v2

## Testing

```bash
# Run all tests
bun test

# Watch mode
bun test --watch

# Run specific test file
bun test src/theory/theory.test.ts
```

The music theory engine has 81 passing unit tests. New UI components should include tests using @testing-library/react.

## Development Workflow

**Dev server:**

```bash
bun dev
# Access from Pixel 9 via local network at http://<local-ip>:5173
```

**Lint:**

```bash
bun lint
```

**Build:**

```bash
bun make
# TypeScript compilation + Vite build
# Output to dist/ for static hosting
```

**Preview production build:**

```bash
bun preview
```

## Important Instructions

- Always use `bun` and `bunx` instead of `npm` and `npx`
- Use `bun test` instead of `jest`
- Conserve token usage where possible.
  - e.g. provide user with a step-by-step list of instructions to follow to install tooling

## Important Context

- The core use case is **scheduled chord playback**, not live instrument performance — Web Audio latency is sufficient
- The theory engine is already complete and battle-tested (81 passing tests)
- UI inspiration: Hichord, Telepathic Instruments Orchid (radically simple surfaces hiding deep functionality)

## Reference Documentation

See `docs/` for detailed decisions:

- `docs/infrastructure-decisions.md` — Full technology stack rationale
- `docs/music-app-concept-overview.md` — Feature overview and refinement order
- `docs/music-app-key-decisions.md` — Decision log for data model, UX, and scope
