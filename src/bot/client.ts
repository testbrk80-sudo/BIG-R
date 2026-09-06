import { Client, GatewayIntentBits, REST, Routes } from "discord.js";
import { obfuscateCommand, handleObfuscate } from "./commands/obfuscate.js";

export interface BotConfig { token: string; clientId: string; guildId?: string; }

export async function registerCommands(config: BotConfig): Promise<void> {
  const rest = new REST({ version: "10" }).setToken(config.token);
  const body = [obfuscateCommand.toJSON()];
  if (config.guildId) await rest.put(Routes.applicationGuildCommands(config.clientId, config.guildId), { body });
  else await rest.put(Routes.applicationCommands(config.clientId), { body });
}

export function createBotClient(): Client {
  const client = new Client({ intents: [GatewayIntentBits.Guilds] });
  client.on("interactionCreate", async (interaction) => {
    if (interaction.isChatInputCommand() && interaction.commandName === "obfuscate") await handleObfuscate(interaction);
  });
  return client;
}
