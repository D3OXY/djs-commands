---
"@d3oxy/djs-commands": patch
---

Added a new Initialization option `antiCrash` (disabled by default) which can be used to prevent the bot from crashing if a error is thrown and will instead log the error to the console. **This option is not recommended and only there for some weird edge cases in which you don't want your production bot to crash.**
