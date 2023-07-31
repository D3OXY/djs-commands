---
"@d3oxy/djs-commands": patch
---

Added a Initialization option `defaultCommand` which replaces `disableAllDefaultCommands` and `disabledDefaultCommands` options.
Example:

```js
new CommandHandler({
    disableAllDefaultCommands: false, // Replaced by defaultCommand.disableAll
    disabledDefaultCommands: ["prefix"], // Replaced by defaultCommand.disabledCommands
    defaultCommand: {
        disableAll: false, // Option to disable all default commands
        testOnly: true, // Option to register the default commands as testOnly
        disabledCommands: ["prefix"], // Option to disable specific default commands
    },
});
```
