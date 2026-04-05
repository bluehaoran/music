Screens
  - LibraryScreen — song list, new song creation, import entry point
  - EditorScreen — top-level editor orchestrator; owns currentSectionId state and the contextual Play button

  Score / Arrangement
  - ScoreView — renders the section/part/bar hierarchy; handles section selection, rename, delete, and "Add section"
  - BarCell (inside ScoreView) — individual bar tile showing chord label + lyric snippet

  Chord Input
  - ChordPanel — key picker, 7-button Nashville grid, pending chord queue, Save/Loop/Stop actions
  - VariantPopover (inside ChordPanel) — long-press popover showing chord quality variants + guitar diagram + play preview
  - KeyPicker (inside ChordPanel) — chromatic key + major/minor mode selector

  Bottom Sheets
  - BarEditSheet — edit slots within a single bar (chord, beat subdivision)
  - SongSettingsSheet — BPM, time signature, key, instrument, capo, drum pattern, export trigger
  - LyricsSheet — pipe-delimited textarea editor for aligning lyrics to bars per section
  - ExportSheet — ChordPro copy/download/share
  - ImportSheet — paste or file-open ChordPro import

  Shared / Utility
  - GuitarDiagram — SVG fretboard diagram rendered from a voicing array
  - AppBar — top navigation bar with song title (editable) and back button
  - AppShell — root layout wrapper (sticky AppBar + scrollable content area)