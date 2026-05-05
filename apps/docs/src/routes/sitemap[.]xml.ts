import { createFileRoute } from "@tanstack/react-router";

const SITE_URL = "https://djscommands.deoxy.dev";

export const Route = createFileRoute("/sitemap.xml")({
	server: {
		handlers: {
			GET: async () => {
				const { source } = await import("@/lib/source");
				const pages = source.getPages();
				const urls = pages
					.map(
						(p) =>
							`  <url>\n    <loc>${SITE_URL}${p.url}</loc>\n    <changefreq>weekly</changefreq>\n    <priority>${p.url === "/" ? "1.0" : "0.7"}</priority>\n  </url>`
					)
					.join("\n");
				const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
				return new Response(xml, {
					status: 200,
					headers: {
						"content-type": "application/xml; charset=utf-8",
						"cache-control": "public, max-age=3600, s-maxage=3600",
					},
				});
			},
		},
	},
});
