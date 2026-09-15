---
name: Google Sheet printable sync
description: Durable constraints for syncing the QA board to the connected printable spreadsheet.
---

The connected Google Sheet is a printable projection of the QA database, not a second source of truth. Sync rows in stable machine-id order to `Sheet1` columns Date, Machine Name, Bed NO, Work No, Rlb, Laser, LKC, FUC, CT, TAG, Remarks.

**Why:** The supplied sheet is a fixed print template with checkbox cells and no machine ID column; rewriting the controlled data range prevents duplicate rows when a machine name or bed changes.

**How to apply:** Keep connector calls server-side, preserve the header and sheet formatting, write boolean QA values as TRUE/FALSE, and sync after mutations rather than polling the sheet for dashboard state.