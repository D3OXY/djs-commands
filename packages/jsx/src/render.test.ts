import { describe, expect, test } from "bun:test";
import { ButtonStyle, ComponentType, ContainerBuilder, ModalBuilder, TextDisplayBuilder, TextInputStyle } from "discord.js";
import { Container, File, MediaGallery, Section, Separator, TextDisplay, Thumbnail } from "./components/display";
import { ActionRow, Button, CheckboxGroup, Modal, RadioGroup, TextInput } from "./components/forms";
import { Fragment } from "./jsx-runtime";
import { render, renderModal } from "./render";

describe("render() — top-level builders", () => {
	test("returns a TextDisplayBuilder for a top-level <TextDisplay>", () => {
		const out = render(TextDisplay({ children: "hello" }));
		expect(out).toHaveLength(1);
		const first = out[0];
		expect(first).toBeInstanceOf(TextDisplayBuilder);
		expect(first?.toJSON()).toEqual({ type: ComponentType.TextDisplay, content: "hello" });
	});

	test("flattens fragments at the top level", () => {
		const out = render(
			Fragment({
				children: [TextDisplay({ children: "a" }), TextDisplay({ children: "b" })],
			})
		);
		expect(out).toHaveLength(2);
		expect(out[0]?.toJSON()).toMatchObject({ content: "a" });
		expect(out[1]?.toJSON()).toMatchObject({ content: "b" });
	});

	test("accepts an array of nodes", () => {
		const out = render([TextDisplay({ children: "a" }), Separator()]);
		expect(out).toHaveLength(2);
	});
});

describe("render() — Container shape", () => {
	test("renders a full container with all V2 child types", () => {
		const tree = Container({
			accentColor: 0x5865f2,
			id: 1,
			children: [
				TextDisplay({ id: 10, children: "# Heading" }),
				Section({
					id: 11,
					accessory: Button({ style: "primary", customId: "go", label: "Go" }),
					children: ["body text"],
				}),
				MediaGallery({ items: [{ media: { url: "https://example.com/a.png" } }] }),
				Separator({ divider: true, spacing: 1 }),
				File({ url: "attachment://file.txt" }),
				ActionRow({ children: [Button({ style: "secondary", customId: "x", label: "X" })] }),
			],
		});
		const out = render(tree);
		expect(out).toHaveLength(1);
		const first = out[0];
		expect(first).toBeInstanceOf(ContainerBuilder);
		const json = first?.toJSON();
		expect(json).toMatchObject({
			type: ComponentType.Container,
			id: 1,
			accent_color: 0x5865f2,
			components: [
				{ type: ComponentType.TextDisplay, content: "# Heading", id: 10 },
				{
					type: ComponentType.Section,
					id: 11,
					accessory: { type: ComponentType.Button, style: ButtonStyle.Primary, custom_id: "go", label: "Go" },
					components: [{ type: ComponentType.TextDisplay, content: "body text" }],
				},
				{ type: ComponentType.MediaGallery, items: [{ media: { url: "https://example.com/a.png" } }] },
				{ type: ComponentType.Separator, divider: true, spacing: 1 },
				{ type: ComponentType.File, file: { url: "attachment://file.txt" } },
				{
					type: ComponentType.ActionRow,
					components: [{ type: ComponentType.Button, style: ButtonStyle.Secondary, custom_id: "x", label: "X" }],
				},
			],
		});
	});

	test("supports a thumbnail accessory in <Section>", () => {
		const tree = Container({
			children: [
				Section({
					accessory: Thumbnail({ url: "https://example.com/thumb.png", description: "alt" }),
					children: ["text"],
				}),
			],
		});
		const json = render(tree)[0]?.toJSON();
		expect(json).toMatchObject({
			components: [
				{
					type: ComponentType.Section,
					accessory: { type: ComponentType.Thumbnail, media: { url: "https://example.com/thumb.png" }, description: "alt" },
				},
			],
		});
	});
});

describe("Button — link and premium variants", () => {
	test("link button serializes with url instead of custom_id", () => {
		const tree = ActionRow({ children: [Button({ style: "link", url: "https://example.com", label: "Open" })] });
		const json = render(tree)[0]?.toJSON();
		expect(json).toMatchObject({
			type: ComponentType.ActionRow,
			components: [{ type: ComponentType.Button, style: ButtonStyle.Link, url: "https://example.com", label: "Open" }],
		});
	});

	test("premium button serializes with sku_id", () => {
		const tree = ActionRow({ children: [Button({ style: "premium", skuId: "1234" })] });
		const json = render(tree)[0]?.toJSON();
		expect(json).toMatchObject({
			components: [{ type: ComponentType.Button, style: ButtonStyle.Premium, sku_id: "1234" }],
		});
	});
});

describe("renderModal()", () => {
	test("renders text input fields wrapped in labels", () => {
		const tree = Modal({
			title: "Feedback",
			customId: "feedback-modal",
			children: [TextInput({ customId: "subject", label: "Subject", style: "short", required: true }), TextInput({ customId: "body", label: "Body", style: "paragraph" })],
		});
		const builder = renderModal(tree);
		expect(builder).toBeInstanceOf(ModalBuilder);
		const json = builder.toJSON();
		expect(json).toMatchObject({
			title: "Feedback",
			custom_id: "feedback-modal",
			components: [
				{
					type: ComponentType.Label,
					label: "Subject",
					component: { type: ComponentType.TextInput, custom_id: "subject", style: TextInputStyle.Short, required: true },
				},
				{
					type: ComponentType.Label,
					label: "Body",
					component: { type: ComponentType.TextInput, custom_id: "body", style: TextInputStyle.Paragraph },
				},
			],
		});
	});

	test("renders radio + checkbox groups via setRadioGroupComponent / setCheckboxGroupComponent", () => {
		const tree = Modal({
			title: "Survey",
			customId: "survey",
			children: [
				RadioGroup({
					customId: "color",
					label: "Pick a color",
					options: [
						{ value: "r", label: "Red" },
						{ value: "b", label: "Blue" },
					],
				}),
				CheckboxGroup({
					customId: "topics",
					label: "Topics of interest",
					options: [
						{ value: "ts", label: "TS" },
						{ value: "js", label: "JS" },
					],
					minValues: 1,
					maxValues: 2,
				}),
			],
		});
		const json = renderModal(tree).toJSON();
		expect(json.components).toEqual([
			expect.objectContaining({
				type: ComponentType.Label,
				component: expect.objectContaining({
					type: ComponentType.RadioGroup,
					custom_id: "color",
					options: [
						{ value: "r", label: "Red" },
						{ value: "b", label: "Blue" },
					],
				}),
			}),
			expect.objectContaining({
				type: ComponentType.Label,
				component: expect.objectContaining({
					type: ComponentType.CheckboxGroup,
					custom_id: "topics",
					options: [
						{ value: "ts", label: "TS" },
						{ value: "js", label: "JS" },
					],
					min_values: 1,
					max_values: 2,
				}),
			}),
		]);
	});
});

describe("error paths", () => {
	test("render() throws on a node that isn't a valid top-level component", () => {
		// Hand-craft a node that the runtime would never produce normally.
		// biome-ignore lint/suspicious/noExplicitAny: forcing an invalid shape for the negative test
		const invalid = { $$kind: "thumbnail", media: { url: "x" } } as any;
		expect(() => render(invalid)).toThrow(/invalid top-level node/);
	});
});
