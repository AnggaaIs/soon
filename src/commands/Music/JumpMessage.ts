import { Command } from "@soon/structures/Command";
import { CommandContext } from "@soon/structures/CommandContext";
import { CommandOptions } from "@soon/typings";
import { ApplyOptions } from "@soon/utils/decorators/ApplyOptions";
import { inVoiceChannel } from "@soon/utils/decorators/Music";
import { Message, TextChannel, VoiceChannel } from "discord.js";
import { Constants } from "shoukaku";
import { queueEmpty } from "@soon/utils/decorators/Music";

@ApplyOptions<CommandOptions>({
  name: "jumpmessage",
  description: "Jump to music message.",
  category: "Music",
  cooldown: 10,
})
export class JumpMessageCommand extends Command {
  @queueEmpty()
  public async exec(ctx: CommandContext): Promise<Message | void> {
    const user = ctx.interaction.user;
    const dispatcher = this.client.shoukaku.dispatcher.get(ctx.interaction.guild!.id)!;

    const message = await dispatcher.textChannel.messages.fetch(dispatcher.lastSongMessageId!);
    if (!message) {
      const embed = ctx.makeEmbed(":x: Error", "Message not found.");
      return ctx.reply({ embeds: [embed], ephemeral: true });
    }

    const embed = ctx.makeEmbed("Music Message", `**[Jump to music message.](${message.url})**`);

    return ctx.reply({ embeds: [embed] });
  }
}
