import { DispatcherOptions } from "@soon/typings";
import { handleVoiceForCollector, toHumanTime } from "@soon/utils";
import { COLORS } from "@soon/utils/Constants";
import { APIMessage } from "discord-api-types/v9";
import {
  ComponentType,
  InteractionReplyOptions,
  Message,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonInteraction,
  EmbedBuilder,
  TextChannel,
  VoiceChannel,
  ButtonStyle,
} from "discord.js";
import { Node, Player } from "shoukaku";
import chunkText from "chunk-text";

import { BotClient } from "../Client";
import { LavalinkQueue } from "./Queue";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

enum LoopType {
  NONE,
  QUEUE,
}

enum LoopTypeCurrent {
  NONE,
  SONG,
}

enum StopType {
  NORMAL,
  SKIP,
}

export class LavalinkDispatcher {
  public player: Player | null = null;
  public queue = new LavalinkQueue();
  public loopType: LoopType = LoopType.NONE;
  public loopTypeCurrent: LoopTypeCurrent = LoopTypeCurrent.NONE;
  public timeout: NodeJS.Timeout | null = null;
  public stopType: StopType = StopType.NORMAL;
  private _lastTrackMessageId: string | null = null;
  private _lastTrackExceptionMessageId: string | null = null;
  private _lastMuteMessageId: string | null = null;

  public constructor(public client: BotClient, public readonly options: DispatcherOptions) {}

  public async connect(): Promise<{
    status: boolean;
    error?: Error;
  }> {
    const player = await this.client.shoukaku
      .getNode()!
      .joinChannel({
        guildId: this.guild!.id,
        channelId: this.voiceChannel.id,
        shardId: this.guild!.shardId,
        deaf: true,
      })
      .catch((error: Error) => error);

    if (player instanceof Error) {
      return { status: false, error: player };
    }

    this.player = player;
    this.handleListener();
    return { status: true };
  }

  public async sendMessageSong(): Promise<void> {
    const track = this.queue.current!;
    const authorId = this.queue.current?.requester!;
    const author = this.client.users.cache.get(authorId);
    const duration = track.info.isStream ? "🔴 Live" : toHumanTime(track.info.length);

    const embed = this.options.ctx
      .makeEmbed(
        ":notes: Started Playing",
        `**[${track.info.title}](${track.info.uri})** | \`( ${duration} ) [ ${author!.tag} ]\``,
      )
      .setThumbnail(this.queue.currentThumbnail);

    const row1 = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId("stop").setEmoji("🗑️").setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId("previous").setEmoji("⏮️").setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId("pause_resume").setEmoji("⏯️").setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId("skip").setEmoji("⏭️").setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId("loop_queue").setEmoji("🔁").setStyle(ButtonStyle.Primary),
    );

