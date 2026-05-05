# @djs-commands/jsx

## 2.0.1

### Patch Changes

- 50beb33: docs: refresh package READMEs

  - Drop pre-2.0 placeholder copy ("bootstrap-stage skeleton", "more models in slice #62", etc.) — every framework model ships today.
  - Link prominently to https://djscommands.deoxy.dev for concepts, recipes, and the adapter cookbook.
  - Fix `adapter-redis` README using `cache:` (handler option is `cacheAdapter`).
  - Document all three framework models (`guild_prefix`, `disabled_commands`, `channel_locks`) on every storage adapter README.
  - Add migration-guide and companion-package links throughout.

## 2.0.0

🎉 Initial v2.0.0 release.

JSX runtime for Discord Components V2. Compiles JSX trees into discord.js `ComponentBuilder` objects ready to pass to `interaction.reply({ flags: MessageFlags.IsComponentsV2, components })`.

- **Display**: `<Container>`, `<Section>`, `<TextDisplay>`, `<MediaGallery>`, `<Separator>`, `<File>`, `<Thumbnail>`
- **Form**: `<ActionRow>`, `<Button>` (incl. `link` and `premium` variants), `<Modal>`, `<TextInput>`, `<RadioGroup>`, `<CheckboxGroup>`
- Custom JSX runtime — set `jsxImportSource: "@djs-commands/jsx"` in your tsconfig
- `render(tree)` for messages, `renderModal(tree)` for `interaction.showModal`

For users who don't want JSX, the same component primitives ship as plain functions in `@djs-commands/core` — both APIs return identical builder objects.

See the [Components V2 docs](https://djscommands.deoxy.dev/components-v2) for the full surface.
