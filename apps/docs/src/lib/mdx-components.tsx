import { Accordion, Accordions } from "fumadocs-ui/components/accordion";
import { Banner } from "fumadocs-ui/components/banner";
import { Callout } from "fumadocs-ui/components/callout";
import { Card, Cards } from "fumadocs-ui/components/card";
import { File, Files, Folder } from "fumadocs-ui/components/files";
import { Step, Steps } from "fumadocs-ui/components/steps";
import { Tab, Tabs } from "fumadocs-ui/components/tabs";
import { TypeTable } from "fumadocs-ui/components/type-table";
import defaultMdxComponents from "fumadocs-ui/mdx";

/*
 * defaultMdxComponents provides the `pre` mapping that turns ``` fences into
 * the styled CodeBlock + Pre pair — without it, code blocks render unstyled
 * (one pill per line).
 */
export const mdxComponents = {
	...defaultMdxComponents,
	Tabs,
	Tab,
	Steps,
	Step,
	Files,
	File,
	Folder,
	Callout,
	Card,
	Cards,
	Accordion,
	Accordions,
	Banner,
	TypeTable,
};
