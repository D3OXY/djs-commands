/**
 * Form components — interactive inputs that appear inside ActionRows or
 * Modals: Button, ActionRow, TextInput, RadioGroup, CheckboxGroup, Modal.
 */

import { type APICheckboxGroupOption, type APIRadioGroupOption, ButtonStyle, ComponentType, TextInputStyle } from "discord.js";
import { flattenChildren } from "../internal";
import type { ActionRowNode, ButtonNode, CheckboxGroupNode, Children, DjsxNode, ModalNode, RadioGroupNode, TextInputNode } from "../types";

/**
 * Style names exposed via JSX. We accept the discord-api-types enum values
 * as well as friendlier string aliases for parity with the rest of the
 * ecosystem.
 */
export type ButtonStyleName = "primary" | "secondary" | "success" | "danger" | "link" | "premium";

const buttonStyleMap: Record<ButtonStyleName, ButtonStyle> = {
	primary: ButtonStyle.Primary,
	secondary: ButtonStyle.Secondary,
	success: ButtonStyle.Success,
	danger: ButtonStyle.Danger,
	link: ButtonStyle.Link,
	premium: ButtonStyle.Premium,
};

interface ButtonBaseProps {
	id?: number;
	label?: string;
	emoji?: { id?: string; name?: string; animated?: boolean };
	disabled?: boolean;
}

interface InteractiveButtonProps extends ButtonBaseProps {
	style: "primary" | "secondary" | "success" | "danger" | ButtonStyle.Primary | ButtonStyle.Secondary | ButtonStyle.Success | ButtonStyle.Danger;
	customId: string;
}

interface LinkButtonProps extends ButtonBaseProps {
	style: "link" | ButtonStyle.Link;
	url: string;
}

interface PremiumButtonProps extends ButtonBaseProps {
	style: "premium" | ButtonStyle.Premium;
	skuId: string;
}

/** Props for `<Button>`. Interactive buttons need `customId`; link buttons need `url`; premium buttons need `skuId`. */
export type ButtonProps = InteractiveButtonProps | LinkButtonProps | PremiumButtonProps;

function resolveButtonStyle(style: ButtonStyle | ButtonStyleName): ButtonStyle {
	return typeof style === "string" ? buttonStyleMap[style] : style;
}

/** Creates a Components V2 button node for action rows or section accessories. */
export function Button(props: ButtonProps): ButtonNode {
	const style = resolveButtonStyle(props.style);
	if (style === ButtonStyle.Link) {
		const link = props as LinkButtonProps;
		return {
			$$kind: "button",
			data: {
				type: ComponentType.Button,
				style: ButtonStyle.Link,
				url: link.url,
				...(link.id !== undefined && { id: link.id }),
				...(link.label !== undefined && { label: link.label }),
				...(link.emoji !== undefined && { emoji: link.emoji }),
				...(link.disabled !== undefined && { disabled: link.disabled }),
			},
		};
	}
	if (style === ButtonStyle.Premium) {
		const premium = props as PremiumButtonProps;
		return {
			$$kind: "button",
			data: {
				type: ComponentType.Button,
				style: ButtonStyle.Premium,
				sku_id: premium.skuId,
				...(premium.id !== undefined && { id: premium.id }),
				...(premium.disabled !== undefined && { disabled: premium.disabled }),
			},
		};
	}
	const interactive = props as InteractiveButtonProps;
	return {
		$$kind: "button",
		data: {
			type: ComponentType.Button,
			style,
			custom_id: interactive.customId,
			...(interactive.id !== undefined && { id: interactive.id }),
			...(interactive.label !== undefined && { label: interactive.label }),
			...(interactive.emoji !== undefined && { emoji: interactive.emoji }),
			...(interactive.disabled !== undefined && { disabled: interactive.disabled }),
		},
	};
}

/** Props for `<ActionRow>`. In this JSX runtime, message action rows contain buttons. */
export interface ActionRowProps {
	/** Optional Discord component ID. */
	id?: number;
	/**
	 * Accepts only `<Button>` children at runtime. Typed as `DjsxNode` so JSX
	 * expressions (which all carry that union type) compose without casts;
	 * we assert at runtime in this constructor and let the renderer surface
	 * a clear error if the assertion is bypassed.
	 */
	children?: Children<DjsxNode>;
}

