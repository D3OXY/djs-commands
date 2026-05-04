import { createCommandHandler, defineCommand } from "@djs-commands/core";
import { ActionRow, Button, Container, MediaGallery, Modal, render, renderModal, Section, Separator, TextDisplay, TextInput } from "@djs-commands/jsx";
import { Client, Events, GatewayIntentBits, MessageFlags } from "discord.js";

/**
 * `/welcome` — replies with a Components V2 message that exercises the most
 * common layout primitives: a Container with a heading, a Section that pairs
 * text with a Button accessory, a media gallery, a separator, and an action
 * row. Clicking the "Send Feedback" button opens a modal.
 */
const welcome = defineCommand({
	name: "welcome",
	description: "Show off Components V2 (JSX runtime)",
	run: async (ctx) => {
		// Components V2 messages require the interaction-level `flags` field,
		// which only the slash dispatch path can deliver. Narrow on ctx.type.
		if (ctx.type !== "slash") return;
		await ctx.interaction.reply({
			flags: MessageFlags.IsComponentsV2,
			components: render(
				<Container accentColor={0x5865f2}>
					<TextDisplay># Welcome to djs-commands v2</TextDisplay>
					<Section accessory={<Button style="primary" customId="welcome:open-feedback" label="Send Feedback" />}>
						Components V2 lets you compose rich messages from layout primitives. Click the button to open a feedback modal.
					</Section>
					<MediaGallery
						items={[
							{ media: { url: "https://cdn.discordapp.com/embed/avatars/0.png" }, description: "default avatar 0" },
							{ media: { url: "https://cdn.discordapp.com/embed/avatars/1.png" }, description: "default avatar 1" },
						]}
					/>
					<Separator divider={true} spacing={1} />
					<TextDisplay>Built with `@djs-commands/jsx`. Mix and match with the function-API fallback from `@djs-commands/core`.</TextDisplay>
					<ActionRow>
						<Button style="secondary" customId="welcome:dismiss" label="Dismiss" />
						<Button style="link" url="https://github.com/D3OXY/djs-commands" label="GitHub" />
					</ActionRow>
				</Container>
			),
		});
	},
});

const token = process.env.DISCORD_TOKEN;
if (!token) {
	console.error("DISCORD_TOKEN environment variable is required");
	process.exit(1);
}

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

const handler = createCommandHandler({
	client,
	commands: [welcome],
});

handler.ready.catch((err) => {
	console.error("Plugin boot failed:", err);
	process.exit(1);
});

// Show the feedback modal when the user clicks the button. Lives outside the
// command handler since this is a button interaction rather than a slash
// command — Components V2 routing is the next slice's concern.
client.on(Events.InteractionCreate, (interaction) => {
	if (interaction.isButton() && interaction.customId === "welcome:open-feedback") {
		interaction
			.showModal(
				renderModal(
					<Modal title="Send Feedback" customId="welcome:feedback-modal">
						<TextInput customId="subject" label="Subject" style="short" required={true} />
						<TextInput customId="body" label="What's on your mind?" style="paragraph" />
					</Modal>
				)
			)
			.catch((err) => {
				console.error("Failed to show modal:", err);
			});
	}
});

client.once(Events.ClientReady, (c) => {
	console.log(`Logged in as ${c.user.tag}`);
});

await client.login(token);
