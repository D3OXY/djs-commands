/**
 * Render walker — turns a JSX node tree into a flat array of discord.js
 * builders ready for `interaction.reply({ flags: MessageFlags.IsComponentsV2,
 * components: render(<Container>...</Container>) })`.
 *
 * The walker only sees nodes produced by our component functions (or fragments
 * from the JSX runtime). Each node maps to a deterministic builder shape; we
 * always return real discord.js builders so consumers can keep chaining
 * `.set...` calls if they need to.
 */

import {
	ActionRowBuilder,
	ButtonBuilder,
	ComponentType,
	ContainerBuilder,
	FileBuilder,
	LabelBuilder,
	MediaGalleryBuilder,
	type MessageActionRowComponentBuilder,
	ModalBuilder,
	SectionBuilder,
	SeparatorBuilder,
	TextDisplayBuilder,
	TextInputBuilder,
	ThumbnailBuilder,
} from "discord.js";
import type {
	ActionRowNode,
	ButtonNode,
	ContainerNode,
	DjsxNode,
	FileNode,
	MediaGalleryNode,
	ModalNode,
	SectionNode,
	SeparatorNode,
	TextDisplayNode,
	ThumbnailNode,
	TopLevelNode,
} from "./types";

/**
 * Top-level builder union returned by `render()`. Discord.js types
 * `interaction.reply({ components })` to accept a wider set; we narrow to
 * what's valid in a Components V2 message.
 */
export type ComponentBuilderArray = (
	| ContainerBuilder
	| TextDisplayBuilder
	| SectionBuilder
	| MediaGalleryBuilder
	| SeparatorBuilder
	| FileBuilder
	| ActionRowBuilder<MessageActionRowComponentBuilder>
)[];

function buildButton(node: ButtonNode): ButtonBuilder {
	return new ButtonBuilder(node.data as ConstructorParameters<typeof ButtonBuilder>[0]);
}

function buildThumbnail(node: ThumbnailNode): ThumbnailBuilder {
	return new ThumbnailBuilder({
		type: ComponentType.Thumbnail,
		media: node.media,
		...(node.description !== undefined && { description: node.description }),
		...(node.spoiler !== undefined && { spoiler: node.spoiler }),
	});
}

function buildTextDisplay(node: TextDisplayNode): TextDisplayBuilder {
	return new TextDisplayBuilder({
		type: ComponentType.TextDisplay,
		content: node.content,
		...(node.id !== undefined && { id: node.id }),
	});
}

function buildSeparator(node: SeparatorNode): SeparatorBuilder {
	return new SeparatorBuilder({
		type: ComponentType.Separator,
		...(node.id !== undefined && { id: node.id }),
		...(node.divider !== undefined && { divider: node.divider }),
		...(node.spacing !== undefined && { spacing: node.spacing }),
	});
}

function buildFile(node: FileNode): FileBuilder {
	return new FileBuilder({
		type: ComponentType.File,
		file: { url: node.url },
		...(node.id !== undefined && { id: node.id }),
		...(node.spoiler !== undefined && { spoiler: node.spoiler }),
	});
}

function buildMediaGallery(node: MediaGalleryNode): MediaGalleryBuilder {
	return new MediaGalleryBuilder({
		type: ComponentType.MediaGallery,
		items: node.items.map((item) => ({ ...item })),
		...(node.id !== undefined && { id: node.id }),
	});
}

function buildSection(node: SectionNode): SectionBuilder {
	const builder = new SectionBuilder({
		type: ComponentType.Section,
		...(node.id !== undefined && { id: node.id }),
	});
	for (const child of node.children) {
		const content = typeof child === "string" ? child : child.content;
		const childId = typeof child === "string" ? undefined : child.id;
		builder.addTextDisplayComponents(
			new TextDisplayBuilder({
				type: ComponentType.TextDisplay,
				content,
				...(childId !== undefined && { id: childId }),
			})
		);
	}
	const accessoryNode = node.accessory;
	if (accessoryNode.$$kind === "thumbnail") {
		builder.setThumbnailAccessory(buildThumbnail(accessoryNode));
	} else {
		builder.setButtonAccessory(buildButton(accessoryNode));
	}
	return builder;
}

function buildActionRow(node: ActionRowNode): ActionRowBuilder<MessageActionRowComponentBuilder> {
	const row = new ActionRowBuilder<MessageActionRowComponentBuilder>();
	if (node.id !== undefined) {
		// Action row builders don't expose a setId method; the data field is
		// writable for component identity purposes.
		(row.data as { id?: number }).id = node.id;
	}
	for (const child of node.children) row.addComponents(buildButton(child));
	return row;
}

function buildContainer(node: ContainerNode): ContainerBuilder {
	const container = new ContainerBuilder({
		type: ComponentType.Container,
		...(node.id !== undefined && { id: node.id }),
		...(node.spoiler !== undefined && { spoiler: node.spoiler }),
	});
	if (node.accentColor !== undefined) {
		const color = Array.isArray(node.accentColor) ? (node.accentColor as unknown as [number, number, number]) : (node.accentColor as number);
		container.setAccentColor(color);
	}
	for (const child of node.children) appendChildToContainer(container, child);
	return container;
}

