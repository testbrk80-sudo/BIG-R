import { EmbedBuilder, WebhookClient } from "discord.js";

export interface ObfuscationStatus {
  fileName: string;
  loadstring: string;
}

export function createObfuscationEmbed(status: ObfuscationStatus): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(0x2b2d31)
    .setTitle("BIG R")
    .setDescription("File: " + status.fileName)
    .addFields({ name: "Loadstring", value: "```luau\n" + status.loadstring + "\n```" })
    .setFooter({ text: "BIG R status refreshes after each successful artifact." })
    .setTimestamp();
}

/** Sends an optional status refresh. A missing or invalid webhook never fails /obfuscate. */
export async function publishObfuscationUpdate(status: ObfuscationStatus): Promise<void> {
  const webhookUrl = process.env.DISCORD_STATUS_WEBHOOK_URL?.trim();
  if (!webhookUrl) return;

  try {
    const webhook = new WebhookClient({ url: webhookUrl });
    await webhook.send({ embeds: [createObfuscationEmbed(status)], allowedMentions: { parse: [] } });
    webhook.destroy();
  } catch (error) {
    console.error("Could not publish BIG R status webhook update:", error);
  }
}
