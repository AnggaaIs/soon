import { Command } from "@soon/structures/Command";
import { CommandContext } from "@soon/structures/CommandContext";
import { CommandOptions } from "@soon/typings";
import { toHumanTime } from "@soon/utils";
import { ApplyOptions } from "@soon/utils/decorators/ApplyOptions";
import { Message } from "discord.js";

@ApplyOptions<CommandOptions>({
  name: "pause",
  description: "Pause the current song.",
  category: "Music",
  cooldown: 5,
  clientPermissions: ["Connect"],
  userPermissions: ["Connect"],
})
export class PauseCommand extends Command {
  public async exec(ctx: CommandContext): Promise<Message | void> {
    if (!ctx.interaction.isChatInputCommand()) return;

    await ctx.deferReply();
    const guild = ctx.interaction.guild!;
    const dispatcher = this.client.shoukaku.dispatcher.get(guild.id);
    const user = ctx.interaction.user;
    const voiceChannel = ctx.interaction.guild?.members.cache.get(user.id)?.voice.channel;
    const position = ctx.interaction.options.getNumber("position", false) ?? 1;
    let noPosition = false;
    if (!ctx.interaction.options.getNumber("position", false)) noPosition = true;

    if (!dispatcher || !dispatcher.queue.totalSize) {
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

    if (guild.members?.me?.voice.mute) {
      const embed = ctx
        .makeEmbed(":x: Error", "You can't use this command while I'm muted.")
        .setFooter({ text: user.tag, iconURL: user.avatarURL()! });

      return ctx.reply({ embeds: [embed], timeout: 15_000 });
    }

    dispatcher.player?.setPaused(!dispatcher.player?.paused);

    const embedPauseResume = ctx.makeEmbed(
      `${dispatcher.player?.paused ? "Resume" : "Pause"}`,
      `${dispatcher.player?.paused ? "Resumed" : "Paused"} song **${
        dispatcher.queue.current?.info.title ?? "Unknown"
      }** ${dispatcher.player?.paused ? "" : `| Position: **${toHumanTime(dispatcher.player?.position ?? 0)}**`}`,
    );

    return ctx.reply({ embeds: [embedPauseResume], timeout: 15_000 });
  }
}
