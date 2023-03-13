import config from "@soon/config";
import { Command } from "@soon/structures/Command";
import { CommandContext } from "@soon/structures/CommandContext";
import { CommandOptions } from "@soon/typings";
import { COLORS } from "@soon/utils/Constants";
import { ApplyOptions } from "@soon/utils/decorators/ApplyOptions";
import chunkText from "chunk-text";
import { Message, ButtonInteraction, EmbedBuilder, ApplicationCommandOptionType } from "discord.js";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

@ApplyOptions<CommandOptions>({
  name: "lyrics",
  description: "Get the lyrics of a song.",
  category: "Music",
  options: [
    {
      name: "title",
      type: ApplicationCommandOptionType.String,
      required: false,
      description: "The title of the song to get the lyrics",
    },
  ],
})
export class LyricsCommand extends Command {
  public async exec(ctx: CommandContext): Promise<Message | void> {
    if (!ctx.interaction.isChatInputCommand()) return;

    let title = ctx.interaction.options.getString("title", false) ?? undefined;
    if (!title) title = this.client.shoukaku.dispatcher.get(ctx.interaction.guild!.id)?.queue.current?.info.title;
    if (title === undefined || !title)
      return ctx.reply({
        embeds: [ctx.makeEmbed(":x: Error", "No song currently playing")],
        ephemeral: true,
      });

    await ctx.deferReply();

    const searches = await this.client.geniusClient.songs.search(title, {
      sanitizeQuery: true,
    });
    if (searches.length === 0) {
      const embed = ctx.makeEmbed(":x: Error", "No lyric found");
      return ctx.reply({ embeds: [embed], timeout: 15_000 });
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

      await ctx.reply({ embeds: [embed] });
    }
  }
}
