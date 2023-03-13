import { Command } from "@soon/structures/Command";
import { CommandContext } from "@soon/structures/CommandContext";
import { CommandOptions } from "@soon/typings";
import { ApplyOptions } from "@soon/utils/decorators/ApplyOptions";
import { Message } from "discord.js";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

@ApplyOptions<CommandOptions>({
  name: "stop",
  description: "Stop the current song, and destroy the player.",
  category: "Music",
  clientPermissions: ["Connect"],
  userPermissions: ["Connect"],
})
export class PlayCommand extends Command {
  public async exec(ctx: CommandContext): Promise<Message | void> {
    const guild = ctx.interaction.guild!;
    const user = ctx.interaction.user;
    const voiceChannel = ctx.interaction.guild?.members.cache.get(user.id)?.voice.channel;
    const dispatcher = this.client.shoukaku.dispatcher.get(guild.id);

    if (!dispatcher || !dispatcher?.queue.length) {
      const embed = ctx
        .makeEmbed(
          ":x: Error",
          "There is no song that is played at this time, add the song with commands `/play, /search`",
        )
        .setFooter({
          text: user.tag,
          iconURL: user.avatarURL()!,
        });
      return ctx.reply({
        embeds: [embed],
        timeout: 15_000,
      });
    }

    if (!voiceChannel) {
      const embed = ctx
        .makeEmbed(":x: Error", "You are not in a voice channel.")
        .setFooter({ text: user.tag, iconURL: user.avatarURL()! });

      return ctx.reply({ embeds: [embed], timeout: 15_000 });
    }

    if (dispatcher && voiceChannel.id !== dispatcher.voiceChannel.id) {
      const embed = ctx
        .makeEmbed(":x: Error", `You have to be in the **${dispatcher.voiceChannel.name}** voice channel`)
        .setFooter({ text: user.tag, iconURL: user.avatarURL()! });

      return ctx.reply({ embeds: [embed], timeout: 15_000 });
    }

    this.client.shoukaku.destroyAll(guild.id);
    const embed = ctx
      .makeEmbed("Stop", "Stopped song, destroy queue, and exit from voice channel")
      .setFooter({ text: user.tag, iconURL: user.avatarURL()! });
    return ctx.reply({ embeds: [embed], timeout: 15_000 });
  }
}
