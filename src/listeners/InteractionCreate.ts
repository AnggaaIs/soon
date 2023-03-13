import { CommandContext } from "@soon/structures/CommandContext";
import { Listener } from "@soon/structures/Listener";
import { ListenerOptions } from "@soon/typings";
import { ApplyOptions } from "@soon/utils/decorators/ApplyOptions";
import { Message, Collection, TextChannel, Interaction } from "discord.js";

@ApplyOptions<ListenerOptions>({
  name: "interactionCreate",
})
export class MessageCreateListener extends Listener {
  public async exec(interaction: Interaction): Promise<Message | undefined> {
    if (interaction.isChatInputCommand()) {
      let guildData = await this.client.database.guild.findOne({
        id: interaction.guildId ?? "",
      });
      if (!guildData && interaction.guildId)
        guildData = await this.client.database.guild.create({
          id: interaction.guildId,
        });

      const commandName = interaction.commandName;

      const ctx = new CommandContext(this.client, interaction);
      const dmUser = ctx.interaction.user.dmChannel;

      if (!ctx.isDev()) return;

      const command = this.client.commands.getCommand(commandName);
      if (!command) return;

      if (command.options.devOnly && !ctx.isDev()) return;
      if (!command.options.allowDM && ctx.inDM()) {
        const embed = ctx.makeEmbed(":x: Error", "This command can't be used in DM.");
        return dmUser?.send({ embeds: [embed] });
      }

      if (ctx.inGuild()) {
        const channel = ctx.interaction.channel as TextChannel;
        const textChannelPermissionForClient = channel.permissionsFor(this.client.user!.id)!;
        const { userPermissions = [], clientPermissions = [] } = command.options;

        if (!textChannelPermissionForClient.has("SendMessages") || !ctx.checkClientPermission("SendMessages")) {
          const embed = ctx.makeEmbed(
            "Permissions Required",
            `I don't have permission to \`send messages\` on channel **${channel.name}**`,
          );
          return dmUser?.send({ embeds: [embed] });
        }

        if (!textChannelPermissionForClient.has("EmbedLinks") || !ctx.checkClientPermission("EmbedLinks")) {
          const embed = ctx.makeEmbed(
            "Permissions Required",
            `I don't have permission to \`embed links\` on channel **${channel.name}**`,
          );
          return dmUser?.send({ embeds: [embed] });
        }

        if (clientPermissions.length > 0) {
          const missingPermissions = ctx.checkClientPermissions(clientPermissions);
          if (missingPermissions.length > 0) {
            const embed = ctx.makeEmbed(
              "Permissions Required",
              `I don't have permission(s) ${clientPermissions
                .map((x) => `\`${x}\``)
                .join(", ")} to execute this command.`,
            );
            return ctx.reply({ embeds: [embed] });
          }
        }

        if (userPermissions.length > 0) {
          const missingPermissions = ctx.checkUserPermissions(userPermissions);
          if (missingPermissions.length > 0) {
            const embed = ctx.makeEmbed(
              "Permissions Required",
              `You don't have permission(s) ${userPermissions
                .map((x) => `\`${x}\``)
                .join(", ")} to execute this command.`,
            );
            return ctx.reply({ embeds: [embed] });
          }
        }
      }

      if ((command.options.cooldown || 3) > 0) {
        if (!this.client.cooldowns.has(command.options.name)) {
          this.client.cooldowns.set(command.options.name, new Collection());
        }

        const timestamp = this.client.cooldowns.get(command.options.name)!;
        const cooldown = (command.options.cooldown || 3) * 1000;
        if (timestamp.has(ctx.interaction.user.id)) {
          const diff = Date.now() - timestamp.get(ctx.interaction.user.id)!;
          if (diff < cooldown) {
            return ctx.reply({
              content: `You need to wait **${((cooldown - diff) / 1000).toFixed(2)}s** second(s) before using **${
                command.options.name
              }** command.`,
              ephemeral: true,
            });
          }
          setTimeout(() => timestamp.delete(ctx.interaction.user.id), cooldown);
        } else {
          timestamp.set(ctx.interaction.user.id, Date.now());
          if (ctx.isDev()) timestamp.delete(ctx.interaction.user.id);
        }
      }

      new Promise((resolve) => {
        resolve(command.exec(ctx, {}));
      }).catch((error) => {
        this.client.logger.error(error instanceof Error ? error.stack : error);
      });
    }
  }
}
