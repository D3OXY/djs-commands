/**
 * Small, internal helpers shared across the runtime and components. Not
 * exported from the package entry — keeping these private lets us evolve them
 * without breaking consumers.
 */

import type { Children, DjsxNode, FragmentNode } from "./types";

/**
 * Normalize a children prop into a flat readonly array. JSX collapses a
 * single child into a non-array value, so most components receive a union.
 *
 * Fragments encountered at any depth are flattened — this is the only kind
 * of structural transparency the runtime offers.
 */
export function flattenChildren<T extends DjsxNode | string>(input: Children<T> | undefined): readonly T[] {
	if (input === undefined) return [];
	const arr = Array.isArray(input) ? (input as readonly T[]) : [input as T];
	const out: T[] = [];
	for (const item of arr) {
		if (item && typeof item === "object" && "$$kind" in item && (item as DjsxNode).$$kind === "fragment") {
			out.push(...(flattenChildren((item as FragmentNode).children as Children<T>) as T[]));
			continue;
		}
		out.push(item);
	}
	return out;
}
