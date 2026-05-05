# @djs-commands/jsx

JSX runtime + Components V2 component set for [`@djs-commands/core`](https://www.npmjs.com/package/@djs-commands/core).

📘 **Full documentation: https://djscommands.deoxy.dev/components-v2**

Write Discord Components V2 messages as JSX, compile to discord.js builders:

```tsx
import { Container, Section, TextDisplay, Button, render } from "@djs-commands/jsx";
import { MessageFlags } from "discord.js";

await interaction.reply({
	flags: MessageFlags.IsComponentsV2,
	components: render(
		<Container accentColor={0x5865f2}>
			<TextDisplay># Welcome</TextDisplay>
			<Section accessory={<Button style="primary" customId="ok" label="OK" />}>
				Click the button to continue.
			</Section>
		</Container>
	),
});
```

## Install

```bash
bun add @djs-commands/jsx
```

In your `tsconfig.json`:

```json
{
	"compilerOptions": {
		"jsx": "react-jsx",
		"jsxImportSource": "@djs-commands/jsx"
	}
}
```

That's it — no Babel, no SWC, no React. The TypeScript compiler (and Bun's transpiler) emits `import { jsx } from "@djs-commands/jsx/jsx-runtime"` automatically.

## Components

**Display:** `<Container>`, `<Section>`, `<TextDisplay>`, `<MediaGallery>`, `<Separator>`, `<File>`, `<Thumbnail>`

**Forms:** `<ActionRow>`, `<Button>` (`primary`/`secondary`/`success`/`danger`/`link`/`premium`), `<Modal>`, `<TextInput>`, `<RadioGroup>`, `<CheckboxGroup>`

**Renderers:** `render(tree)` for messages, `renderModal(tree)` for `interaction.showModal`.

The full surface — every component, side-by-side JSX vs. function examples, modal forms — is on the [Components V2 docs page](https://djscommands.deoxy.dev/components-v2).

## No JSX? Use the function fallback

If you can't (or won't) enable JSX in your project, every component has a function-form sibling re-exported from `@djs-commands/core` (e.g. `container`, `section`, `textDisplay`, `button`). They return the same discord.js builders, so you can mix the two freely.

```ts
import { button, container, section, textDisplay } from "@djs-commands/core";
```

## License

[MIT](https://github.com/D3OXY/djs-commands/blob/main/LICENSE) · Issues + discussions on [GitHub](https://github.com/D3OXY/djs-commands).
