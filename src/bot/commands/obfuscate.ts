import { AttachmentBuilder, ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { obfuscate } from "../../obfuscator/pipeline.js";
import { LuauCompilationError, LuauToolingError, LuauValidationError } from "../../luau/errors.js";
import { publishObfuscationUpdate, createObfuscationEmbed } from "../status.js";
import { recordSuccessfulObfuscation } from "../../storage/stats.js";
import { createRubisFetchSnippet, createRubisScrap } from "../../rubis.js";

const MAX_SOURCE_BYTES = 1_000_000;
export const obfuscateCommand = new SlashCommandBuilder()
  .setName("obfuscate")
  .setDescription("Protect and compile Luau source.")
  .addAttachmentOption((option) => option.setName("file").setDescription("A source file up to 1 MB.").setRequired(false))
  .addStringOption((option) => option.setName("code").setDescription("Luau source code, up to 1 MB.").setRequired(false));

function errorText(error: unknown): string {
  if (error instanceof LuauValidationError || error instanceof LuauCompilationError) return `${error.message}\n${error.diagnostics}`.slice(0, 1_800);
  if (error instanceof LuauToolingError) return error.message;
  return "Unexpected processing error. Check the bot logs for details.";
}

export async function handleObfuscate(interaction: ChatInputCommandInteraction): Promise<void> {
  const attachment = interaction.options.getAttachment("file");
  const code = interaction.options.getString("code");
  if (!attachment && !code) {
    await interaction.reply({ content: "Provide either a file or code.", ephemeral: false });
    return;
  }
  if (attachment && code) {
    await interaction.reply({ content: "Provide a file or code, not both.", ephemeral: false });
    return;
  }
  if (attachment && attachment.size > MAX_SOURCE_BYTES) {
    await interaction.reply({ content: "The source file must be 1 MB or smaller.", ephemeral: false });
    return;
  }
  await interaction.deferReply();
  try {
    let source: string;
    let fileName: string;
    if (attachment) {
      const response = await fetch(attachment.url, { signal: AbortSignal.timeout(30_000) });
      if (!response.ok) throw new Error(`Discord download failed (${response.status}).`);
      const body = await response.arrayBuffer();
      if (body.byteLength > MAX_SOURCE_BYTES) throw new Error("The downloaded source file is larger than 1 MB.");
      source = Buffer.from(body).toString("utf8");
      fileName = attachment.name || "source.luau";
    } else {
      source = code || "";
      if (Buffer.byteLength(source, "utf8") > MAX_SOURCE_BYTES) throw new Error("The code must be 1 MB or smaller.");
      fileName = "code.luau";
    }
    const result = await obfuscate(source, { compile: true });
    if (!result.compilation) throw new Error("Compilation did not produce an artifact.");
    const artifact = new AttachmentBuilder(result.compilation.bytecode, { name: `${fileName}.bytecode` });
    const scrap = await createRubisScrap(result.source, fileName);
    await recordSuccessfulObfuscation();
    const status = {
      fileName,
      loadstring: createRubisFetchSnippet(scrap),
    };
    await interaction.editReply({ embeds: [createObfuscationEmbed(status)], files: [artifact] });
    await publishObfuscationUpdate(status);
  } catch (error) {
    console.error("/obfuscate failed", error);
    await interaction.editReply({ content: `Could not process this file: ${errorText(error)}` });
  }
}
