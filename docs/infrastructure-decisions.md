# Music Sketcher App — Infrastructure Decisions Summary

**Date:** 4 April 2026 | **Status:** Decided
**Revision:** Migrated from native Android to web app (same date)

---

## Overview

This document records the infrastructure and tooling decisions for the Music Sketcher web app. These supplement the earlier decisions (target device, export format, recording deferral) already captured in the project's key decisions document.

The original plan was a native Android app using Kotlin, Jetpack Compose, Oboe, and FluidSynth with JNI bindings. After review, the project was moved to a web stack. The core use case — scheduling and looping chord playback, not live instrument performance — does not require native audio latency. The web stack eliminates cross-compilation, JNI glue code, and NDK toolchain setup while gaining cross-device access for free.

---

## Technology stack

### Application layer

- **Language:** TypeScript
- **UI framework:** React (Vite scaffold)
- **Persistence:** IndexedDB via Dexie.js — local-only, auto-save
- **Architecture:** Single-page app, React state management (zustand or built-in context/reducer — TBD)
- **Deployment target:** PWA installed to Pixel 9 home screen (also works in any modern browser)

### Audio layer

- **Scheduling & output:** Web Audio API (AudioContext)
- **Synthesis library:** Tone.js — wraps Web Audio with transport, scheduling, synths, and sampler instruments
- **Sound data:** SoundFont samples loaded via Tone.Sampler or a lightweight sf2 loader (e.g. webaudiofont). Hosted as static assets (~10–30 MB depending on instrument set).
- **Integration:** Music theory engine outputs MIDI-like events (note, velocity, time). Tone.js Transport schedules them against the AudioContext clock. No native code, no bridging layer.

### Drum patterns

- **Notation:** Strudel-style shorthand (bd, sn, hh, oh) remains the authoring format
- **Playback:** Parsed into Tone.js Sequence/Part events mapped to drum sample buffers
- **Option:** Strudel itself can run in-browser as a JS library if deeper pattern language support is wanted later

### Build and tooling

- **IDE:** VS Code on Windows 11
- **Runtime:** Node.js (current LTS)
- **Build system:** Vite
- **Package manager:** npm
- **Deployment (dev):** Vite dev server, accessed on Pixel 9 via local network (same Wi-Fi)
- **Deployment (prod):** Static build hosted on any static host (Vercel, Netlify, GitHub Pages, or self-hosted). PWA manifest + service worker for offline install.

---

## Decision log (revised)

This replaces the previous Android-specific decision log. Numbering continues from #4 in the key decisions document.

| # | Decision | Choice | Rationale |
|---|----------|--------|-----------|
| 5 | Platform | Web app (PWA) | Eliminates native toolchain (NDK, CMake, JNI). Web Audio API provides sufficient latency for scheduled playback. Runs on Pixel 9 and any other device. |
| 6 | Development environment | VS Code on Windows 11 | Lightweight, fast reload via Vite. No SDK/NDK management needed. |
| 7 | UI framework | React (TypeScript, Vite) | Component model suits the chord input / score editing UI. Large ecosystem. Vite gives fast HMR. |
| 8 | Audio engine | Tone.js over Web Audio API | Handles transport, scheduling, synths, samplers. Replaces Oboe + FluidSynth + JNI with a single npm dependency. |
| 9 | Audio instrument sounds | SoundFont samples via Tone.Sampler or webaudiofont | Same GM instrument coverage as the native plan. Loaded as static audio files, no binary compilation. |
| 10 | Local persistence | IndexedDB via Dexie.js | Async, structured storage in the browser. Handles song library, voicings, settings. No server needed. |
| 11 | Deployment (dev) | Vite dev server over local Wi-Fi | Access from Pixel 9 browser at `http://<local-ip>:5173`. Hot reload on save. |
| 12 | Deployment (prod) | Static hosting + PWA | Service worker enables offline use. PWA install puts the app on the Pixel 9 home screen with no browser chrome. |

---

## Architecture notes

### Module structure

The project uses a src-level folder structure (single package, logical modules):

- **`src/app/`** — React entry point, routing, layout
- **`src/ui/`** — React components: chord input, score display, lyrics editor, settings
- **`src/theory/`** — Pure TypeScript music theory engine (keys, chords, Nashville numbers, transposition). No framework dependency. Fully unit-testable.
- **`src/audio/`** — Audio engine: Tone.js transport, instrument loading, MIDI event scheduling, drum pattern player
- **`src/data/`** — Dexie.js schema, repositories, import/export (ChordPro)

### Audio engine integration path

1. Initialise Tone.js Transport with BPM and time signature
2. Music theory engine resolves chords to MIDI note arrays
3. Scheduler maps bars → Tone.Part events with note-on/note-off times
4. Tone.Sampler loads SoundFont-derived samples for guitar, piano, drum kit
5. Transport.start() begins looping playback; Transport.stop() halts it

No native code. No bridging layer. The entire audio path runs in the browser's audio thread via Web Audio API, which on Chrome Android uses the same AAudio backend that Oboe targets.

### Why web instead of native Android

The original plan required: Kotlin, Jetpack Compose, Room, Oboe (C++), FluidSynth (C), JNI bindings, CMake, Android NDK, SoundFont asset bundling, and wireless ADB deployment. The web stack replaces all of this with TypeScript, React, Tone.js, and Dexie.js.

The key insight: this app schedules playback of chord loops, it does not need sub-10ms touch-to-sound latency for live performance. Web Audio's scheduling model is sample-accurate for pre-planned events. Chrome on Android routes audio through AAudio, so the actual output path is the same.

What the web stack trades away: slightly less control over audio capture (relevant for the deferred v2 recording feature) and no truly native app-store presence (irrelevant for personal use). What it gains: dramatically simpler build pipeline, cross-device access, faster iteration, and the theory engine written in the same language as the UI.

---

## Device compatibility

- **Primary target:** Pixel 9, Chrome browser (or PWA)
- **Also works:** Any device with a modern browser (Chrome, Firefox, Safari 17+)

No SDK version targeting needed. The Web Audio API and AudioContext are supported across all modern browsers. PWA install-to-home-screen works on Chrome Android out of the box.

---

## Remaining open decisions

These items from the key decisions document are unaffected by the platform change and remain open:

- Data model: canonical song representation and beat subdivision granularity
- Persistence UX: auto-save vs. manual save, song library screen
- Capo behaviour: whether capo transposes displayed chord names or only voicing diagrams
- Specific SoundFont / sample set selection
- State management approach: zustand vs. React context/reducer