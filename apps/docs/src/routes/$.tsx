import { createFileRoute, notFound } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import type { Node as PageTreeNode, Root as PageTreeRoot } from "fumadocs-core/page-tree";
import { DocsLayout } from "fumadocs-ui/layouts/docs";
import { DocsBody, DocsDescription, DocsPage, DocsTitle, PageLastUpdate, ViewOptionsPopover } from "fumadocs-ui/layouts/docs/page";
import * as Icons from "lucide-react";
import type React from "react";
import { createElement, useMemo } from "react";
import { mdxComponents } from "@/lib/mdx-components";
import browserCollections from "../../.source/browser";

const SITE_URL = "https://djscommands.deoxy.dev";
const REPO = "D3OXY/djs-commands";
const REPO_BRANCH = "main";
const CONTENT_PATH = "apps/docs/content/pages";

export const Route = createFileRoute("/$")({
	component: Page,
	loader: async ({ params }) => {
		const slugs = params._splat?.split("/") ?? [];
		const [data, tree] = await Promise.all([getPageData({ data: slugs }), getPageTree()]);
		await clientLoader.preload(data.path);
		return { ...data, tree };
	},
	head: ({ loaderData }) => {
		if (!loaderData) return {};
		const fullTitle = `${loaderData.title} · djs-commands`;
		const description = loaderData.description ?? "Modern Discord.js command handler — TypeScript-first, Components V2 native, with pluggable persistence.";
		const canonical = `${SITE_URL}${loaderData.url}`;
		const ogImage = `${SITE_URL}/og-default.png`;
		return {
			meta: [
				{ title: fullTitle },
				{ name: "description", content: description },
				// Open Graph
				{ property: "og:title", content: fullTitle },
				{ property: "og:description", content: description },
				{ property: "og:url", content: canonical },
				{ property: "og:type", content: "article" },
				{ property: "og:site_name", content: "djs-commands" },
				{ property: "og:image", content: ogImage },
				// Twitter / X
				{ name: "twitter:card", content: "summary_large_image" },
				{ name: "twitter:title", content: fullTitle },
				{ name: "twitter:description", content: description },
				{ name: "twitter:image", content: ogImage },
			],
			links: [{ rel: "canonical", href: canonical }],
		};
	},
});

const getPageData = createServerFn({
	method: "GET",
})
	.inputValidator((slugs: string[]) => slugs)
	.handler(async ({ data: slugs }) => {
		const { source } = await import("@/lib/source");
		const page = source.getPage(slugs);
		if (!page) throw notFound();

		return {
			path: page.path,
			url: page.url,
			slugs,
			title: page.data.title,
			description: page.data.description,
		};
	});

const getPageTree = createServerFn({
	method: "GET",
	// biome-ignore lint/suspicious/noExplicitAny: PageTree.Root contains React.ReactNode which isn't serializable in TanStack's type system, but runtime data is plain JSON
}).handler(async (): Promise<any> => {
	const { source } = await import("@/lib/source");
	return source.pageTree;
});

interface DocClientProps {
	githubUrl: string;
}

const clientLoader = browserCollections.docs.createClientLoader<DocClientProps>({
	id: "docs",
	component(doc, { githubUrl }) {
		const MDX = doc.default;
		const lastModified = (doc as { lastModified?: Date | string }).lastModified;
		const lastModifiedDate = lastModified ? new Date(lastModified) : undefined;

		return (
			<DocsPage toc={doc.toc} tableOfContent={{ style: "clerk" }} footer={{ enabled: true }}>
				<DocsTitle>{doc.frontmatter.title}</DocsTitle>
				{doc.frontmatter.description && <DocsDescription>{doc.frontmatter.description}</DocsDescription>}
				<DocsBody>
					<MDX components={mdxComponents} />
					{lastModifiedDate && <PageLastUpdate date={lastModifiedDate} />}
				</DocsBody>
				<ViewOptionsPopover githubUrl={githubUrl} />
			</DocsPage>
		);
	},
});

interface DocsLayoutWrapperProps {
	children: React.ReactNode;
	tree: PageTreeRoot;
}

function DocsLayoutWrapper({ children, tree }: DocsLayoutWrapperProps) {
	return (
		<DocsLayout
			tree={tree}
			nav={{
				title: (
					<div className="flex items-center gap-2.5">
						<span className="font-semibold text-[0.95rem] tracking-tight">djs-commands</span>
						<span className="font-medium text-fd-muted-foreground text-xs opacity-60">v2 docs</span>
					</div>
				),
			}}
			sidebar={{
				defaultOpenLevel: 1,
			}}
			links={[
				{
					text: "GitHub",
					url: "https://github.com/D3OXY/djs-commands",
					external: true,
				},
				{
					text: "npm",
					url: "https://www.npmjs.com/org/djs-commands",
					external: true,
				},
			]}
		>
			{children}
		</DocsLayout>
	);
}

/*
 * Walk the serialized tree and replace each string icon (e.g. "Rocket") with
 * a real lucide-react element. Icons stay as strings on the wire — see
 * lib/source.ts for the rationale. Tree shape is `Root | Folder | Item |
 * Separator`; only Folder has children.
 */
function reviveTreeIcons<T extends PageTreeRoot | PageTreeNode>(node: T): T {
	const next = { ...node } as T & { icon?: React.ReactNode; children?: PageTreeNode[] };
	if (typeof next.icon === "string") {
		const Icon = (Icons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[next.icon];
		if (Icon) next.icon = createElement(Icon);
		else next.icon = undefined;
	}
	if (Array.isArray(next.children)) {
		next.children = next.children.map((child) => reviveTreeIcons(child));
	}
	return next;
}

function Page() {
	const data = Route.useLoaderData();
	const Content = clientLoader.getComponent(data.path);
	const githubUrl = `https://github.com/${REPO}/blob/${REPO_BRANCH}/${CONTENT_PATH}/${data.path}`;
	const tree = useMemo(() => reviveTreeIcons(data.tree), [data.tree]);

	return (
		<DocsLayoutWrapper tree={tree}>
			<Content githubUrl={githubUrl} />
		</DocsLayoutWrapper>
	);
}
