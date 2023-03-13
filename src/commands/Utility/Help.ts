import { Command } from "@soon/structures/Command";
import { CommandContext } from "@soon/structures/CommandContext";
import { CommandOptions } from "@soon/typings";
import { COLORS } from "@soon/utils/Constants";
import { ApplyOptions } from "@soon/utils/decorators/ApplyOptions";
import { Message, EmbedBuilder, ApplicationCommandOptionType } from "discord.js";

@ApplyOptions<CommandOptions>((client) => ({
  name: "help",
  description: "Show help panel",
  category: "Utility",
  options: [
    {
      name: "command",
      type: ApplicationCommandOptionType.String,
      description: "Show help panel",
      required: false,
      choices: client.commands
        .filter((x) => !x.options.devOnly)
        .filter((x) => x.options.category !== "Developer")
        .map((x) => {
          return { name: x.options.name, value: x.options.name };
        }),
    },
  ],
}))
export class HelpCommand extends Command {
  public async exec(ctx: CommandContext): Promise<Message | void> {
    if (!ctx.interaction.isChatInputCommand()) return;

    const commandName = ctx.interaction.options.getString("command", false);
    const bot = this.client.user!;

    if (commandName === null) {
      const embed = new EmbedBuilder()
        .setAuthor({
          name: `${bot.username} Help Panel`,
          iconURL: bot.displayAvatarURL(),
        })
        .setColor(COLORS.GENERAL)
        .setTimestamp();

      for (const ctg of this.client.commands.category.filter(
        (x) => `${ctx.isDev() ? x : x.toLowerCase() !== "Developer"}`,
      )) {
        embed.addFields({
          name: `> **${ctg}**`,
          value: this.client.commands
            .getCommandsByCategory(ctg)
            .map((x) => `\`/${x.options.name}\``)
            .join(", "),
        });
      }

      ctx.reply({ embeds: [embed] });
    } else {
      const cmd = this.client.commands.getCommand(commandName);

      const { userPermissions = [], clientPermissions = [] } = cmd!.options;

      const embed = new EmbedBuilder()
        .setColor(COLORS.GENERAL)
        .setTitle(`${cmd!.options.name.toProperCase()} Command`)
        .setThumbnail(this.client.user!.avatarURL())
        .setDescription(cmd?.options.description ?? "No description")
        .addFields(
          { name: "Category", value: cmd?.options.category ?? "No category" },
          { name: "Cooldown", value: `${cmd?.options.cooldown ?? 3} seconds` },
          { name: "Allow DM", value: `${cmd?.options.allowDM ? "Yes" : "No"}` },
          {
            name: "User Permissions",
            value: `${
              userPermissions.length > 0 ? userPermissions.map((x) => `\`${x}\``).join(", ") : "No permissions"
            }`,
          },
          {
            name: "Client Permissions",
            value: `${
              clientPermissions.length > 0 ? clientPermissions.map((x) => `\`${x}\``).join(", ") : "No permissions"
            }`,
          },
        );

      ctx.reply({ embeds: [embed], ephemeral: true });
    }
  }
}
