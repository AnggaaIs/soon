import { Command } from "@soon/structures/Command";
import { CommandContext } from "@soon/structures/CommandContext";
import { CommandOptions } from "@soon/typings";
import { toHumanTime } from "@soon/utils";
import { COLORS } from "@soon/utils/Constants";
import { ApplyOptions } from "@soon/utils/decorators/ApplyOptions";
import { inVoiceChannel, isVoiceChannelSame } from "@soon/utils/decorators/Music";
import { stripIndents } from "common-tags";
import {
  Message,
  ActionRowBuilder,
  EmbedBuilder,
  VoiceChannel,
  TextChannel,
  ComponentType,
  ApplicationCommandOptionType,
  StringSelectMenuBuilder,
  SelectMenuComponentOptionData,
  ButtonBuilder,
  ButtonComponentData,
  ButtonComponent,
} from "discord.js";
import { Constants, Track } from "shoukaku";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

@ApplyOptions<CommandOptions>({
  name: "search",
  description: "Search songs.",
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
export class SearchCommand extends Command {
  @inVoiceChannel()
  @isVoiceChannelSame()
  public async exec(ctx: CommandContext): Promise<Message | void> {
    if (!ctx.interaction.isChatInputCommand()) return;

    await ctx.deferReply();
    const query = ctx.interaction.options.getString("query", true);
    const guild = ctx.interaction.guild!;
    const user = ctx.interaction.user;
    const channel = ctx.interaction.channel as TextChannel;
    const voiceChannel = guild.members.cache.get(user.id)?.voice.channel;

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

    switch (data.loadType) {
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
          this.client.shoukaku.destroyAll(ctx.interaction.guildId!);
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
          this.client.shoukaku.destroyAll(ctx.interaction.guildId!);
        break;
      }
      case "TRACK_LOADED":
      case "SEARCH_RESULT": {
        let maxSongs = 5;

        if (data.tracks.length < 5) maxSongs = data.tracks.length;

        const description = data.tracks
          .slice(0, maxSongs)
          .map(
            (track, i) =>
              `\`${i++ + 1}#\` | **[${track.info.title}](${track.info.uri})** \`( ${toHumanTime(
                track.info.length,
              )} )\``,
          )
          .join("\n");

        const messageSelectData: SelectMenuComponentOptionData[] = [];
        for (let [i, track] of data.tracks.slice(0, maxSongs).entries()) {
          messageSelectData.push({
            description: `${track.info.author} | ${toHumanTime(track.info.length)}`,
            label: track.info.title,
            value: `${i++}`,
          });
        }

        const embedChoice = new EmbedBuilder()
          .setColor(COLORS.GENERAL)
          .setTitle("Select a song")
          .setDescription(description);

        const selectMenu = new StringSelectMenuBuilder()
          .setMinValues(1)
          .setMaxValues(maxSongs)
          .setPlaceholder("Select a song")
          .setCustomId("selectMenuSearch")
          .setOptions(messageSelectData);

        const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);

        const msgEmbedChoice = await ctx.reply({
          embeds: [embedChoice],
          components: [row],
        });
        const collector = msgEmbedChoice.createMessageComponentCollector({
          componentType: ComponentType.SelectMenu,
          time: 30_000,
        });

        collector
          .on("collect", async (interaction): Promise<any> => {
            if (interaction.user.id !== ctx.interaction.user.id) {
              const embed = ctx.makeEmbed(
                ":x: Error",
                `Sorry, but this interaction only for **${ctx.interaction.user.tag}**`,
              );
              return interaction.reply({
                embeds: [embed],
                ephemeral: true,
              });
            }

            const values = interaction.values;
            if (values.length === 0) return;

            const tracks: Track[] = [];

            for (const i of values) {
              tracks.push(data.tracks[Number(i)]);
            }

            const trackDescription = tracks
              .map((track, i) => `${i++ + 1}. ${track.info.title} | ( ${toHumanTime(track.info.length)} )`)
              .join("\n");

            for (const track of tracks) {
              dispatcher?.queue.push(track);
            }

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

            const embed = ctx
              .makeEmbed(
                "Track Added",
                `Added **${tracks.length}** song(s) to queue\n\`\`\`\n${trackDescription}\n\`\`\``,
              )
              .setFooter({ text: user.tag, iconURL: user.avatarURL()! });

            await interaction.reply({ embeds: [embed] });
            delay(15_000).then(() => interaction.deleteReply());

            if (!dispatcher.player!.paused)
              dispatcher.player!.playTrack({
                track: tracks[0].track,
              });

            collector.stop();
          })
          .on("end", () => {
            msgEmbedChoice.delete().catch(() => {});
          });
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

        await ctx.reply({
          embeds: [embedPlaylistSearch],
        });
        delay(15_000).then(() => ctx.interaction.deleteReply());

        if (!dispatcher.player!.paused) dispatcher.player!.playTrack({ track: data.tracks[0].track });
      }
    }
  }
}
