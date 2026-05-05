import { loader } from "fumadocs-core/source";
import * as Icons from "lucide-react";
import { createElement } from "react";
import { docs } from "../../.source/server";

/*
 * meta.json files set `icon: "Rocket"` (a lucide-react export name). The loader
 * resolves the string to a real React component here so the sidebar renders an
 * icon next to each section. Unknown names fall back to undefined (no icon).
 */
export const source = loader({
	source: docs.toFumadocsSource(),
	baseUrl: "/",
	icon(icon) {
		if (!icon) return undefined;
		const Icon = (Icons as unknown as Record<string, unknown>)[icon];
		if (!Icon) return undefined;
		// biome-ignore lint/suspicious/noExplicitAny: lucide icons all share the same prop shape
		return createElement(Icon as any);
	},
});
