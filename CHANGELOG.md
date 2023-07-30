# Changelog

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
