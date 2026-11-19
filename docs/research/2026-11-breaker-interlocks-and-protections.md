# Breakers: interlocks, protections and what a real plant lets through

Frozen research record. The decisions this feeds are [ADR 0053](../adr/0053-the-auxiliary-bus-is-fed-by-the-grid-or-the-generator.md) and [ADR 0027](../adr/0027-generator-load-is-a-resisting-torque.md); the tickets it unblocks are #143, #169, #142 and #175. Ticket #174. **Research only:** nothing here is decided. The owner grills it, then ADR 0053 is edited and sim tickets are filed.

**Provenance.** Found by web search for #174. The search returned snippets and summaries, not the full documents: nothing below was read from a standard or a datasheet. Claims are labelled **sourced (snippet)** when a search result stated them, **forum / vendor blog** when the only source is low authority, and **UNVERIFIED** when no source was found. Any number is a range from a vendor manual or an estimate, never a sim parameter.

## Short answer

A real plant separates two things the sim currently mixes:

- An **interlock** stops a command *before* it acts (sync-check blocks a close, a permissive blocks a start). It lives in the breaker control circuit or the controller.
- A **protection** lets the command act and then trips on the *consequence* (underfrequency, overload, reverse power). A hand on a breaker is never refused because the plant would suffer; the plant is protected afterwards.

Applied to the sim's refusals:

- **Opening a breaker** is essentially never interlocked. The sim's refusals for opening the grid supply breaker and for a load setpoint below the auxiliary load are **protections in disguise**: a real plant lets it through and the consequence follows (frequency falls, the unit trips, the bus goes dead).
- **Closing a breaker** is where real interlocks live (sync-check, dead-bus logic). The sim's silent no-op outside ±2 rpm is the right *idea* with the wrong *feedback*.
- **Breaker commands without control power** do nothing, because the coils are dead. That is a physical fact, not a refusal. A local mechanical trip at the breaker still works.
- **Governor and controller limits** (setpoint with the breaker open, speed modes, run-up point) are real and stay.

## 1. Interlock or protection

| Term | Meaning here | Example |
|---|---|---|
| Interlock | The command is blocked before it acts | Sync-check relay does not release the close coil |
| Permissive | A condition a controller requires before it accepts a command | Turning gear engaged before a roll |
| Protection | The command acts; a relay or trip reacts to the result | Underfrequency trip, overload trip, overspeed trip |
| Controller limit | The knob has a range that the controller enforces | A load setpoint is only meaningful with the breaker closed |

