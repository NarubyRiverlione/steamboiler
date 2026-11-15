# The valve ramp lives in a UI context above the pages

A turn of a valve knob sets a **commanded position**; the actual position follows at 100 % per 15 real seconds (`valveRamp.ts`, #41). The commands and their pacing live in `ValveRampProvider`, a React context in the UI layer mounted in `Layout` next to the annunciator context, so a ramp goes on whichever page is shown (#127). The plant never learns the setpoint: the provider only dispatches the existing `adjust…` actions, and reads each valve's actual position from the plant state through `PlantValveRamp`, so it works while a page is unmounted. Each knob has its own independent command, kept under a stable, unique `ValveId` prop. It is a separate prop because a `Label` is not guaranteed unique across pages; today the ids equal the labels, and `PlantValveRamp` holds the table of ids.

- **Pacing is real time at every playback speed.** Travel is a UX constant, not a plant parameter (ADR 0015); the operator's hand does not speed up with the playback speed. The sim speed changes how fast the plant reacts, not how fast the knob turns.
- **Drop rules, per valve:** a command is dropped when something else moves the valve (the turbine governor) or the reducer refuses the move (`MAX_STALLED_TICKS`). A ramp ends with its provider, never with a page.

## Considered options

- **Keep the ramp in a hook of `ValveControl`:** rejected. Unmounting the page cleared the timer and dropped the command; the valve froze at its current position.
- **Put the setpoint in the plant state or the reducer:** rejected. The ramp is pacing of the operator's hand, not plant physics, and the headless runner has no knob. Out of scope of #127.
- **Pace in sim time:** rejected for now. At 60 × the knob would travel in a quarter of a second, and at pause it would freeze with the page shown; real time keeps the knob feel constant.

## Consequences

- `ValveControl` takes a `ValveId` and no longer takes `cbAdjust`; pages no longer pass adjust actions. A new valve knob needs a row in `PlantValveRamp`.
- The tests are in `ValveControl.test.tsx` (unmount and remount mid-ramp, two valves, drop rules) and `PlantValveRamp.test.tsx` (the real plant).