/** Creates an action row node. Children must be `<Button>` nodes. */
export function ActionRow(props: ActionRowProps): ActionRowNode {
	const children = flattenChildren(props.children);
	for (const child of children) {
		if (child.$$kind !== "button") {
			throw new Error(`[djs-commands/jsx] <ActionRow> children must be <Button> nodes; got ${child.$$kind}`);
		}
	}
	return {
		$$kind: "actionRow",
		id: props.id,
		children: children as readonly ButtonNode[],
	};
}

/** Friendly text input style aliases accepted by `<TextInput>`. */
export type TextInputStyleName = "short" | "paragraph";

const textInputStyleMap: Record<TextInputStyleName, TextInputStyle> = {
	short: TextInputStyle.Short,
	paragraph: TextInputStyle.Paragraph,
};

/** Props for `<TextInput>`, used inside `<Modal>`. */
export interface TextInputProps {
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

/** Creates a modal text input node. */
export function TextInput(props: TextInputProps): TextInputNode {
	const rawStyle = props.style ?? "short";
	const style = typeof rawStyle === "string" ? textInputStyleMap[rawStyle] : rawStyle;
	return {
		$$kind: "textInput",
		data: {
			type: ComponentType.TextInput,
			style,
			custom_id: props.customId,
			...(props.id !== undefined && { id: props.id }),
			...(props.label !== undefined && { label: props.label }),
			...(props.placeholder !== undefined && { placeholder: props.placeholder }),
			...(props.value !== undefined && { value: props.value }),
			...(props.minLength !== undefined && { min_length: props.minLength }),
			...(props.maxLength !== undefined && { max_length: props.maxLength }),
			...(props.required !== undefined && { required: props.required }),
		},
	};
}

/** Props for `<RadioGroup>`, used inside Components V2 modals. */
export interface RadioGroupProps {
	/** Developer-defined ID returned in modal submit interactions. */
	customId: string;
	/** Label text shown above the group inside a modal — required by Discord. */
	label: string;
	/** Optional helper text. */
	description?: string;
	/** Discord radio options. */
	options: readonly APIRadioGroupOption[];
	/** Whether Discord requires a selection. */
	required?: boolean;
}

/** Creates a modal radio group node. */
export function RadioGroup(props: RadioGroupProps): RadioGroupNode {
	return {
		$$kind: "radioGroup",
		customId: props.customId,
		label: props.label,
		...(props.description !== undefined && { description: props.description }),
		options: props.options,
		...(props.required !== undefined && { required: props.required }),
	};
}

/** Props for `<CheckboxGroup>`, used inside Components V2 modals. */
export interface CheckboxGroupProps {
	/** Developer-defined ID returned in modal submit interactions. */
	customId: string;
	/** Label text shown above the group inside a modal — required by Discord. */
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

/** Creates a modal checkbox group node. */
export function CheckboxGroup(props: CheckboxGroupProps): CheckboxGroupNode {
	return {
		$$kind: "checkboxGroup",
		customId: props.customId,
		label: props.label,
		...(props.description !== undefined && { description: props.description }),
		options: props.options,
		...(props.minValues !== undefined && { minValues: props.minValues }),
		...(props.maxValues !== undefined && { maxValues: props.maxValues }),
		...(props.required !== undefined && { required: props.required }),
	};
}

/** Props for `<Modal>`. Children must be form inputs/groups, not message components. */
export interface ModalProps {
	/** Modal title shown by Discord. */
	title: string;
	/** Developer-defined ID returned in modal submit interactions. */
	customId: string;
	/**
	 * Accepts only `<TextInput>`, `<RadioGroup>`, and `<CheckboxGroup>`
	 * children at runtime. Typed as `DjsxNode` to play nicely with the JSX
	 * automatic transform — see the comment on `ActionRowProps.children`.
	 */
	children?: Children<DjsxNode>;
}

/** Creates a modal node for `renderModal()`. */
export function Modal(props: ModalProps): ModalNode {
	const children = flattenChildren(props.children);
	for (const child of children) {
		if (child.$$kind !== "textInput" && child.$$kind !== "radioGroup" && child.$$kind !== "checkboxGroup") {
			throw new Error(`[djs-commands/jsx] <Modal> children must be <TextInput>, <RadioGroup>, or <CheckboxGroup>; got ${child.$$kind}`);
		}
	}
	return {
		$$kind: "modal",
		title: props.title,
		customId: props.customId,
		children: children as readonly (TextInputNode | RadioGroupNode | CheckboxGroupNode)[],
	};
}
