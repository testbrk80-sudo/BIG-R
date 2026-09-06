import "dotenv/config";
import { createBotClient, registerCommands } from "./bot/client.js";

function required(name: "DISCORD_TOKEN" | "CLIENT_ID"): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} must be set in .env.`);
  return value;
}

async function main(): Promise<void> {
  const config = { token: required("DISCORD_TOKEN"), clientId: required("CLIENT_ID"), guildId: process.env.GUILD_ID?.trim() || undefined };
  await registerCommands(config);
  const client = createBotClient();
  client.once("ready", () => console.log(`BIG R is online as ${client.user?.tag ?? "Discord bot"}.`));
  await client.login(config.token);
}

main().catch((error: unknown) => { console.error("BIG R could not start:", error); process.exitCode = 1; });
