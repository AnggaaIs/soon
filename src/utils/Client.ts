import { BotClient } from "@soon/structures/Client";
import {
  ApplicationCommand,
  ApplicationCommandData,
  ApplicationCommandType,
  ChatInputApplicationCommandData,
  Collection,
} from "discord.js";

import { isProduction } from ".";

export async function syncApplicationCommands(client: BotClient): Promise<void> {
  const guildId = client.config.botConfig.guild_id_dev;

  let registerCommands: Collection<string, any>;
  registerCommands = await (isProduction()
    ? client.application!.commands.fetch()
    : client.application!.commands.fetch({ guildId }));

  const filteredCommands: ApplicationCommandData[] = [];
  const commands = [...client.commands.values()];

  for (const cmd of commands) {
    const option: ChatInputApplicationCommandData = {
      name: cmd.options.name,
      description: cmd.options.description ?? "No description provided.",
      type: ApplicationCommandType.ChatInput,
      options: cmd.options.options ?? [],
    };

    if (cmd.options.devOnly) continue;
    filteredCommands.push(option);
  }

  //Register commands
  for (const cmd of filteredCommands) {
    await client.application?.commands.create(cmd, isProduction() ? undefined : guildId);
  }
  //Delete commands
  const deletedCommands = registerCommands.filter(
    (cmd: ApplicationCommand) => !filteredCommands.some((c) => c.name === cmd.name),
  );

  if (deletedCommands.size > 0) {
    deletedCommands.forEach(async (cmd: ApplicationCommand) => {
      await client.application!.commands.delete(cmd.id, isProduction() ? undefined : guildId);
    });
  }
}
