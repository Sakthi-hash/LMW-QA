---
name: Bulk completion update ordering
description: Concurrency constraint for applying all QA process updates to one machine.
---

Bulk completion for one machine must apply process changes in sequence so each update reads the previous process state before writing the next one.

**Why:** Parallel updates can read the same old JSON process map and overwrite one another, leaving a machine incorrectly marked In progress.

**How to apply:** Keep per-machine bulk process writes serialized, even if different machines are processed independently.