function appendChildToContainer(container: ContainerBuilder, child: DjsxNode): void {
	switch (child.$$kind) {
		case "fragment":
			for (const inner of child.children) appendChildToContainer(container, inner);
			return;
		case "textDisplay":
			container.addTextDisplayComponents(buildTextDisplay(child));
			return;
		case "section":
			container.addSectionComponents(buildSection(child));
			return;
		case "mediaGallery":
			container.addMediaGalleryComponents(buildMediaGallery(child));
			return;
		case "separator":
			container.addSeparatorComponents(buildSeparator(child));
			return;
		case "file":
			container.addFileComponents(buildFile(child));
			return;
		case "actionRow":
			container.addActionRowComponents(buildActionRow(child));
			return;
		default:
			throw new Error(`[djs-commands/jsx] <Container> received an unsupported child kind: ${(child as DjsxNode).$$kind}`);
	}
}

/**
 * Render a top-level JSX tree into a discord.js component array. Pass the
 * result straight to `interaction.reply({ flags: MessageFlags.IsComponentsV2,
 * components: render(tree) })`.
 *
 * Modals use `renderModal()` because their shape is different.
 */
export function render(tree: TopLevelNode | DjsxNode | readonly DjsxNode[]): ComponentBuilderArray {
	const nodes = Array.isArray(tree) ? (tree as readonly DjsxNode[]) : [tree as DjsxNode];
	const out: ComponentBuilderArray = [];
	for (const node of nodes) appendTopLevel(out, node);
	return out;
}

function appendTopLevel(out: ComponentBuilderArray, node: DjsxNode): void {
	switch (node.$$kind) {
		case "fragment":
			for (const child of node.children) appendTopLevel(out, child);
			return;
		case "container":
			out.push(buildContainer(node));
			return;
		case "textDisplay":
			out.push(buildTextDisplay(node));
			return;
		case "section":
			out.push(buildSection(node));
			return;
		case "mediaGallery":
			out.push(buildMediaGallery(node));
			return;
		case "separator":
			out.push(buildSeparator(node));
			return;
		case "file":
			out.push(buildFile(node));
			return;
		case "actionRow":
			out.push(buildActionRow(node));
			return;
		default:
			throw new Error(`[djs-commands/jsx] render() received an invalid top-level node: ${(node as DjsxNode).$$kind}`);
	}
}

/**
 * Render a `<Modal>` JSX tree into a `ModalBuilder`. Pass the result to
 * `interaction.showModal(...)` directly — discord.js accepts the builder.
 *
 * Modal children become `LabelBuilder`s wrapping the actual interactive
 * component (TextInput, RadioGroup, CheckboxGroup). Action rows in modals
 * are deprecated by Discord, so we always emit Labels.
 *
 * Accepts `DjsxNode` for symmetry with `render()` — but only `ModalNode` is
 * meaningful, so anything else throws.
 */
export function renderModal(modal: ModalNode | DjsxNode): ModalBuilder {
	if (modal.$$kind !== "modal") {
		throw new Error(`[djs-commands/jsx] renderModal() expected a <Modal> root; got ${modal.$$kind}`);
	}
	const builder = new ModalBuilder().setCustomId(modal.customId).setTitle(modal.title);
	const labels = modal.children.map(buildModalLabel);
	if (labels.length > 0) builder.addLabelComponents(...labels);
	return builder;
}

function buildModalLabel(child: ModalNode["children"][number]): LabelBuilder {
	switch (child.$$kind) {
		case "textInput": {
			// `<TextInput label="...">` flows through as `data.label` per the
			// Components V2 shape — Discord wraps the input in a Label
			// internally, so we mirror that with a LabelBuilder here.
			const labelText = child.data.label ?? "";
			const builder = new LabelBuilder().setLabel(labelText).setTextInputComponent(new TextInputBuilder(child.data));
			return builder;
		}
		case "radioGroup": {
			const builder = new LabelBuilder().setLabel(child.label);
			if (child.description !== undefined) builder.setDescription(child.description);
			builder.setRadioGroupComponent({
				type: ComponentType.RadioGroup,
				custom_id: child.customId,
				options: [...child.options],
				...(child.required !== undefined && { required: child.required }),
			});
			return builder;
		}
		case "checkboxGroup": {
			const builder = new LabelBuilder().setLabel(child.label);
			if (child.description !== undefined) builder.setDescription(child.description);
			builder.setCheckboxGroupComponent({
				type: ComponentType.CheckboxGroup,
				custom_id: child.customId,
				options: [...child.options],
				...(child.minValues !== undefined && { min_values: child.minValues }),
				...(child.maxValues !== undefined && { max_values: child.maxValues }),
				...(child.required !== undefined && { required: child.required }),
			});
			return builder;
		}
		default:
			throw new Error(`[djs-commands/jsx] <Modal> received an unsupported child kind: ${(child as DjsxNode).$$kind}`);
	}
}
