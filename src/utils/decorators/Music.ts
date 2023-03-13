import { TextChannel, VoiceChannel } from "discord.js";

import { Inhibit } from "./Inhibit";

/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-return,  */

export function inVoiceChannel(): any {
  return Inhibit(async (ctx) => {
    await ctx.deferReply();
    const user = ctx.interaction.user;

    const voiceChannel = ctx.interaction.guild?.members.cache.get(user.id)?.voice.channel;

    if (!voiceChannel) {
      const embed = ctx
        .makeEmbed(":x: Error", "You are not in a voice channel.")
        .setFooter({ text: user.tag, iconURL: user.avatarURL()! });

      return ctx.reply({ embeds: [embed], timeout: 15_000 });
    }
  });
}

export function isVoiceChannelSame(): any {
  return Inhibit(async (ctx) => {
    await ctx.deferReply();
    const user = ctx.interaction.user;
    const voiceChannel = ctx.interaction.guild?.members.cache.get(user.id)!.voice.channel;
    const channel = ctx.interaction.channel as TextChannel;

    const dispatcher = ctx.client.shoukaku.getDispatcher({
      voiceChannel: voiceChannel as VoiceChannel,
      textChannel: channel,
      ctx,
    });

    if (dispatcher && voiceChannel!.id !== dispatcher.voiceChannel.id) {
      const embed = ctx
        .makeEmbed(":x: Error", `You have to be in the **${dispatcher.voiceChannel.name}** voice channel`)
        .setFooter({ text: user.tag, iconURL: user.avatarURL()! });

      return ctx.reply({ embeds: [embed], timeout: 15_000 });
    }
  });
}
