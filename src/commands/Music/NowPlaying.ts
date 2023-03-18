import { Command } from "@soon/structures/Command";
import { CommandContext } from "@soon/structures/CommandContext";
import { LavalinkDispatcher } from "@soon/structures/shoukaku/Dispatcher";
import { CommandOptions } from "@soon/typings";
import { spliceIntoChunks, toHumanTime } from "@soon/utils";
import { COLORS } from "@soon/utils/Constants";
import { ApplyOptions } from "@soon/utils/decorators/ApplyOptions";
import { stripIndents } from "common-tags";
import {
  EmbedField,
  Message,
  ActionRowBuilder,
  ButtonBuilder,
  EmbedBuilder,
  ComponentType,
  ButtonStyle,
} from "discord.js";
import { Track } from "shoukaku";
import { queueEmpty } from "@soon/utils/decorators/Music";

@ApplyOptions<CommandOptions>({
  name: "nowplaying",
  description: "See what music is playing right now.",
  category: "Music",
})
export class NowPlayingCommand extends Command {
  @queueEmpty()
  public async exec(ctx: CommandContext): Promise<Message | void> {
    await ctx.deferReply();
    const guild = ctx.interaction.guild!;
    const user = ctx.user;
    const dispatcher = this.client.shoukaku.dispatcher.get(guild.id)!;

    const currentSong = dispatcher.queue.current!;
    const author = this.client.users.cache.get(currentSong.requester!)!;
    const duration = currentSong.info.isStream ? "🔴 Live" : toHumanTime(currentSong.info.length);
    const indexCurrent = dispatcher.queue.indexCurrent;
    const fields: EmbedField[] = [];

    const nowPlayingEmbed = new EmbedBuilder()
      .setColor(COLORS.GENERAL)
      .setTitle("Now Playing")
      .setThumbnail(dispatcher.queue.currentThumbnail);

    fields.push({
      name: "Title",
      value: `[${currentSong.info.title}](${currentSong.info.uri})`,
      inline: false,
    });

    fields.push({
      name: "Duration",
      value: duration,
      inline: false,
    });

    fields.push({
      name: "Requester",
      value: `<@${author.id}>`,
      inline: false,
    });

    if (indexCurrent + 1 < dispatcher.queue.length || dispatcher.loopType === 1 || dispatcher.loopTypeCurrent === 1) {
      if (dispatcher.loopTypeCurrent === 1) {
        fields.push({
          name: "Next (Loop Current)",
          value: `${dispatcher.queue[dispatcher.queue.indexCurrent].info.title ?? "Unknown"}`,
          inline: false,
        });
      }

      if (indexCurrent + 1 === dispatcher.queue.length && dispatcher.loopType === 1) {
        if (dispatcher.loopTypeCurrent !== 1) {
          fields.push({
            name: "Next (Loop Queue)",
            value: `${dispatcher.queue[0].info.title ?? "Unknown"}`,
            inline: false,
          });
        }
      }

      if (indexCurrent + 1 < dispatcher.queue.length && dispatcher.loopTypeCurrent === 0) {
        fields.push({
          name: "Next",
          value: `${dispatcher.queue[indexCurrent + 1].info.title ?? "Unknown"}`,
          inline: false,
        });
      }
    }

    nowPlayingEmbed.setFields(fields);

    return ctx.reply({ embeds: [nowPlayingEmbed] });
  }
}
