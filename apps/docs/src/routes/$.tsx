import { createFileRoute, notFound } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import type { Root as PageTreeRoot } from "fumadocs-core/page-tree";
import { DocsLayout } from "fumadocs-ui/layouts/docs";
import { DocsBody, DocsDescription, DocsPage, DocsTitle } from "fumadocs-ui/layouts/docs/page";
import type React from "react";
import { mdxComponents } from "@/lib/mdx-components";
import browserCollections from "../../.source/browser";

export const Route = createFileRoute("/$")({
	component: Page,
	loader: async ({ params }) => {
		const slugs = params._splat?.split("/") ?? [];
		const [data, tree] = await Promise.all([getPageData({ data: slugs }), getPageTree()]);
		await clientLoader.preload(data.path);
		return { ...data, tree };
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

const clientLoader = browserCollections.docs.createClientLoader({
	id: "docs",
	component(doc) {
		const MDX = doc.default;
		return (
			<DocsPage toc={doc.toc} tableOfContent={{ style: "clerk" }}>
				<DocsTitle>{doc.frontmatter.title}</DocsTitle>
				{doc.frontmatter.description && <DocsDescription>{doc.frontmatter.description}</DocsDescription>}
				<DocsBody>
					<MDX components={mdxComponents} />
				</DocsBody>
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

function Page() {
	const data = Route.useLoaderData();
	// fumadocs types getComponent as FC<undefined>; cast needed to render as no-props component
	const Content = clientLoader.getComponent(data.path) as unknown as React.ComponentType;

	return (
		<DocsLayoutWrapper tree={data.tree}>
			<Content />
		</DocsLayoutWrapper>
	);
}
