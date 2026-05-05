import { createFileRoute } from "@tanstack/react-router";
import { createSearchAPI } from "fumadocs-core/search/server";
import { source } from "@/lib/source";

const server = createSearchAPI("advanced", {
	language: "english",
	indexes: source.getPages().map((page) => ({
		title: page.data.title,
		description: page.data.description,
		url: page.url,
		id: page.url,
		structuredData: page.data.structuredData,
	})),
});

export const Route = createFileRoute("/api/search")({
	server: {
		handlers: {
			GET: async ({ request }) => server.GET(request),
		},
	},
});
