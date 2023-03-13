import { LavalinkDispatcher } from "@soon/structures/shoukaku/Dispatcher";
import { ButtonInteraction } from "discord.js";

export async function handleVoiceForCollector(
  dispatcher: LavalinkDispatcher,
  interaction: ButtonInteraction,
): Promise<boolean> {
  if (!dispatcher.player) return false;

  const userVoiceChannel = dispatcher.guild?.members.cache.get(interaction.user.id)?.voice.channel;
  const clientVoiceChannel = dispatcher.voiceChannel;
  const ctx = dispatcher.options.ctx;
  const user = interaction.user;

  if (!userVoiceChannel) {
    const embed = ctx
      .makeEmbed(":x: Error", "You are not in a voice channel.")
      .setFooter({ text: user.tag, iconURL: user.avatarURL()! });

    interaction.reply({ embeds: [embed], ephemeral: true });
    return false;
  }

  if (userVoiceChannel.id !== clientVoiceChannel.id) {
    const embed = ctx.makeEmbed(":x: Error", `You have to be in the **${clientVoiceChannel.name}** voice channel`);

    interaction.reply({ embeds: [embed], ephemeral: true });

    return false;
  }

  return true;
}