**Sourced (snippet):** the IEEE guide C37.106-2003 treats underfrequency protection as load shedding, a discrete underfrequency function, or both, which must be coordinated ([IEEE C37.106](https://smartgrid.gov/files/documents/IEEE_C37106_IEEE_Guide_for_Abnormal_Frequency_Protection_for_200310.pdf)). Overload on a generator is cleared by the generator breaker after a time delay, not refused up front ([Kohler, Power Systems Topics 120](https://resources.kohler.com/power/kohler/industrial/pdf/Over_Current_WP.pdf)).

## 2. Opening the grid supply breaker with too little generation

**What a real plant does.** The breaker opens. The generator is left feeding the auxiliary load alone, an island. What follows depends on the governor and the margin:

- If the unit is on an isochronous (speed) governor it picks the load up and holds frequency, as long as the steam and the valve can carry it. **Sourced (snippet):** islanded units are usually switched to isochronous control when the tie opens, and load is shed if island demand exceeds the prime mover's rating ([control.com thread](https://control.com/forums/threads/power-deficiency.34471/post-34471)).
- If the generation is too small, speed and frequency fall. Governors respond with a delay that depends on their tuning ([SEL paper](https://selinc.com/api/download/115388)). Underfrequency load shedding acts first; if it is too late or too small the island collapses ([SEL paper](https://selinc.com/api/download/6318)).
- A steam turbine accumulates blade damage at off-nominal frequency whether or not it carries load; allowed time per band is manufacturer-specific and cumulative ([IEEE C37.106 summary](https://smartgrid.gov/files/documents/IEEE_C37106_IEEE_Guide_for_Abnormal_Frequency_Protection_for_200310.pdf), [forum summary](https://eng-tips.com/threads/underfrequency-protection-of-steam-turbine.251739)). Forum examples of time limits (47 Hz about 10 to 30 s, 45 Hz instantaneous on a 50 Hz unit) are anecdotal and design-specific: **do not use as parameters.**
- Result: an underfrequency or speed-window trip, the generator breaker opens, **dead bus**.

**Not interlocked.** No source found that refuses the open. **No source found** for a plant that blocks a grid tie opening for being short of generation; the usual protection is the island detection and load-shedding scheme.

**What the sim does today.** `gridSupplyOpenRefusal` refuses (ADR 0053). Gross load is the setpoint, so the auxiliary load never loads the shaft: if the refusal were lifted nothing physical would happen, except the pumps losing power if the generator breaker is also open.

**Modelling it (estimate, rough weight).**

- The auxiliary load becomes a real shaft load while islanded: the shaft takes `max(setpoint, auxiliary load)` or the generator carries load = auxiliary demand with the setpoint as an additional export. State touched: `electricOutput`, the torque term in `calculateRPM`. Small to medium.
- Underfrequency then falls out of the existing ±2 rpm auto-open (ADR 0027): speed leaves the window, the breaker opens, the bus goes dead (ADR 0053 already does the rest). This is the existing "failures need no special logic" stance, so **no new trip is needed** for the first cut. A separate underfrequency trip with a time-delay curve is not recommended (no sourced numbers for this unit).
- The Hold PID (synchronised mode) already pulls speed back with the valve, so an islanded unit with enough steam rides through, which matches the isochronous behaviour above.

## 3. Load setpoint while islanded on the auxiliary load

**Real plant.** Islanded, the governor is isochronous: it follows the load, and the operator has no load setpoint that matters. A setpoint below the auxiliary load is meaningless, not refused; the unit simply carries what the bus demands. **Sourced (snippet):** island-mode governors are switched to isochronous ([control.com](https://control.com/forums/threads/power-deficiency.34471/post-34471)). **No source found** on a load-setpoint *floor*.

**Sim.** `loadSetpointFloorRefusal` is a **consequence replaced by a refusal**. Recommended: remove the floor and let the shaft carry the auxiliary load (section 2), with the setpoint ignored or additive while the grid supply breaker is open. Open question for the grilling: what does the setpoint mean while islanded.

**Keep:** `loadSetpointRefusal` (no setpoint with the generator breaker open). That is a controller-mode limit: there is no load to set when the generator is not connected. **UNVERIFIED** as a named real-plant rule, but it matches how a speed/load controller works.

## 4. Closing interlocks

### Generator breaker: sync-check

**Real plant.** A sync-check relay (ANSI 25) allows the close only when voltage magnitude, frequency (slip) and phase angle on both sides are within limits ([HYPERSIM 25 relay](https://opal-rt.atlassian.net/wiki/spaces/PDOCHS/pages/150276201/25+-+Synchronism-Check+Relay), [Basler BE3-25 manual](https://www.basler.com/resource-hub/manuals/instruction-manual/be3-25-instructions-rev-d-english/9319100990.pdf)). Vendor example ranges (not a standard):

| Check | Range seen | Source |
|---|---|---|
| Voltage difference | window 0.5 to 50 % of V L-L; about 5 % common | GE F650 manual, third-party page |
| Phase angle | 1 to 90 degrees settable; about 5 to 20 degrees quoted | GE F650, vendor and forum pages |
| Slip frequency | 0.02 to 0.25 Hz settable; about 0.05 Hz quoted | GE F650, third-party page |

The sim's ±2 rpm is **2 rpm = 0.033 Hz of slip** on a 2-pole 50 Hz machine (3000 rpm), inside that slip range. Phase angle and voltage are not modelled and are out of scope (ticket).

**Why it is an interlock, not a protection.** Out-of-phase closing damages the shaft and coupling, and the breaker cannot trip in time: forum post, trip time 50 to 100 ms against peak torque in 8 to 10 ms ([eng-tips](https://www.eng-tips.com/threads/closing-dg-output-breaker-60-degrees-out-of-phase.12359), **forum**). The peak torque is commonly put near 90 degrees and the peak voltage stress near 180 degrees (forum, unverified; the primary reference is the IEEE/PES PSRC report on generator synchronizing, [pes-psrc.org](https://pes-psrc.org/kb/report/119.pdf)). The breaker closing time matters: relays and operators energise the close coil early to compensate ([GE F650 manual page](https://www.manualslib.com/manual/1368865/Ge-F650.html?page=236)).

**Sim.** Silent no-op. Recommendation: **keep as an interlock, but say why**, the way the other refusals do ("Speed is outside the synchronising window"). Light change.

### Grid supply breaker: closing onto a live bus

**Real plant.** Closing a tie between two live sources needs sync-check; onto a dead bus it does not ("dead bus" closing, see below). The sim assumes a stiff grid with no sync-check (ADR 0053). When the generator carries the bus and the grid is the second live source, a real plant checks sync. **Partly realistic today:** fine onto a dead bus, not onto a live bus. Since there is no grid frequency or angle in the sim, a sync-check here has nothing to check until ADR 0046 M1 (grid-connected model). Recommendation: **keep always allowed for now, record it as a known gap.**

### Dead-bus closing and dark start

**Sourced (snippet):** a sync-check relay blocks closing until generator and bus voltages agree within about 5 %, and a separate "dead bus" feature lets the breaker close when only the generator side is live ([Army TM 9-6115-604-12](https://dieselgenerators.tpub.com/TM-9-6115-604-12/css/TM-9-6115-604-12_293.htm)). Many relays can close onto a dead bus with generator supply only, as a utility-failure requirement ([Basler BE3-25](https://www.basler.com/resource-hub/manuals/instruction-manual/be3-25-instructions-rev-d-english/9319100990.pdf)).

For the sim: with the bus dead and the diesel running, its breaker closes without a sync check. With the bus live (grid or generator), it needs one.

### Auto-sync for the diesel (#169) and the generator

**Sourced (snippet):** typical automatic synchronizers match frequency and phase angle, then issue the close signal ([paralleling switchgear presentation](https://pt.slideshare.net/michaeljmack/paralleling-switchgear)). **No source found** on whether a steam generator of this size is closed by auto-sync or by a manual synchroscope with a sync-check supervising it; both exist in practice (UNVERIFIED for this plant). For the game: a manual close inside the window, supervised by the interlock, is the existing mechanic and is enough for the generator. The diesel (#169) could auto-close on a dead bus. Open question for the grilling.

## 5. Which bus each control needs

Bus split from #143: **Auxiliary** (pumps, turning gear), **Vital** (LCD readouts, annunciator, fed from the auxiliary bus), **Safety** (UPS: emergency light, breaker control power, emergency oil pump), **none** (mechanical, no power). Analog gauges are unpowered.

### Breaker commands

**Real plant.** Breaker control power is station DC from a battery, so breakers keep working through an AC loss (stated in one search result whose source was not identified; the DC-trip-power guide below says the same in other words). With DC lost:

- The close and trip coils cannot act. A MV breaker without DC trip power is "functionally a manually operated switch" (same guide; vendor blog).
- A shunt trip needs power; a no-volt release trips on loss of power ([fail-safe trip circuit guide](https://industrialmonitordirect.com/blogs/knowledgebase/fail-safe-mv-circuit-breaker-trip-circuit-design), vendor blog).
- Many breakers have a **local manual trip** (button or lever) that works without control power ([circuit breaker accessories](https://testguy.net/content/283-Circuit-Breaker-Accessories), [ABB manual](https://www.manualslib.com/manual/2067505/Abb-Vhk-20.html?page=16)). It is manual, not a protective action.
- Common practice is to alarm on control power loss rather than trip ([same guide](https://industrialmonitordirect.com/blogs/knowledgebase/medium-voltage-switchgear-dc-trip-power-backup-systems-guide), vendor blog).

**So: "the switch does nothing", not a refusal with a reason.** A refusal message is what the board shows; physically the button is dead. Recommended: the command has no effect with the safety bus dead, and the board shows that the safety bus is dead (the annunciator and the lamps already say so under #143, apart from the vital bus). Whether a local mechanical trip at the breaker belongs in the sim is an open question: it would be a second, bus-independent control for the generator breaker, which matters on a dead plant with a latched breaker. Weight: small, one extra action. **Recommendation:** add it, because without it a plant with a dead safety bus and a closed breaker has no way to open it.

### Per control

| Control | Bus it needs | Dead-bus behaviour | Source |
|---|---|---|---|
| Grid supply breaker, open or close | Safety (control power) | does nothing; local manual trip still opens | snippet (above), assignment is a proposal |
| Generator breaker, open or close | Safety (control power) | does nothing; local manual trip still opens; auto-open on speed window is a mechanical/relay effect, **UNVERIFIED** whether it needs control power | as above |
| Load setpoint | Vital (the controller and its readout) | **UNVERIFIED**: a governor with no power typically runs at its last or a safe setting; proposal: setpoint frozen | none |
| Turning gear engage | Auxiliary (the motor) | cannot engage; gear drops out (already ADR 0053) | existing ADR |
| Gland steam | none for the valve by hand, Vital for the controller | **UNVERIFIED** | none |
| Speed mode, run-up point | Vital (the controller) | **UNVERIFIED**: proposal: frozen at last state | none |
| Trip reset | Safety | **UNVERIFIED** | none |

**Honest summary:** only the breaker rows are backed by sources; the others are proposals following the #143 split and need the owner's call.

## 6. Diesel overload (#169)

**Real plant.** A small diesel is limited by its fuel rack and its mechanical rating. Past rating it cannot add fuel, so speed and frequency fall (the fuel-limited set "falls behind as load grows", [eng-tips thread](https://www.eng-tips.com/threads/generator-frequency-jumping-on-50-load.462221), forum). One reported set ran stable at lower load and tripped on underfrequency at higher load, with the trip set at 46 Hz (same thread; forum). Protective overcurrent trips are always active on emergency diesels, with coincident logic from three measurements ([NRC training chapter](https://www.nrc.gov/docs/ML1122/ML11229A158.pdf)), and the generator breaker clears overload after a delay ([Kohler](https://resources.kohler.com/power/kohler/industrial/pdf/Over_Current_WP.pdf)). Overspeed is a separate trip with a manual reset (NRC chapter).

**Sim.** This is **a consequence, not a refusal**, matching the ticket's triage note: the diesel keeps running as the load passes its rating, speed falls, then an overload trip opens its breaker and the bus goes dead again. It can reuse the same ±2 rpm window and the existing dead-bus logic. **No source found** for overload-trip delay or curve for a unit of this size: any figure would be an estimate, flagged, and recorded in `design-basis.md` if built.

## 7. Recommendation table

Realistic: yes / no / partly. Kind: what the real plant does with this command.

| Command | Today | Kind (real plant) | Realistic today | Recommendation |
|---|---|---|---|---|
| Open the grid supply breaker | refused unless the generator carries the auxiliary load | allowed; protection acts on the consequence | no | **Replace by consequence:** allow; the auxiliary load loads the shaft; speed falls and the ±2 rpm auto-open (ADR 0027) produces the dead bus |
| Close the grid supply breaker | always allowed | interlock on a live bus (sync-check); free onto a dead bus | partly | **Keep always allowed;** record the missing sync-check (needs a grid model, ADR 0046 M1) |
| Close the generator breaker | silent no-op outside ±2 rpm | interlock (sync-check) | yes, but silent | **Keep as an interlock, add a reason** |
| Open the generator breaker | allowed | allowed (reverse-power or trip logic may open it) | yes | **Keep**; with the safety bus dead it does nothing |
| Load setpoint below the auxiliary load, grid supply open | refused | governor follows the load; no floor | no | **Replace by consequence:** remove the floor |
| Load setpoint with the generator breaker open | refused | controller-mode limit | yes (UNVERIFIED as a named rule) | **Keep refusal** |
| Any breaker command without control power | not built (#143) | coil dead, switch does nothing | n/a | **Add:** no effect with the safety bus dead; **add a local mechanical trip** |
| Turning gear engage | refused (permissives) | real permissive and a motor needing the auxiliary bus | yes | **Keep;** its bus dependency is already in ADR 0053 |
| Gland steam | refused (permissives) | real permissive | yes | **Keep;** bus dependency: open question |
| Speed mode | refused (permissives, breaker closed) | controller logic | yes | **Keep;** bus dependency: open question |
| Run-up point | refused (permissives, breaker closed) | controller logic | yes | **Keep;** bus dependency: open question |
| Diesel overload (#169) | not built | protection: speed falls, overload trip, dead bus | n/a | **Consequence,** not a refusal |

## Open questions for the grilling

1. **Islanded load model.** When the grid supply breaker is open, does the setpoint stay as the *export* above the auxiliary load, or does it mean nothing (isochronous, the unit carries what the bus draws)? This decides how ADR 0027's "gross load is the setpoint" changes. It touches the shaft torque term.
2. **Does an undersized island go to a trip or a slow fade?** The existing ±2 rpm auto-open gives a trip and a dead bus with no new logic. Is that enough, or do you want a separate underfrequency step? (No sourced numbers either way.)
3. **Silent close.** Should the generator breaker close outside ±2 rpm give a reason, a lamp, or stay silent (the lamp stays dark)? Which fits the analog board of ADR 0015?
4. **Which bus does each controller need?** The table in section 5 is a proposal for everything except the breakers. In particular: does a dead vital bus freeze the setpoint, or hand the machine to a safe default?
5. **Local mechanical trip.** In the sim or not? If yes, it is the only way to open a breaker on a dead safety bus.
6. **Does auto-open on the speed window need control power?** A relay trip needs DC; a purely mechanical overspeed does not. The sim's ±2 rpm auto-open is a relay action (**UNVERIFIED**). If it needs the safety bus, a plant that loses it keeps a closed breaker on a falling speed.
7. **Grid supply breaker closing.** Always allowed until ADR 0046 M1 brings a grid frequency, or a placeholder sync-check now?
8. **Diesel (#169) close.** Auto-close on a dead bus, or by hand with the interlock?
9. **Diesel overload figures.** Rating margin and trip delay are estimates; the owner picks the playable value and it goes into `design-basis.md`.

## Caveats

- **Search snippets only.** No standard (IEEE C37.106, C37.2, the PSRC synchronizing report) and no relay manual was read in full. The IEEE and PSRC references are pointers, not quotes.
- **Many sources are vendor blogs and forum threads** (marked). They are consistent with each other and with standard governing theory, but none is authoritative.
- **No source found** for: a load-setpoint floor, an overload trip curve for a small diesel, whether the generator's auto-open needs control power, the bus assignment for the controllers.
- The ±2 rpm window of ADR 0027 is a modelling choice; the real slip settings above (0.02 to 0.25 Hz) bracket it but come from relays for other machines.

## Sources

- [IEEE C37.106-2003, abnormal frequency protection (smartgrid.gov copy)](https://smartgrid.gov/files/documents/IEEE_C37106_IEEE_Guide_for_Abnormal_Frequency_Protection_for_200310.pdf)
- [HYPERSIM, 25 synchronism-check relay](https://opal-rt.atlassian.net/wiki/spaces/PDOCHS/pages/150276201/25+-+Synchronism-Check+Relay)
- [Basler BE3-25 instruction manual](https://www.basler.com/resource-hub/manuals/instruction-manual/be3-25-instructions-rev-d-english/9319100990.pdf)
- [GE F650 manual, settings pages](https://www.manualslib.com/manual/1368865/Ge-F650.html?page=236)
- [Army TM 9-6115-604-12, synchro-check and dead bus](https://dieselgenerators.tpub.com/TM-9-6115-604-12/css/TM-9-6115-604-12_293.htm)
- [Paralleling switchgear presentation (automatic synchronizers)](https://pt.slideshare.net/michaeljmack/paralleling-switchgear)
- [IEEE/PES PSRC report on generator synchronizing](https://pes-psrc.org/kb/report/119.pdf)
- [SEL paper, islanded turbine-generators](https://selinc.com/api/download/115388), [SEL paper, load shedding timing](https://selinc.com/api/download/6318)
- [control.com, power deficiency and isochronous island mode](https://control.com/forums/threads/power-deficiency.34471/post-34471)
- [eng-tips, underfrequency protection of a steam turbine](https://eng-tips.com/threads/underfrequency-protection-of-steam-turbine.251739)
- [eng-tips, closing a DG breaker out of phase](https://www.eng-tips.com/threads/closing-dg-output-breaker-60-degrees-out-of-phase.12359)
- [eng-tips, generator frequency under load](https://www.eng-tips.com/threads/generator-frequency-jumping-on-50-load.462221)
- [NRC training chapter, EDG trips](https://www.nrc.gov/docs/ML1122/ML11229A158.pdf)
- [Kohler, Power Systems Topics 120, overcurrent](https://resources.kohler.com/power/kohler/industrial/pdf/Over_Current_WP.pdf)
- [MV switchgear DC trip power guide](https://industrialmonitordirect.com/blogs/knowledgebase/medium-voltage-switchgear-dc-trip-power-backup-systems-guide), [fail-safe MV trip circuit design](https://industrialmonitordirect.com/blogs/knowledgebase/fail-safe-mv-circuit-breaker-trip-circuit-design)
- [Circuit breaker accessories](https://testguy.net/content/283-Circuit-Breaker-Accessories), [ABB VHK manual](https://www.manualslib.com/manual/2067505/Abb-Vhk-20.html?page=16)
