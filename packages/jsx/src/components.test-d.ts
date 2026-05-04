/**
 * Type-level tests for component prop shapes.
 *
 * These don't run at test time — `bun test` ignores `*.test-d.ts` files. They
 * are picked up by `tsconfig.json` (which includes them) but excluded by
 * `tsconfig.build.json`, so a failure here surfaces in `bun run typecheck`.
 */

import { type APIButtonComponent, ButtonStyle, type ComponentType } from "discord.js";
import { expectTypeOf } from "expect-type";
import { Container, Section, TextDisplay, Thumbnail } from "./components/display";
import { ActionRow, Button, CheckboxGroup, Modal, RadioGroup, TextInput } from "./components/forms";
import type { ButtonNode, ContainerNode, DjsxNode, ModalNode, SectionNode, TextDisplayNode, TextInputNode } from "./types";

// --- Container ---------------------------------------------------------------

// Required `accentColor` shape: number or RGB tuple, both accepted.
const c1 = Container({ accentColor: 0x123456, children: TextDisplay({ children: "x" }) });
expectTypeOf(c1).toEqualTypeOf<ContainerNode>();

const c2 = Container({ accentColor: [10, 20, 30] as const, children: [] });
expectTypeOf(c2).toEqualTypeOf<ContainerNode>();

// Children can be a single node or an array, and accept all V2 layout types.
Container({
	children: [
		TextDisplay({ children: "heading" }),
		Section({
			accessory: Button({ style: "primary", customId: "x", label: "X" }),
			children: ["body"],
		}),
		ActionRow({ children: [Button({ style: "primary", customId: "x", label: "X" })] }),
	],
});

// --- Section -----------------------------------------------------------------

const s1 = Section({
	accessory: Button({ style: "secondary", customId: "y", label: "Y" }),
	children: ["body"],
});
expectTypeOf(s1).toEqualTypeOf<SectionNode>();

// Thumbnail also accepted as accessory.
Section({ accessory: Thumbnail({ url: "https://example.com/x.png" }), children: [TextDisplay({ children: "row" })] });

// @ts-expect-error — bare strings are not valid accessories.
Section({ accessory: "not allowed", children: [] });

// @ts-expect-error — accessory is required.
Section({ children: [TextDisplay({ children: "x" })] });

// --- TextDisplay -------------------------------------------------------------

const t1 = TextDisplay({ children: "static text" });
expectTypeOf(t1).toEqualTypeOf<TextDisplayNode>();
TextDisplay({ children: ["a", "b"] });
TextDisplay({ children: 42 }); // numbers stringify
TextDisplay({}); // children optional → empty content

// @ts-expect-error — TextDisplay rejects nested nodes (they aren't text).
TextDisplay({ children: TextDisplay({ children: "x" }) });

// --- Button ------------------------------------------------------------------

const b1 = Button({ style: "primary", customId: "ok", label: "OK" });
expectTypeOf(b1).toEqualTypeOf<ButtonNode>();
expectTypeOf(b1.data).toMatchTypeOf<APIButtonComponent>();

// Link buttons require `url`, not `customId`.
Button({ style: "link", url: "https://example.com" });

// Premium buttons require `skuId`.
Button({ style: "premium", skuId: "100" });

// Enum-style style values are also accepted.
Button({ style: ButtonStyle.Primary, customId: "ok" });

// @ts-expect-error — link buttons can't have a customId.
Button({ style: "link", customId: "nope" });

// @ts-expect-error — interactive buttons require a customId.
Button({ style: "primary", label: "no id" });

// --- Modal -------------------------------------------------------------------

const m1 = Modal({
	title: "Survey",
	customId: "survey-modal",
	children: [TextInput({ customId: "name", label: "Name" })],
});
expectTypeOf(m1).toEqualTypeOf<ModalNode>();

Modal({
	title: "Survey",
	customId: "survey-modal",
	children: [
		TextInput({ customId: "name", label: "Name" }),
		RadioGroup({ customId: "c", label: "Pick", options: [{ value: "a", label: "A" }] }),
		CheckboxGroup({ customId: "k", label: "Topics", options: [{ value: "a", label: "A" }] }),
	],
});

// Modal children are typed as `DjsxNode` (the union) so JSX expressions can
// be passed without casting; the runtime asserts the kind is one of TextInput,
// RadioGroup, or CheckboxGroup. If we tightened the type here, you'd need to
// cast `<TextInput />` since JSX expressions are typed as the wide union.

// --- TextInput ---------------------------------------------------------------

const ti = TextInput({ customId: "name", label: "Name", style: "short", required: true });
expectTypeOf(ti).toEqualTypeOf<TextInputNode>();
expectTypeOf(ti.data.type).toEqualTypeOf<ComponentType.TextInput>();

// --- DjsxNode union sanity ---------------------------------------------------

// Every component returns a member of the DjsxNode union.
expectTypeOf<TextDisplayNode>().toMatchTypeOf<DjsxNode>();
expectTypeOf<ContainerNode>().toMatchTypeOf<DjsxNode>();
expectTypeOf<SectionNode>().toMatchTypeOf<DjsxNode>();
expectTypeOf<ButtonNode>().toMatchTypeOf<DjsxNode>();
expectTypeOf<ModalNode>().toMatchTypeOf<DjsxNode>();
