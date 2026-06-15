/**
 * Function-API fallback for Components V2.
 *
 * This module ships from `@djs-commands/core` so consumers who can't (or won't)
 * enable a JSX pragma still get a typed surface for building V2 messages. It
 * produces the same `discord.js` builder objects as `@djs-commands/jsx`'s
 * renderer, so users may freely mix the two without worrying about parity.
 *
 * Important: core does NOT depend on `@djs-commands/jsx`. The functions here
 * are independent factories — there's no shared runtime.
 */

import {
	ActionRowBuilder,
	type APIButtonComponent,
	type APICheckboxGroupOption,
	type APIMediaGalleryItem,
	type APIRadioGroupOption,
	ButtonBuilder,
	ButtonStyle,
	ComponentType,
	ContainerBuilder,
	FileBuilder,
	LabelBuilder,
	MediaGalleryBuilder,
	type MessageActionRowComponentBuilder,
	ModalBuilder,
	SectionBuilder,
	SeparatorBuilder,
	type SeparatorSpacingSize,
	TextDisplayBuilder,
	TextInputBuilder,
	TextInputStyle,
	ThumbnailBuilder,
} from "discord.js";

// --- Display components ------------------------------------------------------

/** Options for a Components V2 container. Containers can hold layout/display components and action rows. */
export interface ContainerOptions {
	/** Optional accent bar color as `0xRRGGBB` or RGB tuple. */
	accentColor?: number | readonly [number, number, number];
	/** Whether Discord should blur the container behind a spoiler veil. */
	spoiler?: boolean;
	/** Optional Discord component ID. */
	id?: number;
	/** Direct child builders allowed by Discord inside a container. */
	children?: readonly ContainerChild[];
}

/**
 * Children accepted by `container()`. These are the discord.js builders that
 * Components V2 allows as direct children of a container.
 */
export type ContainerChild = TextDisplayBuilder | SectionBuilder | MediaGalleryBuilder | SeparatorBuilder | FileBuilder | ActionRowBuilder<MessageActionRowComponentBuilder>;

/**
 * Builds a Components V2 `ContainerBuilder`.
 *
 * @example
 * ```ts
 * container({ children: [textDisplay("# Hi"), actionRow({ children: [button({ style: "primary", customId: "ok", label: "OK" })] })] });
 * ```
 */
export function container(options: ContainerOptions = {}): ContainerBuilder {
	const builder = new ContainerBuilder({
		type: ComponentType.Container,
		...(options.id !== undefined && { id: options.id }),
		...(options.spoiler !== undefined && { spoiler: options.spoiler }),
	});
	if (options.accentColor !== undefined) {
		const color = Array.isArray(options.accentColor) ? (options.accentColor as unknown as [number, number, number]) : (options.accentColor as number);
		builder.setAccentColor(color);
	}
	for (const child of options.children ?? []) appendContainerChild(builder, child);
	return builder;
}

function appendContainerChild(builder: ContainerBuilder, child: ContainerChild): void {
	if (child instanceof TextDisplayBuilder) {
		builder.addTextDisplayComponents(child);
	} else if (child instanceof SectionBuilder) {
		builder.addSectionComponents(child);
	} else if (child instanceof MediaGalleryBuilder) {
		builder.addMediaGalleryComponents(child);
	} else if (child instanceof SeparatorBuilder) {
		builder.addSeparatorComponents(child);
	} else if (child instanceof FileBuilder) {
		builder.addFileComponents(child);
	} else if (child instanceof ActionRowBuilder) {
		builder.addActionRowComponents(child);
	} else {
		throw new Error("[djs-commands] container(): unsupported child builder");
	}
}

/** Options for a Components V2 section. Discord allows exactly one button or thumbnail accessory. */
export interface SectionOptions {
	/** Button or thumbnail shown beside the section text. */
	accessory: ButtonBuilder | ThumbnailBuilder;
	/** Optional Discord component ID. */
	id?: number;
	/** One or more text display rows inside the section. */
	text: string | readonly string[];
}

