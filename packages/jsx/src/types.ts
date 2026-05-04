/**
 * Shared types for the @djs-commands/jsx runtime.
 *
 * Components V2 elements are represented as tagged plain objects ("nodes").
 * `render()` walks the tree and produces actual discord.js builders.
 *
 * Why not lazy {type, props} like React? We don't need reconciliation, so
 * components are just plain functions that return a normalized node. This
 * keeps the runtime trivial (no scheduler, no fiber tree) and lets users
 * mix JSX and the function-API fallback freely.
 */

import type {
	APIButtonComponent,
	APICheckboxGroupOption,
	APIMediaGalleryItem,
	APIRadioGroupOption,
	APISeparatorComponent,
	APITextInputComponent,
	APIUnfurledMediaItem,
} from "discord.js";

export type Spacing = APISeparatorComponent["spacing"];

export interface FragmentNode {
	readonly $$kind: "fragment";
	readonly children: readonly DjsxNode[];
}

export interface ContainerNode {
	readonly $$kind: "container";
	readonly accentColor?: number | readonly [number, number, number];
	readonly spoiler?: boolean;
	readonly id?: number;
	readonly children: readonly DjsxNode[];
}

export interface SectionNode {
	readonly $$kind: "section";
	readonly id?: number;
	readonly accessory: ButtonNode | ThumbnailNode;
	readonly children: readonly (TextDisplayNode | string)[];
}

export interface TextDisplayNode {
	readonly $$kind: "textDisplay";
	readonly id?: number;
	readonly content: string;
}

export interface MediaGalleryNode {
	readonly $$kind: "mediaGallery";
	readonly id?: number;
	readonly items: readonly APIMediaGalleryItem[];
}

export interface SeparatorNode {
	readonly $$kind: "separator";
	readonly id?: number;
	readonly divider?: boolean;
	readonly spacing?: Spacing;
}

export interface FileNode {
	readonly $$kind: "file";
	readonly id?: number;
	readonly url: string;
	readonly spoiler?: boolean;
}

export interface ThumbnailNode {
	readonly $$kind: "thumbnail";
	readonly media: APIUnfurledMediaItem;
	readonly description?: string;
	readonly spoiler?: boolean;
}

export interface ActionRowNode {
	readonly $$kind: "actionRow";
	readonly id?: number;
	readonly children: readonly ButtonNode[];
}

export interface ButtonNode {
	readonly $$kind: "button";
	readonly data: APIButtonComponent;
}

export interface TextInputNode {
	readonly $$kind: "textInput";
	readonly data: APITextInputComponent;
}

export interface RadioGroupNode {
	readonly $$kind: "radioGroup";
	readonly customId: string;
	readonly label: string;
	readonly description?: string;
	readonly options: readonly APIRadioGroupOption[];
	readonly required?: boolean;
}

export interface CheckboxGroupNode {
	readonly $$kind: "checkboxGroup";
	readonly customId: string;
	readonly label: string;
	readonly description?: string;
	readonly options: readonly APICheckboxGroupOption[];
	readonly minValues?: number;
	readonly maxValues?: number;
	readonly required?: boolean;
}

export interface ModalNode {
	readonly $$kind: "modal";
	readonly title: string;
	readonly customId: string;
	readonly children: readonly (TextInputNode | RadioGroupNode | CheckboxGroupNode)[];
}

/**
 * Any node the JSX runtime may produce. Strings are accepted in a few specific
 * places (e.g. as `<TextDisplay>` children) and are treated as the `content`
 * field there.
 */
export type DjsxNode =
	| FragmentNode
	| ContainerNode
	| SectionNode
	| TextDisplayNode
	| MediaGalleryNode
	| SeparatorNode
	| FileNode
	| ThumbnailNode
	| ActionRowNode
	| ButtonNode
	| TextInputNode
	| RadioGroupNode
	| CheckboxGroupNode
	| ModalNode;

/**
 * The set of nodes that can sit at the top level of a `<Container>` or be
 * passed directly to `render()`.
 */
export type TopLevelNode = ContainerNode | SectionNode | TextDisplayNode | MediaGalleryNode | SeparatorNode | FileNode | ActionRowNode | FragmentNode;

/** Children helpers — JSX runtime collapses single-child to a non-array. */
export type Children<T> = T | readonly T[];
