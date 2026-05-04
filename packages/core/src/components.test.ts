import { describe, expect, test } from "bun:test";
import { ButtonStyle, ComponentType, ContainerBuilder, ModalBuilder, TextInputStyle } from "discord.js";
import { actionRow, button, checkboxGroup, container, file, mediaGallery, modal, radioGroup, section, separator, textDisplay, textInput, thumbnail } from "./components";

describe("function-API fallback — Components V2", () => {
	test("container() produces the same shape as the JSX runtime", () => {
		const built = container({
			accentColor: 0x5865f2,
			id: 1,
			children: [
				textDisplay("# Heading", { id: 10 }),
				section({
					id: 11,
					accessory: button({ style: "primary", customId: "go", label: "Go" }),
					text: "body text",
				}),
				mediaGallery({ items: [{ media: { url: "https://example.com/a.png" } }] }),
				separator({ divider: true, spacing: 1 }),
				file({ url: "attachment://file.txt" }),
				actionRow({ children: [button({ style: "secondary", customId: "x", label: "X" })] }),
			],
		});

		expect(built).toBeInstanceOf(ContainerBuilder);
		expect(built.toJSON()).toMatchObject({
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

	test("section() supports a thumbnail accessory", () => {
		const built = section({
			accessory: thumbnail({ url: "https://example.com/t.png", description: "alt" }),
			text: ["line one", "line two"],
		});
		expect(built.toJSON()).toMatchObject({
			type: ComponentType.Section,
			accessory: { type: ComponentType.Thumbnail, media: { url: "https://example.com/t.png" }, description: "alt" },
			components: [
				{ type: ComponentType.TextDisplay, content: "line one" },
				{ type: ComponentType.TextDisplay, content: "line two" },
			],
		});
	});

	test("modal() wraps text inputs in labels using each input's own label text", () => {
		const built = modal({
			title: "Feedback",
			customId: "feedback",
			fields: [textInput({ customId: "subject", label: "Subject", style: "short", required: true }), textInput({ customId: "body", label: "Body", style: "paragraph" })],
		});
		expect(built).toBeInstanceOf(ModalBuilder);
		expect(built.toJSON()).toMatchObject({
			title: "Feedback",
			custom_id: "feedback",
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

	test("radioGroup() and checkboxGroup() return prebuilt LabelBuilders", () => {
		const built = modal({
			title: "Survey",
			customId: "survey",
			fields: [
				radioGroup({
					customId: "color",
					label: "Pick a color",
					options: [
						{ value: "r", label: "Red" },
						{ value: "b", label: "Blue" },
					],
				}),
				checkboxGroup({
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
		const json = built.toJSON();
		expect(json.components).toEqual([
			expect.objectContaining({
				type: ComponentType.Label,
				label: "Pick a color",
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
				label: "Topics of interest",
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

	test("button() handles link and premium variants", () => {
		const link = button({ style: "link", url: "https://example.com", label: "Open" }).toJSON();
		expect(link).toMatchObject({
			type: ComponentType.Button,
			style: ButtonStyle.Link,
			url: "https://example.com",
			label: "Open",
		});

		const premium = button({ style: "premium", skuId: "1234" }).toJSON();
		expect(premium).toMatchObject({
			type: ComponentType.Button,
			style: ButtonStyle.Premium,
			sku_id: "1234",
		});
	});
});
