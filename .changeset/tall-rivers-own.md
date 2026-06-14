---
"@djs-commands/core": major
"@djs-commands/adapter-drizzle": major
"@djs-commands/adapter-prisma": major
"@djs-commands/adapter-mongoose": major
"create-djs-commands": patch
---

Make storage schema user-owned. First-party adapters now require explicit framework model mappings and no longer export package-owned schemas/model factories. Core adds storage feature flags so disabled-command and channel-lock gates only query storage when enabled.
