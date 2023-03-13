import { Command } from "@soon/structures/Command";
import { CommandContext } from "@soon/structures/CommandContext";
import { CommandOptions } from "@soon/typings";
import { ApplyOptions } from "@soon/utils/decorators/ApplyOptions";
import { inVoiceChannel } from "@soon/utils/decorators/Music";
import { Message, TextChannel, VoiceChannel } from "discord.js";
import { Constants } from "shoukaku";

@ApplyOptions<CommandOptions>({
  name: "jumpmessage",
  description: "Jump to music message.",
  category: "Music",
  cooldown: 10,
})
export class JumpMessageCommand extends Command {
  public async exec(ctx: CommandContext): Promise<Message | void> {
    const user = ctx.interaction.user;
    const dispatcher = this.client.shoukaku.dispatcher.get(ctx.interaction.guild!.id);

    if (!dispatcher || !dispatcher.queue.totalSize || dispatcher.timeout || !dispatcher.lastSongMessageId) {
      const embed = ctx
        .makeEmbed(
          ":x: Error",
          "There is no song that is played at this time, add the song with commands `/play, /search`",
        )
        .setFooter({
          text: user.tag,
          iconURL: user.avatarURL()!,
        });
      return ctx.reply({
        embeds: [embed],
        timeout: 15_000,
      });
    }
    const message = await dispatcher.textChannel.messages.fetch(dispatcher.lastSongMessageId);
    if (!message) {
      const embed = ctx.makeEmbed(":x: Error", "Message not found.");
      return ctx.reply({ embeds: [embed], ephemeral: true });
    }

    const embed = ctx.makeEmbed("Music Message", `**[Jump to music message.](${message.url})**`);

    return ctx.reply({ embeds: [embed] });
  }
}
