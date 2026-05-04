/**
 * Dev variant of the JSX runtime.
 *
 * TypeScript's `react-jsxdev` transform imports `jsxDEV` from this entry. Our
 * runtime has no dev-only behavior, so we re-export `jsx-runtime` and provide
 * a `jsxDEV` shim that drops the extra source-position arguments.
 */

import { jsx } from "./jsx-runtime";
import type { DjsxNode } from "./types";

type AnyProps = Record<string, unknown>;

export type { JSX } from "./jsx-runtime";
export { Fragment, jsx, jsx as jsxs } from "./jsx-runtime";

/**
 * `jsxDEV(type, props, key, isStaticChildren, source, self)` — the dev
 * transform's signature. We only care about the first two args; the rest
 * carry source-map metadata that's irrelevant to our renderer.
 */
export function jsxDEV<P extends AnyProps>(type: (props: P) => DjsxNode, props: P): DjsxNode {
	return jsx(type, props);
}