    const row2 = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId("loop_song").setEmoji("🔂").setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId("lyrics").setEmoji("📃").setStyle(ButtonStyle.Primary),
    );

    if (this.queue.length === 1) {
      row1.components[1].setDisabled(true);
      row1.components[3].setDisabled(true);
    } else {
      if (this.queue.indexCurrent === 0) {
        row1.components[1].setDisabled(true);
      }
      if (this.queue.indexCurrent === this.queue.length - 1) {
        row1.components[3].setDisabled(true);
      }
    }

    const tChannel = await this.textChannel.send({
      embeds: [embed],
      components: [row1, row2],
    });
    this.lastSongMessageId = tChannel.id;

    const collector = (tChannel as Message).createMessageComponentCollector({
      componentType: ComponentType.Button,
    });

    collector.on("collect", async (interaction) => {
      const customId = interaction.customId;

      const handler = await handleVoiceForCollector(this, interaction);
      if (!handler) return;

      switch (customId) {
        case "stop": {
          const embedStop = this.options.ctx
            .makeEmbed("Stop", "Stopped song, destroy queue, and exit from voice channel")
            .setFooter({
              text: interaction.user.tag,
              iconURL: interaction.user.displayAvatarURL(),
            });

          await interaction.reply({ embeds: [embedStop] });
          delay(10_000).then(() => interaction.deleteReply());

          this.client.shoukaku.destroyAll(this.guild!.id);

          break;
        }
        case "previous": {
          const embedPrev = this.options.ctx.makeEmbed("Previous", "Skip to previous song").setFooter({
            text: interaction.user.tag,
            iconURL: interaction.user.displayAvatarURL(),
          });

          await interaction.reply({ embeds: [embedPrev] });
          delay(10_000).then(() => interaction.deleteReply());

          this.stopType = StopType.SKIP;
          this.queue.indexCurrent = this.queue.indexCurrent - 2;
          this.player?.stopTrack();

          break;
        }
        case "pause_resume": {
          if (this.guild?.members.me?.voice.mute) {
            const embedMute = this.options.ctx
              .makeEmbed(":x: Error", "You can't use this button when I am muted!")
              .setFooter({
                text: interaction.user.tag,
                iconURL: interaction.user.displayAvatarURL(),
              });

            await interaction.reply({
              embeds: [embedMute],
              ephemeral: true,
            });
            return;
          }

          const embedPauseResume = this.options.ctx.makeEmbed(
            `${this.player?.paused ? "Resume" : "Pause"}`,
            `${this.player?.paused ? "Resumed" : "Paused"} song **${this.queue.current?.info.title ?? "Unknown"}** ${
              this.player?.paused ? "" : `| Position: **${toHumanTime(this.player?.position ?? 0)}**`
            }`,
          );

          await interaction.reply({ embeds: [embedPauseResume] });
          delay(10_000).then(() => interaction.deleteReply());

          this.player?.setPaused(!this.player.paused);

          break;
        }
        case "skip": {
          const embedSkip = this.options.ctx
            .makeEmbed("Skip", `Skipped song **${this.queue.current?.info.title ?? "Unknown"}**`)
            .setFooter({
              text: interaction.user.tag,
              iconURL: interaction.user.displayAvatarURL(),
            });

          await interaction.reply({ embeds: [embedSkip] });
          delay(10_000).then(() => interaction.deleteReply());

          this.stopType = StopType.SKIP;
          this.player?.stopTrack();

          break;
        }
        case "loop_queue": {
          let loopMode = "None";

          if (this.loopType === LoopType.NONE) {
            loopMode = "active";
            this.loopType = LoopType.QUEUE;
          } else if (this.loopType === LoopType.QUEUE) {
            loopMode = "disabled";
            this.loopType = LoopType.NONE;
          }

          const embedLoop = this.options.ctx.makeEmbed("Loop", `Loop queue is now ${loopMode}`).setFooter({
            text: interaction.user.tag,
            iconURL: interaction.user.displayAvatarURL(),
          });

          await interaction.reply({ embeds: [embedLoop] });
          delay(10_000).then(() => interaction.deleteReply());

          break;
        }
        case "loop_song": {
          let loopModeSong = "None";

          if (this.loopTypeCurrent === LoopTypeCurrent.NONE) {
            loopModeSong = "active";
            this.loopTypeCurrent = LoopTypeCurrent.SONG;
          } else if (this.loopTypeCurrent === LoopTypeCurrent.SONG) {
            loopModeSong = "disabled";
            this.loopTypeCurrent = LoopTypeCurrent.NONE;
          }

          const embedLoopSong = this.options.ctx.makeEmbed("Loop", `Loop song is now ${loopModeSong}`).setFooter({
            text: interaction.user.tag,
            iconURL: interaction.user.displayAvatarURL(),
          });

          await interaction.reply({ embeds: [embedLoopSong] });
          delay(10_000).then(() => interaction.deleteReply());

          break;
        }
        case "lyrics": {
          await interaction.deferReply();

          const searches = await this.client.geniusClient.songs.search(track.info.title, {
            sanitizeQuery: true,
          });
          if (searches.length === 0) {
            const embed = this.options.ctx.makeEmbed(":x: Error", "No lyric found");
            await interaction.followUp({ embeds: [embed] });
            return;
          }

          const song = searches[0];
          const lyrics = await song.lyrics();
          const chunkLyrics = chunkText(lyrics, 2040);

          for (const [i, ril] of chunkLyrics.entries()) {
            const embed = new EmbedBuilder()
              .setColor(COLORS.GENERAL)
              .setTitle(i === 0 ? `${song.title}` : "")
              .setAuthor({
                name: i === 0 ? song.artist.name : "",
                iconURL: i === 0 ? song.artist.thumbnail : "",
              })
              .setThumbnail(i === 0 ? song.thumbnail : "")
              .setDescription(ril)
              .setFooter({
                text: i === chunkLyrics.length - 1 ? "Data provided by Genius" : "",
              });

            await interaction.followUp({ embeds: [embed] });
          }
          break;
        }
      }
    });
  }

  private handleListener() {
    this.player!.on("start", async () => {
      if (this.timeout !== null || this.timeout) {
        clearTimeout(this.timeout);
      }

      if (this.guild?.members.me?.voice.mute) {
        this.player!.setPaused(true);
        const embed = this.options.ctx.makeEmbed(
          "⚠️ Warning",
          "I am currently on mute, the track will be paused until I am on unmute",
        );

        this.textChannel.send({ embeds: [embed] }).then((message) => {
          this.lastMuteMessageId = message.id;
        });
      }

      await this.sendMessageSong();
    });

    this.player!.on("end", () => {
      if (this.queue.length > 0 && this.queue.length !== this.queue.indexCurrent) {
        this.queue.indexCurrent += 1;
      }

      if (this.stopType === StopType.NORMAL) {
        if (this.loopTypeCurrent === LoopTypeCurrent.SONG) this.queue.indexCurrent -= 1;

        if (this.loopType === LoopType.QUEUE && this.queue.indexCurrent === this.queue.length) {
          this.queue.indexCurrent = 0;

          const embed = this.options.ctx.makeEmbed("Looped Queue", "All tracks are played back");
          this.textChannel.send({ embeds: [embed] }).then((message) => {
            delay(15_000).then(() => message.delete());
          });
        }
      } else {
        this.loopTypeCurrent = LoopTypeCurrent.NONE;
      }

      this.stopType = StopType.NORMAL;
      if (this.queue.length !== this.queue.indexCurrent) {
        this.player!.playTrack({ track: this.queue.current!.track });
      }

      if (this.queue.length === this.queue.indexCurrent) {
        this.lastSongMessageId = null;

        this.timeout = setTimeout(() => {
          this.textChannel
            .send({
              embeds: [
                this.options.ctx.makeEmbed(
                  "",
                  "There is no activity for a long time! disconnected from voice channel.",
                ),
              ],
            })
            .then((m) => {
              delay(30_000).then(() => m.delete().catch(() => {}));
            });
          this.client.shoukaku.destroyAll(this.guild!.id);
        }, 120_000);

        this.textChannel
          .send({
            embeds: [this.options.ctx.makeEmbed("", "No song to be played")],
          })
          .then((m) => {
            delay(30_000).then(() => m.delete().catch(() => {}));
          });
      }
    });
    this.player!.on("exception", async (data) => {
      this.lastSongMessageId = null;
      const embed = this.options.ctx
        .makeEmbed(
          "Track Exception",
          `There are exceptions when playing this track, skipping track.\n\`\`\`java\n${data.exception?.message}\n\`\`\``,
        )
        .setTimestamp();

      this.textChannel.send({ embeds: [embed] }).then((m) => {
        this.lastSongExceptionMessageId = m.id;
      });

      this.stopType = StopType.SKIP;
      if (this.player !== null) this.player.stopTrack();
    });
    this.player!.on("stuck", async () => {
      this.lastSongMessageId = null;
      const track = this.queue.current!;

      const embed = this.options.ctx
        .makeEmbed("Track Stuck", `Track **${track.info.title ?? "Unknown"}** got stuck, skipping track.`)
        .setTimestamp();

      this.textChannel.send({ embeds: [embed] }).then((m) => {
        this.lastSongExceptionMessageId = m.id;
      });

      this.stopType = StopType.SKIP;
      if (this.player !== null) this.player.stopTrack();
    });
  }

  public get guild() {
    return this.options.ctx.interaction.guild;
  }

  public get member() {
    return this.options.ctx.interaction.guild?.members.cache.get(this.options.ctx.interaction.user.id);
  }

  public get textChannel() {
    return this.options.textChannel;
  }

  public set textChannel(channel: TextChannel) {
    this.options.textChannel = channel;
  }

  public get voiceChannel() {
    return this.options.voiceChannel;
  }

  public set voiceChannel(vc: VoiceChannel) {
    this.options.voiceChannel = vc;
  }

  public get lastSongMessageId(): string | null {
    return this._lastTrackMessageId;
  }

  public set lastSongMessageId(value: string | null) {
    if (this._lastTrackMessageId !== null) {
      this.textChannel.messages
        .fetch(this._lastTrackMessageId)
        .then((message) => {
          message.delete().catch(() => {});
        })
        .catch(() => {});
    }
    this._lastTrackMessageId = value;
  }

  public get lastSongExceptionMessageId(): string | null {
    return this._lastTrackExceptionMessageId;
  }

  public set lastSongExceptionMessageId(value: string | null) {
    if (this._lastTrackExceptionMessageId !== null) {
      this.textChannel.messages
        .fetch(this._lastTrackExceptionMessageId)
        .then((message) => {
          if (!message) return;
          message.delete().catch(() => {});
        })
        .catch(() => {});
    }
    this._lastTrackExceptionMessageId = value;
  }

  public get lastMuteMessageId(): string | null {
    return this._lastMuteMessageId;
  }

  public set lastMuteMessageId(value: string | null) {
    if (this._lastMuteMessageId !== null) {
      this.textChannel.messages
        .fetch(this._lastMuteMessageId)
        .then((message) => {
          if (!message) return;
          message.delete().catch(() => {});
        })
        .catch(() => {});
    }
    this._lastMuteMessageId = value;
  }
}
