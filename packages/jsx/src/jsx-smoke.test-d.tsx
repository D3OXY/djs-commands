/**
 * Smoke test for the JSX automatic transform.
 *
 * If this file fails to compile, the JSX runtime export shape (or the
 * `jsxImportSource` resolution in tsconfig) is broken. We don't run anything
 * here at runtime — `bun test` ignores `*.test-d.tsx` because it's not a
 * Bun-native test file extension we register, and `tsconfig.build.json`
 * excludes it.
 */

import { Container, Section, TextDisplay } from "./components/display";
import { ActionRow, Button, Modal, TextInput } from "./components/forms";
import type { ComponentBuilderArray } from "./render";
import { render, renderModal } from "./render";

// Top-level message render
const tree = (
	<Container accentColor={0x5865f2}>
		<TextDisplay># Hello</TextDisplay>
		<Section accessory={<Button style="primary" customId="ok" label="OK" />}>Click below</Section>
		<ActionRow>
			<Button style="secondary" customId="x" label="X" />
		</ActionRow>
	</Container>
);

const built: ComponentBuilderArray = render(tree);
void built;

// Modal render
const modalTree = (
	<Modal title="Form" customId="form-modal">
		<TextInput customId="name" label="Name" />
	</Modal>
);

renderModal(modalTree);

// Fragments work too.
render(
	<>
		<TextDisplay>a</TextDisplay>
		<TextDisplay>b</TextDisplay>
	</>
);
