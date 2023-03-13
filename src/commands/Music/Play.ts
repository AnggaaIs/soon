import { Command } from "@soon/structures/Command";
import { CommandContext } from "@soon/structures/CommandContext";
import { CommandOptions } from "@soon/typings";
import { ApplyOptions } from "@soon/utils/decorators/ApplyOptions";
import { inVoiceChannel, isVoiceChannelSame } from "@soon/utils/decorators/Music";
import {
  Message,
  VoiceChannel,
  TextChannel,
  ApplicationCommandOptionType,
  ButtonBuilder,
  ActionRow,
  ButtonComponent,
  ActionRowBuilder,
} from "discord.js";
import { Constants } from "shoukaku";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

@ApplyOptions<CommandOptions>({
  name: "play",
  description: "Play a song.",
  category: "Music",
  clientPermissions: ["Connect"],
  userPermissions: ["Connect", "Speak"],
  options: [
    {
      name: "query",
      type: ApplicationCommandOptionType.String,
      required: true,
      description: "Enter the song you want to play.",
    },
  ],
})
export class PlayCommand extends Command {
  @inVoiceChannel()
  @isVoiceChannelSame()
  public async exec(ctx: CommandContext): Promise<Message | void> {
    if (!ctx.interaction.isChatInputCommand()) return;

    await ctx.deferReply();
    const query = ctx.interaction.options.getString("query", true);
    const guild = ctx.interaction.guild!;
    const user = ctx.interaction.user;
    const channel = ctx.interaction.channel as TextChannel;
    const voiceChannel = ctx.interaction.guild?.members.cache.get(user.id)?.voice.channel;

    const dispatcher = this.client.shoukaku.getDispatcher({
      voiceChannel: voiceChannel as VoiceChannel,
      textChannel: channel,
      ctx,
    });

    if (
      !dispatcher.player ||
      (dispatcher.player && dispatcher.player.connection.state === Constants.State.DISCONNECTED)
    ) {
      const connection = await dispatcher.connect();
      if (!connection.status && connection.error) {
        const embed = ctx.makeEmbed(
          ":x: Error",
          `Failed to join voice channel\n\`\`\`\n${connection.error.message}\n\`\`\``,
        );
        return ctx.reply({ embeds: [embed], timeout: 15_000 });
      }
    }

    const data = await this.client.shoukaku.search(query, {
      requester: user.id,
    });

    if (data instanceof Error) {
      if (
        dispatcher.player?.connection.state === Constants.State.CONNECTED &&
        !dispatcher.player.track &&
        dispatcher.queue.size === 0 &&
        !dispatcher.queue.current
      )
        this.client.shoukaku.destroyAll(ctx.interaction.guildId!);

      const embed = ctx.makeEmbed(
        ":x: Error",
        `An unknown error occured while search songs.\n\`\`\`\n${data.message}\n\`\`\``,
      );
      return ctx.reply({ embeds: [embed], timeout: 15_000 });
    }

    switch (data?.loadType) {
      case "NO_MATCHES": {
        const embedNoMatches = ctx
          .makeEmbed(":x: Error", `No matches song found with query **${query}**`)
          .setFooter({ text: user.tag, iconURL: user.avatarURL()! });

        ctx.reply({ embeds: [embedNoMatches], timeout: 15_000 });

        if (
          dispatcher.player?.connection.state === Constants.State.CONNECTED &&
          !dispatcher.player.track &&
          dispatcher.queue.size === 0 &&
          !dispatcher.queue.current
        )
          this.client.shoukaku.destroyAll(guild.id);
        break;
      }
      case "LOAD_FAILED": {
        const embedLoadFailed = ctx
          .makeEmbed(":x: Error", " Failed to load song, please try again later.")
          .setFooter({ text: user.tag, iconURL: user.avatarURL()! });

        ctx.reply({ embeds: [embedLoadFailed], timeout: 15_000 });

        if (
          dispatcher.player?.connection.state === Constants.State.CONNECTED &&
          !dispatcher.player.track &&
          dispatcher.queue.size === 0 &&
          !dispatcher.queue.current
        )
          this.client.shoukaku.destroyAll(guild.id);
        break;
      }
      case "TRACK_LOADED":
      case "SEARCH_RESULT": {
        dispatcher.queue.push(data.tracks[0]);

        if (dispatcher.queue.length > 1 && dispatcher.lastSongMessageId) {
          const lastSongMessage = await channel.messages.fetch(dispatcher.lastSongMessageId);

          if (lastSongMessage.components[0].components[3] && lastSongMessage.components[0].components[3].disabled) {
            const buttons: ButtonBuilder[] = lastSongMessage.components[0].components.map((button) => {
              const btn = ButtonBuilder.from(button as ButtonComponent);
              if (button.customId === "skip") {
                btn.setDisabled(false);
              }
              return btn;
            });

            const row = new ActionRowBuilder<ButtonBuilder>().setComponents(buttons);

            await lastSongMessage.edit({
              components: [row, lastSongMessage.components[1]],
            });
          }
        }

        const embedTrackSearch = ctx
          .makeEmbed("Track Added", `Added **${data.tracks[0].info.title}** to the queue`)
          .setFooter({ text: `#${dispatcher.queue.length} | ${user.tag}`, iconURL: user.avatarURL()! });

        ctx.reply({
          embeds: [embedTrackSearch],
          timeout: 15_000,
        });

        if (!dispatcher.player!.paused) dispatcher.player!.playTrack({ track: data.tracks[0].track });
        break;
      }
      case "PLAYLIST_LOADED": {
        dispatcher.queue.push(...data.tracks);

        if (dispatcher.queue.length > 1 && dispatcher.lastSongMessageId) {
          const lastSongMessage = await channel.messages.fetch(dispatcher.lastSongMessageId);

          if (lastSongMessage.components[0].components[3] && lastSongMessage.components[0].components[3].disabled) {
            const buttons: ButtonBuilder[] = lastSongMessage.components[0].components.map((button) => {
              const btn = ButtonBuilder.from(button as ButtonComponent);
              if (button.customId === "skip") {
                btn.setDisabled(false);
              }
              return btn;
            });

            const row = new ActionRowBuilder<ButtonBuilder>().setComponents(buttons);

            await lastSongMessage.edit({
              components: [row, lastSongMessage.components[1]],
            });
          }
        }

        const embedPlaylistSearch = ctx
          .makeEmbed(
            "Playlist Added",
            `${data.tracks.length} song(s) from playlist **${data.playlistInfo.name}** added to the queue`,
          )
          .setFooter({ text: user.tag, iconURL: user.avatarURL()! });

        ctx.reply({
          embeds: [embedPlaylistSearch],
          timeout: 15_000,
        });

        if (!dispatcher.player!.paused) dispatcher.player!.playTrack({ track: data.tracks[0].track });
      }
    }
  }
}
