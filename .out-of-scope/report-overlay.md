# Report overlay (compare two runs)

The headless report does not get an overlay mode that plots two runs of the same scenario on one set of axes.

## Why this is out of scope

The ticket was always optional ("do it once comparing two report tabs by eye stops being enough"), and the owner decided on 2026-11-08 that it is not needed. Judging a physics or parameter change is done with the golden and edge scenarios, whose goals and invariants fail on a regression, and with the committed snapshots, which a test compares with tolerance (ADR 0020). Those catch what an overlay would only show by eye. An overlay would also add a second run path, a baseline format and a legend to a report that stays simple on purpose.

If comparing two runs by eye becomes a real need, reopen the idea as a new ticket and delete this file.

## Prior requests

- #39: "Report overlay: compare two runs on the same axes"
