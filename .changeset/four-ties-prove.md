---
"@d3oxy/djs-commands": patch
---

-   Added package-lock.json, Removed src from `.npmignore`
-   Refactored `CommandType`, `DefaultCommands`, `CooldownTypes` **enum** to use **const object** and added **type alias** for improved type safety.
-   Removed `keepAlive` option from `mongoose.connect()` call as it is deprecated and is now defaulted to true on **Mongoose** version `5.2.0` and above.