/** Builds a Components V2 `SectionBuilder` with text and one accessory. */
export function section(options: SectionOptions): SectionBuilder {
	const builder = new SectionBuilder({
		type: ComponentType.Section,
		...(options.id !== undefined && { id: options.id }),
	});
	const lines = Array.isArray(options.text) ? options.text : [options.text as string];
	for (const line of lines) {
		builder.addTextDisplayComponents(
			new TextDisplayBuilder({
				type: ComponentType.TextDisplay,
				content: line,
			})
		);
	}
	if (options.accessory instanceof ThumbnailBuilder) {
		builder.setThumbnailAccessory(options.accessory);
	} else {
		builder.setButtonAccessory(options.accessory);
	}
	return builder;
}

/** Builds a Components V2 text display builder. Markdown is supported by Discord. */
export function textDisplay(content: string, options: { id?: number } = {}): TextDisplayBuilder {
	return new TextDisplayBuilder({
		type: ComponentType.TextDisplay,
		content,
		...(options.id !== undefined && { id: options.id }),
	});
}

/** Options for a Components V2 media gallery. */
export interface MediaGalleryOptions {
	/** Raw Discord media gallery items. Discord currently accepts up to 10. */
	items: readonly APIMediaGalleryItem[];
	/** Optional Discord component ID. */
	id?: number;
}

/** Builds a Components V2 media gallery builder. */
export function mediaGallery(options: MediaGalleryOptions): MediaGalleryBuilder {
	return new MediaGalleryBuilder({
		type: ComponentType.MediaGallery,
		items: options.items.map((item) => ({ ...item })),
		...(options.id !== undefined && { id: options.id }),
	});
}

/** Options for a Components V2 separator. */
export interface SeparatorOptions {
	/** Optional Discord component ID. */
	id?: number;
	/** Whether to show a divider line. */
	divider?: boolean;
	/** Discord separator spacing value. */
	spacing?: SeparatorSpacingSize;
}

/** Builds a Components V2 separator builder. */
export function separator(options: SeparatorOptions = {}): SeparatorBuilder {
	return new SeparatorBuilder({
		type: ComponentType.Separator,
		...(options.id !== undefined && { id: options.id }),
		...(options.divider !== undefined && { divider: options.divider }),
		...(options.spacing !== undefined && { spacing: options.spacing }),
	});
}

/** Options for a Components V2 file attachment reference. */
export interface FileOptions {
	/** Attachment URL, usually `attachment://filename.ext`. */
	url: string;
	/** Optional Discord component ID. */
	id?: number;
	/** Whether Discord should mark the file as a spoiler. */
	spoiler?: boolean;
}

/** Builds a Components V2 file builder. The file must refer to an attachment supplied with the message. */
export function file(options: FileOptions): FileBuilder {
	return new FileBuilder({
		type: ComponentType.File,
		file: { url: options.url },
		...(options.id !== undefined && { id: options.id }),
		...(options.spoiler !== undefined && { spoiler: options.spoiler }),
	});
}

/** Options for a Components V2 thumbnail accessory. */
export interface ThumbnailOptions {
	/** Image URL for the thumbnail. */
	url: string;
	/** Alt/description text for the image. */
	description?: string;
	/** Whether Discord should blur the thumbnail behind a spoiler veil. */
	spoiler?: boolean;
}

/** Builds a thumbnail accessory for `section()`. */
export function thumbnail(options: ThumbnailOptions): ThumbnailBuilder {
	return new ThumbnailBuilder({
		type: ComponentType.Thumbnail,
		media: { url: options.url },
		...(options.description !== undefined && { description: options.description }),
		...(options.spoiler !== undefined && { spoiler: options.spoiler }),
	});
}

// --- Form components --------------------------------------------------------

/** Friendly button style aliases accepted by `button()`. */
export type ButtonStyleName = "primary" | "secondary" | "success" | "danger" | "link" | "premium";

const buttonStyleMap: Record<ButtonStyleName, ButtonStyle> = {
	primary: ButtonStyle.Primary,
	secondary: ButtonStyle.Secondary,
	success: ButtonStyle.Success,
	danger: ButtonStyle.Danger,
	link: ButtonStyle.Link,
	premium: ButtonStyle.Premium,
};

interface ButtonBaseOptions {
	id?: number;
	label?: string;
	emoji?: { id?: string; name?: string; animated?: boolean };
	disabled?: boolean;
}

