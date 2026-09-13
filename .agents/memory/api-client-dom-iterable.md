---
name: Generated client DOM iterable types
description: Compatibility note for generated React API clients using Headers.entries().
---

The shared generated API client uses `Headers.entries()`, so its TypeScript library configuration must include `dom.iterable` alongside `dom`.

**Why:** Orval generation succeeds but the workspace library typecheck fails without the iterable DOM declarations.

**How to apply:** Preserve the `dom.iterable` lib entry when changing the shared API client TypeScript configuration.