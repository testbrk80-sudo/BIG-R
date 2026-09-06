import { AttachmentBuilder, ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { obfuscate } from "../../obfuscator/pipeline.js";
import { LuauCompilationError, LuauToolingError, LuauValidationError } from "../../luau/errors.js";
import { publishObfuscationUpdate, createObfuscationEmbed } from "../status.js";
import { recordSuccessfulObfuscation } from "../../storage/stats.js";

const MAX_SOURCE_BYTES = 1_000_000;
export const obfuscateCommand = new SlashCommandBuilder()
  .setName("obfuscate")
  .setDescription("Protect and compile a Luau source file.")
  .addAttachmentOption((option) => option.setName("file").setDescription("A .luau source file (up to 1 MB).").setRequired(true));

function errorText(error: unknown): string {
  if (error instanceof LuauValidationError || error instanceof LuauCompilationError) return `${error.message}\n${error.diagnostics}`.slice(0, 1_800);
  if (error instanceof LuauToolingError) return error.message;
  return "Unexpected processing error. Check the bot logs for details.";
}

export async function handleObfuscate(interaction: ChatInputCommandInteraction): Promise<void> {
  const attachment = interaction.options.getAttachment("file", true);
  if (!attachment.name?.toLowerCase().endsWith(".luau")) {
    await interaction.reply({ content: "Please upload a `.luau` source file.", ephemeral: true });
    return;
  }
  if (attachment.size > MAX_SOURCE_BYTES) {
    await interaction.reply({ content: "The source file must be 1 MB or smaller.", ephemeral: true });
    return;
  }
  await interaction.deferReply();
  try {
    const response = await fetch(attachment.url, { signal: AbortSignal.timeout(30_000) });
    if (!response.ok) throw new Error(`Discord download failed (${response.status}).`);
    const body = await response.arrayBuffer();
    if (body.byteLength > MAX_SOURCE_BYTES) throw new Error("The downloaded source file is larger than 1 MB.");
    const source = Buffer.from(body).toString("utf8");
    const result = await obfuscate(source, { compile: true });
    if (!result.compilation) throw new Error("Compilation did not produce an artifact.");
    const artifact = new AttachmentBuilder(result.compilation.bytecode, { name: `${attachment.name}.bytecode` });
    const count = await recordSuccessfulObfuscation();
    const status = { fileName: attachment.name, count, integrityHash: result.integrityHash };
    await interaction.editReply({ embeds: [createObfuscationEmbed(status)], files: [artifact] });
    await publishObfuscationUpdate(status);
  } catch (error) {
    console.error("/obfuscate failed", error);
    await interaction.editReply({ content: `Could not process this file: ${errorText(error)}` });
  }
}