interface InteractiveButtonOptions extends ButtonBaseOptions {
	style: "primary" | "secondary" | "success" | "danger" | ButtonStyle.Primary | ButtonStyle.Secondary | ButtonStyle.Success | ButtonStyle.Danger;
	customId: string;
}

interface LinkButtonOptions extends ButtonBaseOptions {
	style: "link" | ButtonStyle.Link;
	url: string;
}

interface PremiumButtonOptions extends ButtonBaseOptions {
	style: "premium" | ButtonStyle.Premium;
	skuId: string;
}

/** Options for a Components V2 button. Interactive buttons need `customId`; link buttons need `url`; premium buttons need `skuId`. */
export type ButtonOptions = InteractiveButtonOptions | LinkButtonOptions | PremiumButtonOptions;

function resolveButtonStyle(style: ButtonStyle | ButtonStyleName): ButtonStyle {
	return typeof style === "string" ? buttonStyleMap[style] : style;
}

/** Builds a Discord button builder for action rows or section accessories. */
export function button(options: ButtonOptions): ButtonBuilder {
	const style = resolveButtonStyle(options.style);
	let data: APIButtonComponent;
	if (style === ButtonStyle.Link) {
		const link = options as LinkButtonOptions;
		data = {
			type: ComponentType.Button,
			style: ButtonStyle.Link,
			url: link.url,
			...(link.id !== undefined && { id: link.id }),
			...(link.label !== undefined && { label: link.label }),
			...(link.emoji !== undefined && { emoji: link.emoji }),
			...(link.disabled !== undefined && { disabled: link.disabled }),
		};
	} else if (style === ButtonStyle.Premium) {
		const premium = options as PremiumButtonOptions;
		data = {
			type: ComponentType.Button,
			style: ButtonStyle.Premium,
			sku_id: premium.skuId,
			...(premium.id !== undefined && { id: premium.id }),
			...(premium.disabled !== undefined && { disabled: premium.disabled }),
		};
	} else {
		const interactive = options as InteractiveButtonOptions;
		data = {
			type: ComponentType.Button,
			style,
			custom_id: interactive.customId,
			...(interactive.id !== undefined && { id: interactive.id }),
			...(interactive.label !== undefined && { label: interactive.label }),
			...(interactive.emoji !== undefined && { emoji: interactive.emoji }),
			...(interactive.disabled !== undefined && { disabled: interactive.disabled }),
		};
	}
	return new ButtonBuilder(data as ConstructorParameters<typeof ButtonBuilder>[0]);
}

/** Options for a Components V2 action row. Discord message action rows contain buttons here. */
export interface ActionRowOptions {
	/** Optional Discord component ID. */
	id?: number;
	/** Buttons to place in the row. */
	children: readonly ButtonBuilder[];
}

/** Builds an action row of buttons for use inside a container or as a top-level component. */
export function actionRow(options: ActionRowOptions): ActionRowBuilder<MessageActionRowComponentBuilder> {
	const row = new ActionRowBuilder<MessageActionRowComponentBuilder>();
	if (options.id !== undefined) (row.data as { id?: number }).id = options.id;
	for (const child of options.children) row.addComponents(child);
	return row;
}

/** Friendly text input style aliases accepted by `textInput()`. */
export type TextInputStyleName = "short" | "paragraph";

const textInputStyleMap: Record<TextInputStyleName, TextInputStyle> = {
	short: TextInputStyle.Short,
	paragraph: TextInputStyle.Paragraph,
};

/** Options for a modal text input. Components V2 modals wrap inputs in labels. */
export interface TextInputOptions {
	/** Developer-defined ID returned in modal submit interactions. */
	customId: string;
	/** Label text shown by Discord. */
	label?: string;
	/** Short or paragraph input style. Defaults to `short`. */
	style?: TextInputStyle | TextInputStyleName;
	/** Placeholder text shown before the user types. */
	placeholder?: string;
	/** Pre-filled value. */
	value?: string;
	/** Minimum accepted character count. */
	minLength?: number;
	/** Maximum accepted character count. */
	maxLength?: number;
	/** Whether Discord requires a value. */
	required?: boolean;
	/** Optional Discord component ID. */
	id?: number;
}

