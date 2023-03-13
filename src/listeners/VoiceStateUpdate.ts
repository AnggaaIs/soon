import { Listener } from "@soon/structures/Listener";
import { ListenerOptions } from "@soon/typings";
import { COLORS } from "@soon/utils/Constants";
import { ApplyOptions } from "@soon/utils/decorators/ApplyOptions";
import { EmbedBuilder, VoiceChannel, VoiceState } from "discord.js";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

@ApplyOptions<ListenerOptions>({
  name: "voiceStateUpdate",
})
export class VoiceStateUpdate extends Listener {
  public async exec(oldState: VoiceState, newState: VoiceState): Promise<void> {
    const oldChannel = oldState.channel;
    const newChannel = newState.channel;
    const guild = newState.guild ?? oldState.guild;
    const member = newState.member ?? oldState.member;
    const oldMember = oldState.member;
    const newMember = newState.member;
    const oldMute = oldState.mute;
    const newMute = newState.mute;
    const oldDeaf = oldState.deaf;
    const newDeaf = newState.deaf;
    const dispatcher = this.client.shoukaku.dispatcher.get(guild.id);
    if (!dispatcher) return;

    const newVoiceChannel = this.client.channels.cache.get(newChannel?.id ?? "") as VoiceChannel;

    if (
      member?.id === this.client.user?.id &&
      oldChannel?.id !== newChannel?.id &&
      dispatcher.voiceChannel.id !== newChannel?.id
    ) {
      dispatcher.voiceChannel = newVoiceChannel;
    }

    if (member?.id === this.client.user?.id && oldChannel?.id && !newChannel?.id) {
      this.client.shoukaku.destroyAll(guild.id);
    }

    if (member?.id === this.client.user?.id && !oldMute && newMute) {
      dispatcher.player?.setPaused(true);

      const embed = new EmbedBuilder()
        .setColor(COLORS.GENERAL)
        .setTitle("Muted")
        .setDescription("**OH NOOO!!!** I have been muted, track paused until I'm not muted");

      dispatcher.textChannel.send({ embeds: [embed] }).then((message) => {
        delay(15_000).then(() => message.delete());
      });
    }

    if (member?.id === this.client.user?.id && oldMute && !newMute) {
      dispatcher.player?.setPaused(false);

      const embed = new EmbedBuilder()
        .setColor(COLORS.GENERAL)
        .setTitle("Unmuted")
        .setDescription("I have been unmuted. Resumed track.");

      dispatcher.lastMuteMessageId = null;
      dispatcher.textChannel.send({ embeds: [embed] }).then((message) => {
        delay(15_000).then(() => message.delete());
      });
    }
  }
}
