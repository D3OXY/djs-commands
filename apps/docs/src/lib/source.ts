import { loader } from "fumadocs-core/source";
import { docs } from "../../.source/server";

/*
 * Icons stay as STRINGS through the source loader so the page tree remains
 * serializable across server → client. TanStack's serializer (seroval) bails
 * on React elements with `Symbol(react.transitional.element)`, which leaves
 * the page blank after hydration. The lucide-react → React element conversion
 * happens in routes/$.tsx via `reviveTreeIcons` once the tree lands on the
 * client.
 */
export const source = loader({
	source: docs.toFumadocsSource(),
	baseUrl: "/",
	icon(icon) {
		return icon;
	},
});
