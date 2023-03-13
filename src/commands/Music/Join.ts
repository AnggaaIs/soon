import { Command } from "@soon/structures/Command";
import { CommandContext } from "@soon/structures/CommandContext";
import { CommandOptions } from "@soon/typings";
import { ApplyOptions } from "@soon/utils/decorators/ApplyOptions";
import { inVoiceChannel } from "@soon/utils/decorators/Music";
import {
  ApplicationCommandOptionType,
  ApplicationCommandType,
  ChannelType,
  Message,
  TextChannel,
  VoiceChannel,
} from "discord.js";
import { Constants } from "shoukaku";

@ApplyOptions<CommandOptions>({
  name: "join",
  description: "Join a voice channel.",
  category: "Music",
  cooldown: 10,
  clientPermissions: ["Connect"],
  userPermissions: ["Connect"],
  options: [
    {
      name: "voice_channel",
      description: "The voice channel to join.",
      type: ApplicationCommandOptionType.Channel,
      channelTypes: [ChannelType.GuildVoice],
      required: false,
    },
    {
      name: "text_channel",
      description: "The text channel to send messages to.",
      type: ApplicationCommandOptionType.Channel,
      channelTypes: [ChannelType.GuildText],
      required: false,
    },
  ],
})
export class JoinCommand extends Command {
  public async exec(ctx: CommandContext): Promise<Message | void> {
    if (!ctx.interaction.isChatInputCommand()) return;

    await ctx.deferReply();
    const guild = ctx.interaction.guild!;
    const user = ctx.interaction.user;
    const channel =
      (ctx.interaction.options.getChannel("text_channel", false) as TextChannel) ??
      (ctx.interaction.channel as TextChannel);

    let voiceChannel = ctx.interaction.options.getChannel("voice_channel", false) as VoiceChannel;
    if (!voiceChannel) voiceChannel = ctx.interaction.guild?.members.cache.get(user.id)?.voice.channel! as VoiceChannel;

    if (!voiceChannel) {
      const embed = ctx
        .makeEmbed(":x: Error", "You are not in a voice channel.")
        .setFooter({ text: user.tag, iconURL: user.avatarURL()! });

      return ctx.reply({ embeds: [embed], timeout: 15_000 });
    }

    let dispatcher = this.client.shoukaku.dispatcher.get(guild.id);

    if (dispatcher) {
      if (voiceChannel.id === dispatcher.voiceChannel.id) {
        const embed = ctx
          .makeEmbed(":x: Error", "I've been Connected to that voice channel")
          .setFooter({ text: user.tag, iconURL: user.avatarURL()! });

        return ctx.reply({ embeds: [embed], timeout: 15_000 });
      } else {
        if (dispatcher.queue.length > 0) {
          const embed = ctx
            .makeEmbed(":x: Error", "There is a song in the queue, you can't do that!")
            .setFooter({ text: user.tag, iconURL: user.avatarURL()! });

          return ctx.reply({ embeds: [embed], timeout: 15_000 });
        }
      }
    } else {
      dispatcher = this.client.shoukaku.getDispatcher({
        voiceChannel: voiceChannel,
        textChannel: channel,
        ctx,
      });
    }

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

    if (
      dispatcher.player &&
      dispatcher.player.connection.state === Constants.State.CONNECTED &&
      dispatcher.queue.length === 0 &&
      voiceChannel.id !== dispatcher.voiceChannel.id
    ) {
      dispatcher.voiceChannel = voiceChannel;
      dispatcher.textChannel = ctx.interaction.channel as TextChannel;

      const connection = await dispatcher.player.connection
        .connect({
          channelId: voiceChannel.id,
          deaf: true,
          guildId: guild.id,
          shardId: guild.shardId,
        })
        .catch((error: Error) => error);

      if (connection instanceof Error) {
        const embed = ctx.makeEmbed(":x: Error", `Failed to join voice channel\n\`\`\`\n${connection.message}\n\`\`\``);
        return ctx.reply({ embeds: [embed], timeout: 15_000 });
      }
    }

    const embedJoin = ctx.makeEmbed(
      "Joined",
      `Joined voice channel **${voiceChannel.name}** and bound to text channel **${channel.name}**`,
    );

    ctx.reply({ embeds: [embedJoin], timeout: 30_000 });
  }
}
