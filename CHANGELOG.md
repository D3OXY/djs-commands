# Changelog

## 1.4.10

### Patch Changes

- e2be835: Downgrader Chalk to V4

## 1.4.9

### Patch Changes

- d8d0dc1: Update Dependencies to latest version

## 1.4.8

### Patch Changes

- e5c5349: Update: Dependencies

## 1.4.7

### Patch Changes

- b653f40: Fix Readme not showing up on npmjs page

## 1.4.6

### Patch Changes

- ec09e27: Fixed type errors

## 1.4.5

### Patch Changes

- aa7a6ba: Updated `discord.js`, `mongoose` to latest version

## 1.4.4

### Patch Changes

- 389726a: Added a Initialization option `defaultCommand` which replaces `disableAllDefaultCommands` and `disabledDefaultCommands` options.
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

- 9b02477: Added a new Initialization option `antiCrash` (disabled by default) which can be used to prevent the bot from crashing if a error is thrown and will instead log the error to the console. **This option is not recommended and only there for some weird edge cases in which you don't want your production bot to crash.**
- 5bda30b: Added a new **ownerOnly** Default Command `/slashcommand`.
  Which can be used list/delete slash commands registered by the bot on a guild/global level.
- f85c0cf: Fixed a bug where some Default commands were registered in both guild and global scope.

## 1.4.3

### Patch Changes

- 98c45d1: Changed `build:dev` script to `dev`
- 62fc4e0: Published new [Documentation](https://djscommands.deoxy.dev) page, Updated README.md and package.json with documentation info.

## 1.4.2

### Patch Changes

- 71d9175: - Added package-lock.json, Removed src from `.npmignore`
  - Refactored `CommandType`, `DefaultCommands`, `CooldownTypes` **enum** to use **const object** and added **type alias** for improved type safety.
  - Removed `keepAlive` option from `mongoose.connect()` call as it is deprecated and is now defaulted to true on **Mongoose** version `5.2.0` and above.

## 1.4.1

### Patch Changes

- 13e8c13: Reverted #c325c47 (CommandType, Cooldowntypes back to enum)

## 1.4.0

### Minor Changes

- c325c47: Changed CommandType, CooldownTye Enum to a const type for better autocomplete.

## 1.3.2

### Patch Changes

- bde1442: Update Dependencies to latest version, Added Changeset

## [1.3.1] 21-04-2023

### Added

- Added `CHANGELOG.md`
