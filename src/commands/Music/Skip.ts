import { Command } from "@soon/structures/Command";
import { CommandContext } from "@soon/structures/CommandContext";
import { CommandOptions } from "@soon/typings";
import { ApplyOptions } from "@soon/utils/decorators/ApplyOptions";
import { ApplicationCommandOptionType, Message } from "discord.js";
import { inVoiceChannel, isVoiceChannelSame, queueEmpty } from "@soon/utils/decorators/Music";

@ApplyOptions<CommandOptions>({
  name: "skip",
  description: "Skip a song.",
  category: "Music",
  cooldown: 3,
  options: [
    {
      name: "position",
      type: ApplicationCommandOptionType.Number,
      description: "Skip to a specific position in the queue.",
      required: false,
      minValue: 1,
    },
  ],
})
export class SkipCommand extends Command {
  @queueEmpty()
  @inVoiceChannel()
  @isVoiceChannelSame()
  public async exec(ctx: CommandContext): Promise<Message | void> {
    if (!ctx.interaction.isChatInputCommand()) return;
    await ctx.deferReply();
    const guild = ctx.interaction.guild!;
    const dispatcher = this.client.shoukaku.dispatcher.get(guild.id)!;
    const user = ctx.interaction.user;
    const voiceChannel = ctx.interaction.guild?.members.cache.get(user.id)?.voice.channel;
    const position = ctx.interaction.options.getNumber("position", false) ?? 1;
    let noPosition = false;
    if (!ctx.interaction.options.getNumber("position", false)) noPosition = true;

    const queue = dispatcher.queue;
    let text: string;

    if (position > queue.length) {
      const embed = ctx
        .makeEmbed(":x: Invalid Position", `You can't skip to position **${position}**`)
        .setFooter({ text: user.tag, iconURL: user.avatarURL()! });

      return ctx.reply({ embeds: [embed], timeout: 15_000 });
    }

    if (!noPosition && queue.indexCurrent === position - 1) {
      const embed = ctx.makeEmbed(":x: Error", "You think I will allow this?, you can't skip to the same song!");
      return ctx.reply({ embeds: [embed], timeout: 15_000 });
    }

    if (position === 1) {
      text = `Skipped song **${queue.current?.info.title}**`;
      if (!noPosition && queue.indexCurrent !== 0) {
        text = `Skipped song **${queue.current?.info.title}** and jump to position **${position}**`;
        dispatcher.queue.indexCurrent = 0 - 1;
      }
    } else {
      text = `Skipped song **${queue.current?.info.title}** and jump to position **${position}**`;
      dispatcher.queue.indexCurrent = position - 2;
    }

    if (text || text !== "") {
      const embed = ctx.makeEmbed("Skip", text).setFooter({ text: user.tag, iconURL: user.avatarURL()! });

      ctx.reply({ embeds: [embed], timeout: 15_000 });

      dispatcher.stopType = 1;
      dispatcher.player?.stopTrack();
    }
  }
}
