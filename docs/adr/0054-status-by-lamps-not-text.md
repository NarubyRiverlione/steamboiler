# Status by lamps, not text: permissive lamps instead of message lines

**Status: accepted.** Owner discussion of 2026-11-18; tickets #177 to #181. Builds on the analog board of [ADR 0015](0015-ui-redo-analog-board-preferred.md) and the switch rules of [ADR 0039](0039-latching-controls-are-turn-switches.md). The refusals themselves are open in #174.

The board says **why a control can or cannot work with lamps, never with sentences**. Each condition a control waits for is a **permissive lamp** beside that control, lit (`ok` tone, green) while the condition is met; when all of a control's lamps are lit, the control works. A warning about an operator mistake is an amber lamp in the group it concerns. An event the operator must notice even on another page is an **annunciator tile**. A real board has no prose: the operator reads the lamps, and the explanation lives in training, here the help cards of [ADR 0052](0052-first-public-release-on-itch-io.md).

Rules:

- **No message lines on the board.** No new `board-lcd-msg` line, and the existing ones go. An LCD shows a value or a short state word (`Sealed`, `Unsealed`), never a sentence.
- **A lamp sits on the page and in the group of the control it permits**, even when the quantity belongs to another page (the layout rule of #134 is for instruments, not permissives). A condition already shown in the same group by a gauge zone, a lamp or an LCD gets no second lamp.
- **The label is the condition, worded as met:** `Aux bus live`, `Oil pressure OK`, `Rotor at standstill`, `Rotor turning`, `Main steam valve open`, `Breaker closed`. A warning lamp names the fault: `Vent closed, air in`.
- **Tooltips stay.** The `title` on a lamp and on a disabled control keeps its text (the reason in words). It is hidden until hovered, so it does not change the look of the board; it stands in for the engraved label plate of a real panel.
- **One mode.** There is no training or hardcore mode: with every condition on a lamp the board explains itself without text, so there is nothing to switch off.
- **Disabled controls stay disabled** until #174 decides which refusals are interlocks and which become consequences. This ADR changes only how the reason is shown.

## What changes on today's pages

| Page, group | Message line today | Instead |
|---|---|---|
| Turbine aux, Turning gear | the reason from `turningGearRefusal` (aux bus dead, oil below the permissive, not at standstill) | three permissive lamps: `Aux bus live`, `Oil pressure OK`, `Rotor at standstill` |
| Turbine aux, Gland steam | the reason from `glandSteamRefusal` (rotor must be turning) | a `Rotor turning` permissive lamp |
| Turbine aux, Gland steam | "Gland steam shut off: the rotor stopped turning" (`useAutoShutOff`) | an annunciator tile **Gland steam shut off**; `useAutoShutOff` goes. The automatic shut-off leaves no plant state today, so `GlandSteamTick` gets a flag set at the shut-off and cleared when the steam is admitted again |
| Turbine aux, Lube oil | the permissive and trip limits | nothing: the gauge zones show both limits |
| Generation, Generator breaker | the sync band and the current RPM | nothing: `Ready to close` and the Turbine speed LCD in the group show it |
| Generation, Generator load | the reason from `loadSetpointRefusal` (close the breaker first) | a `Breaker closed` permissive lamp |
| Deaerator, Start-up vent | the two vent warnings (vent closed with air in, vent open with the air out) | two amber lamps beside `Safe to close`, one per warning |
| Turbine, Speed control | the refusal `title` of the mode and run-up buttons | a `Main steam valve open` permissive lamp; the tooltips stay. "Ramp up only goes up" is a rule of the selector, not a condition, so it stays a tooltip only |
| Trip reset buttons | the refusal `title` | nothing new: the lamps of the trip causes are on those pages; the tooltips stay |

## Considered options

- **Two modes, one with message lines and one without (classic and hardcore, or training and control room):** rejected. Each new group would need two designs and two sets of tests. A hardcore mode would hide information unless every message had a lamp anyway, and once it has one, the text adds nothing a tooltip and a help card do not.
- **Keep the message lines:** rejected. Every new component added one, the board read more and more like a form, and a sentence on an LCD breaks the 1960s-to-80s style of ADR 0015.
- **Drop the tooltips too:** rejected. They are invisible until hovered, and they help a new player without costing the look.
- **A lamp for the gland steam shut-off on its group instead of a tile:** rejected. The rotor stops while the operator may be on another page; a real plant alarms it, and the tile opens the Turbine aux page.

## Consequences

- One `ui` ticket per page group: Turbine aux (#178), Generation (#179), Deaerator (#180), Turbine (#181). The gland steam tile needs the new flag in the plant and an entry in `ALARMS`: its own `turbine-aux` ticket (#177), which blocks #178.
- `docs/dev/ui-board.md` drops the message lines from the page descriptions as each ticket lands, and gets the permissive-lamp rule under the layout rules.
- A ticket that adds a refusal or a warning designs its lamp, not a line of text.
