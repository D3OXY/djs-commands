/**
 * Custom JSX runtime for `@djs-commands/jsx`.
 *
 * Set in `tsconfig.json`:
 *   "jsx": "react-jsx",
 *   "jsxImportSource": "@djs-commands/jsx"
 *
 * Components V2 elements are represented as plain "node" objects (see
 * `./types.ts`). Each component function takes its props and returns a node
 * directly — `jsx()` and `jsxs()` simply forward the call. This avoids React's
 * lazy {type, props} representation entirely, since we have no reconciliation
 * to perform.
 */

import type { DjsxNode, FragmentNode } from "./types";

type AnyProps = Record<string, unknown>;

type ComponentFn<P extends AnyProps = AnyProps, R extends DjsxNode = DjsxNode> = (props: P) => R;

/**
 * The intrinsic Fragment marker. Children are flattened by `render()`. We
 * model it as a function so it's a valid `jsx()` `type` argument.
 */
export function Fragment(props: { children?: DjsxNode | readonly DjsxNode[] }): FragmentNode {
	const raw = props.children;
	const children = raw === undefined ? [] : Array.isArray(raw) ? (raw as readonly DjsxNode[]) : [raw as DjsxNode];
	return { $$kind: "fragment", children };
}

/**
 * `jsx(type, props)` — TS calls this for elements with 0 or 1 children.
 *
 * Components are plain functions: invoke them with their resolved props. We
 * accept either a function component or the `Fragment` symbol.
 */
export function jsx<P extends AnyProps>(type: ComponentFn<P>, props: P): DjsxNode {
	return type(props);
}

/**
 * `jsxs(type, props)` — TS calls this when the element has multiple static
 * children. Functionally identical to `jsx` for our runtime.
 */
export function jsxs<P extends AnyProps>(type: ComponentFn<P>, props: P): DjsxNode {
	return type(props);
}

/**
 * The TS automatic JSX transform looks up `JSX.Element`, `JSX.IntrinsicElements`
 * and `JSX.ElementChildrenAttribute` from the `jsxImportSource` package.
 *
 * - `Element` is what JSX expressions evaluate to. We type it as `DjsxNode`.
 * - `IntrinsicElements` is empty — there are no lower-cased HTML tags.
 * - `ElementChildrenAttribute` tells TS our children prop is `children` (the
 *   default), but exposing it makes intent explicit.
 */
export namespace JSX {
	export type Element = DjsxNode;
	export type ElementType = ComponentFn<never, DjsxNode>;
	export type IntrinsicElements = Record<never, never>;
	export interface ElementChildrenAttribute {
		children: object;
	}
}