/** Builds a text input for `modal()`. */
export function textInput(options: TextInputOptions): TextInputBuilder {
	const rawStyle = options.style ?? "short";
	const style = typeof rawStyle === "string" ? textInputStyleMap[rawStyle] : rawStyle;
	return new TextInputBuilder({
		type: ComponentType.TextInput,
		style,
		custom_id: options.customId,
		...(options.id !== undefined && { id: options.id }),
		...(options.label !== undefined && { label: options.label }),
		...(options.placeholder !== undefined && { placeholder: options.placeholder }),
		...(options.value !== undefined && { value: options.value }),
		...(options.minLength !== undefined && { min_length: options.minLength }),
		...(options.maxLength !== undefined && { max_length: options.maxLength }),
		...(options.required !== undefined && { required: options.required }),
	});
}

/** Options for a Components V2 modal radio group. */
export interface RadioGroupOptions {
	/** Developer-defined ID returned in modal submit interactions. */
	customId: string;
	/** Label text shown above the group. */
	label: string;
	/** Optional helper text. */
	description?: string;
	/** Discord radio options. */
	options: readonly APIRadioGroupOption[];
	/** Whether Discord requires a selection. */
	required?: boolean;
}

/** Builds a labeled radio group for `modal()`. */
export function radioGroup(opts: RadioGroupOptions): LabelBuilder {
	const builder = new LabelBuilder().setLabel(opts.label);
	if (opts.description !== undefined) builder.setDescription(opts.description);
	builder.setRadioGroupComponent({
		type: ComponentType.RadioGroup,
		custom_id: opts.customId,
		options: [...opts.options],
		...(opts.required !== undefined && { required: opts.required }),
	});
	return builder;
}

/** Options for a Components V2 modal checkbox group. */
export interface CheckboxGroupOptions {
	/** Developer-defined ID returned in modal submit interactions. */
	customId: string;
	/** Label text shown above the group. */
	label: string;
	/** Optional helper text. */
	description?: string;
	/** Discord checkbox options. */
	options: readonly APICheckboxGroupOption[];
	/** Minimum number of selected values. */
	minValues?: number;
	/** Maximum number of selected values. */
	maxValues?: number;
	/** Whether Discord requires a selection. */
	required?: boolean;
}

/** Builds a labeled checkbox group for `modal()`. */
export function checkboxGroup(opts: CheckboxGroupOptions): LabelBuilder {
	const builder = new LabelBuilder().setLabel(opts.label);
	if (opts.description !== undefined) builder.setDescription(opts.description);
	builder.setCheckboxGroupComponent({
		type: ComponentType.CheckboxGroup,
		custom_id: opts.customId,
		options: [...opts.options],
		...(opts.minValues !== undefined && { min_values: opts.minValues }),
		...(opts.maxValues !== undefined && { max_values: opts.maxValues }),
		...(opts.required !== undefined && { required: opts.required }),
	});
	return builder;
}

/** Options for a Components V2 modal. */
export interface ModalOptions {
	/** Modal title shown by Discord. */
	title: string;
	/** Developer-defined ID returned in modal submit interactions. */
	customId: string;
	/**
	 * Either a `LabelBuilder` (preferred — wraps a single interactive
	 * component) or a `TextInputBuilder` (which we'll wrap in a label using
	 * the input's own label text).
	 */
	fields: readonly (LabelBuilder | TextInputBuilder)[];
}

/** Builds a Discord modal. Fields are emitted as Components V2 labels, not legacy modal action rows. */
export function modal(options: ModalOptions): ModalBuilder {
	const builder = new ModalBuilder().setCustomId(options.customId).setTitle(options.title);
	const labels: LabelBuilder[] = [];
	for (const field of options.fields) {
		if (field instanceof LabelBuilder) {
			labels.push(field);
		} else {
			const inputJSON = field.toJSON();
			labels.push(new LabelBuilder().setLabel(inputJSON.label ?? "").setTextInputComponent(field));
		}
	}
	if (labels.length > 0) builder.addLabelComponents(...labels);
	return builder;
}
