/**
 * Display components — the top-level layout primitives that go in messages.
 *
 * These map 1:1 onto Components V2 layout types: Container, Section,
 * TextDisplay, MediaGallery, Separator, File. Each component is a pure
 * function returning a tagged node; the actual builder construction happens
 * in `../render.ts`.
 */

import type { APIMediaGalleryItem } from "discord.js";
import { flattenChildren } from "../internal";
import type { ButtonNode, Children, ContainerNode, DjsxNode, FileNode, MediaGalleryNode, SectionNode, SeparatorNode, Spacing, TextDisplayNode, ThumbnailNode } from "../types";

export interface ContainerProps {
	/** Optional 0xRRGGBB number or RGB triple for the accent bar. */
	accentColor?: number | readonly [number, number, number];
	/** Whether the container should be blurred behind a spoiler veil. */
	spoiler?: boolean;
	/** Stable component id — useful for referencing within an interaction response. */
	id?: number;
	children?: Children<DjsxNode>;
}

export function Container(props: ContainerProps): ContainerNode {
	return {
		$$kind: "container",
		accentColor: props.accentColor,
		spoiler: props.spoiler,
		id: props.id,
		children: flattenChildren(props.children),
	};
}

export interface SectionProps {
	/**
	 * The accessory rendered to the right of the text. Discord currently
	 * accepts a Button or a Thumbnail; we widen the type to `DjsxNode` so
	 * that JSX expressions (typed as the union) compose without casting,
	 * and assert at the runtime layer in `render.ts`.
	 */
	accessory: DjsxNode;
	id?: number;
	children?: Children<TextDisplayNode | string>;
}

export function Section(props: SectionProps): SectionNode {
	const accessory = props.accessory;
	if (accessory.$$kind !== "button" && accessory.$$kind !== "thumbnail") {
		throw new Error(`[djs-commands/jsx] <Section accessory={...}> must be a <Button> or <Thumbnail>; got ${accessory.$$kind}`);
	}
	return {
		$$kind: "section",
		id: props.id,
		accessory: accessory as ButtonNode | ThumbnailNode,
		children: flattenChildren(props.children),
	};
}

type TextLiteral = string | number | boolean;

export interface TextDisplayProps {
	id?: number;
	/**
	 * Markdown content. JSX children are concatenated into a single string,
	 * so `<TextDisplay>Hello, {name}!</TextDisplay>` works as expected.
	 */
	children?: TextLiteral | readonly TextLiteral[];
}

export function TextDisplay(props: TextDisplayProps): TextDisplayNode {
	const raw = props.children;
	const arr = raw === undefined ? [] : Array.isArray(raw) ? (raw as readonly TextLiteral[]) : [raw as TextLiteral];
	return {
		$$kind: "textDisplay",
		id: props.id,
		content: arr.map((c) => String(c)).join(""),
	};
}

export interface MediaGalleryProps {
	id?: number;
	/**
	 * 1-10 media items. Each item is the raw `APIMediaGalleryItem` shape
	 * (`{ media: { url }, description?, spoiler? }`). We accept the raw shape
	 * directly so users can spread upload metadata returned by the bot.
	 */
	items: readonly APIMediaGalleryItem[];
}

export function MediaGallery(props: MediaGalleryProps): MediaGalleryNode {
	return {
		$$kind: "mediaGallery",
		id: props.id,
		items: props.items,
	};
}

export interface SeparatorProps {
	id?: number;
	/** Whether to render a visible divider line. Defaults to `true` in Discord. */
	divider?: boolean;
	/** Padding size — `1` = small, `2` = large. */
	spacing?: Spacing;
}

export function Separator(props: SeparatorProps = {}): SeparatorNode {
	return {
		$$kind: "separator",
		id: props.id,
		divider: props.divider,
		spacing: props.spacing,
	};
}

export interface FileProps {
	id?: number;
	/** Must be an `attachment://<filename>` reference per the Discord API. */
	url: string;
	spoiler?: boolean;
}

export function File(props: FileProps): FileNode {
	return {
		$$kind: "file",
		id: props.id,
		url: props.url,
		spoiler: props.spoiler,
	};
}

export interface ThumbnailProps {
	url: string;
	description?: string;
	spoiler?: boolean;
}

export function Thumbnail(props: ThumbnailProps): ThumbnailNode {
	return {
		$$kind: "thumbnail",
		media: { url: props.url },
		description: props.description,
		spoiler: props.spoiler,
	};
}
