# @djs-commands/jsx

JSX runtime + Components V2 components for [`@djs-commands/core`](https://github.com/D3OXY/djs-commands).

Write Discord Components V2 messages as JSX:

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

## Setup

In your `tsconfig.json`:

```json
{
    "compilerOptions": {
        "jsx": "react-jsx",
        "jsxImportSource": "@djs-commands/jsx"
    }
}
```

That's it — no Babel, no SWC. The TypeScript compiler (and Bun's transpiler) emits `import { jsx } from "@djs-commands/jsx/jsx-runtime"` automatically.

## Components

Display: `<Container>`, `<Section>`, `<TextDisplay>`, `<MediaGallery>`, `<Separator>`, `<File>`, `<Thumbnail>`.

Forms: `<ActionRow>`, `<Button>`, `<Modal>`, `<TextInput>`, `<RadioGroup>`, `<CheckboxGroup>`.

## No JSX? Use the function fallback

If you can't enable JSX in your project, every component has a function-form
sibling re-exported from `@djs-commands/core` (e.g. `container`, `section`,
`textDisplay`, `button`). They return the same discord.js builders, so you can
mix the two freely.
