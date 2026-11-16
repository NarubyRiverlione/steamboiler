# First public release on itch.io

**Status: accepted.** Sets the direction for the new `release` theme, tracked as the GitHub milestone `Release M1 itch.io early access`.

The simulator has only been played by its owner. The first public release puts it on itch.io as a free HTML5 game marked early access. Its goal is feedback from strangers, not polish.

## Decisions

- **Platform:** itch.io, as a zipped static web build, playable in the browser. GitHub Pages stays as it is.
- **Build:** a second build target with a relative `base` (`./`), so the same code runs under any path; today's `base: '/steamboiler/'` would load a blank page on itch.io. The itch build is made from `main` and uploaded by hand for now.
- **Release bar:** the game ships when a stranger can, without outside help:
  - **Get a goal:** the first screen says what to do (from Cold & dark to a synchronised generator) and offers the startup guide and the presets.
  - **Find help on every page:** a "?" opens a help card for that component: what it does, what to watch, the normal range, what trips it and how to recover.
  - **Follow a startup guide:** one page walks through the cold start to grid sync, step by step.
  - **Start over:** restart and the presets can be found from the first screen. Today they're behind the presets button.
- **Help cards are markdown files next to the code.** One file per component, imported by the app, and updated in the same commit as the matching `docs/plant/` page, under the same rule as the reference docs.
- **The help is written for players:** the same physics as `docs/plant/`, for a reader who has never seen a steam plant.
- **English only.**
- **Desktop only:** a minimum screen size, and the itch page recommends fullscreen. Mobile isn't supported.
- **The physics doesn't change for release.** Playability comes from the playback speed and the presets, never from a magic number ([ADR 0001](0001-boiler-pressure-follows-saturation.md), [ADR 0034](0034-playback-speed-is-ticks-per-second.md)).
- **No umbrella ticket.** The milestone and this ADR hold the plan; the work is small `release` tickets in the milestone.

## Considered options

- **An interactive tutorial** with highlighted controls and steps that wait for the player: deferred until feedback shows where strangers get stuck.
- **Help cards as TypeScript objects:** rejected. Markdown is easier to write and to review against `docs/plant/`.
- **Saving the game:** deferred. The presets cover starting from a later point.
- **Linking to GitHub Pages from itch.io instead of uploading a build:** rejected, because itch.io players expect to play on the page.
- **An umbrella ticket listing the pieces:** rejected; it would duplicate the milestone and this ADR.

## Consequences

- The first ticket adds the `release` theme to `THEMES` (`scripts/roadmap-helpers.ts`) and to `docs/agents/issue-tracker.md`. It is a code change, so it goes on a ticket branch.
- The tickets to draft: the relative-base build and a zip script; the first screen; the help card framework; one help card per component (boiler, turbine and generator, condenser, deaerator, feedwater loop); the startup guide; the minimum screen size and fullscreen hint; the itch.io page (description, 3–5 screenshots or a GIF, tags, early access note).
- `docs/dev/branching.md` gets a section on the itch build.
- A `docs/dev/` page describes the help cards: where they live and how they stay in step with `docs/plant/`.
