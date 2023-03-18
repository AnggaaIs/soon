import { Command } from "@soon/structures/Command";
import { CommandContext } from "@soon/structures/CommandContext";
import { LavalinkDispatcher } from "@soon/structures/shoukaku/Dispatcher";
import { CommandOptions } from "@soon/typings";
import { spliceIntoChunks, toHumanTime } from "@soon/utils";
import { COLORS } from "@soon/utils/Constants";
import { ApplyOptions } from "@soon/utils/decorators/ApplyOptions";
import { stripIndents } from "common-tags";
import {
  EmbedField,
  Message,
  ActionRowBuilder,
  ButtonBuilder,
  EmbedBuilder,
  ComponentType,
  ButtonStyle,
} from "discord.js";
import { Track } from "shoukaku";
import { queueEmpty } from "@soon/utils/decorators/Music";

@ApplyOptions<CommandOptions>({
  name: "queue",
  description: "See Queue",
  category: "Music",
})
export class QueueCommand extends Command {
  @queueEmpty()
  public async exec(ctx: CommandContext): Promise<Message | void> {
    await ctx.deferReply();
    const guild = ctx.interaction.guild!;
    const user = ctx.user;
    const dispatcher = this.client.shoukaku.dispatcher.get(guild.id)!;

    const next = dispatcher.queue[1];

    const queue: { track: Track; i: number }[] = [];
    let index = 0;
    const max = 5;
    let tL = 0;

    if (dispatcher.queue.length > 0) {
      for (let [i, t] of dispatcher.queue.entries()) {
        tL += t.info.length;
        queue.push({ track: t, i: i++ + 1 });
      }
    }

    const chunk: Array<Array<{ track: Track; i: number }>> = spliceIntoChunks(queue, max);
    const field = getTracks(index, chunk, ctx, tL, dispatcher);

    const embed = new EmbedBuilder()
      .setColor(COLORS.GENERAL)
      .setThumbnail(guild.iconURL())
      .setAuthor({
        name: `Songs queue | ${guild.name}`,
        iconURL: guild.iconURL()!,
      })
      .setFields(field)
      .setFooter({
        text: `Page ${index + 1} of ${chunk.length === 0 ? "1" : chunk.length}`,
      });

    if (dispatcher.queue.size < 6) {
      await ctx.reply({ embeds: [embed] });
    } else {
      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setCustomId("prev").setEmoji("⬅️").setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId("next").setEmoji("➡️").setStyle(ButtonStyle.Primary),
      );

      const msg = await ctx.reply({
        embeds: [embed],
        components: [row],
      });

      const collector = msg.createMessageComponentCollector({
        componentType: ComponentType.Button,
      });

      collector.on("collect", async (interaction) => {
        if (interaction.user.id !== user.id) {
          const embed = ctx.makeEmbed(":x: Error", `Sorry, but this interaction only for **${user.tag}**`);
          interaction.reply({
            embeds: [embed],
            ephemeral: true,
          });
          return;
        }

        const customId = interaction.customId;
        switch (customId) {
          case "next": {
            if (index === chunk.length - 1) index = 0;
            else index++;
            break;
          }
          case "prev": {
            if (index === 0) index = chunk.length - 1;
            else index--;
          }
        }

        const field = getTracks(index, chunk, ctx, tL, dispatcher);

        const embed = new EmbedBuilder()
          .setColor(COLORS.GENERAL)
          .setThumbnail(guild.iconURL())
          .setAuthor({
            name: `Songs queue | ${guild.name}`,
            iconURL: guild.iconURL()!,
          })
          .setFields(field)
          .setFooter({
            text: `Page ${index + 1} of ${chunk.length === 0 ? "1" : chunk.length}`,
          });
        interaction.update({ embeds: [embed] });
      });
    }
  }
}

export function getTracks(
  index: number,
  chunk: Array<Array<{ track: Track; i: number }>>,
  ctx: CommandContext,
  tl: number,
  dispatcher: LavalinkDispatcher,
): EmbedField[] {
  const field: EmbedField[] = [];
  const indexCurrent = dispatcher.queue.indexCurrent;

  if (indexCurrent !== dispatcher.queue.length) {
    field.push({
      name: "Current",
      value: `${dispatcher.queue.current?.info.title ?? "Unknown"}`,
      inline: false,
    });
  }
  if (indexCurrent + 1 < dispatcher.queue.length || dispatcher.loopType === 1 || dispatcher.loopTypeCurrent === 1) {
    if (dispatcher.loopTypeCurrent === 1) {
      field.push({
        name: "Next (Loop Current)",
        value: `${dispatcher.queue[dispatcher.queue.indexCurrent].info.title ?? "Unknown"}`,
        inline: false,
      });
    }

    if (indexCurrent + 1 === dispatcher.queue.length && dispatcher.loopType === 1) {
      if (dispatcher.loopTypeCurrent !== 1) {
        field.push({
          name: "Next (Loop Queue)",
          value: `${dispatcher.queue[0].info.title ?? "Unknown"}`,
          inline: false,
        });
      }
    }

    if (indexCurrent + 1 < dispatcher.queue.length && dispatcher.loopTypeCurrent === 0) {
      field.push({
        name: "Next",
        value: `${dispatcher.queue[indexCurrent + 1].info.title ?? "Unknown"}`,
        inline: false,
      });
    }
  }

  if (chunk.length > 0) {
    field.push({
      name: "Queue",
      value: `\`\`\`\n${chunk[index]
        .map(
          (x) =>
            `${x.i === indexCurrent + 1 ? `(${x.i})` : `${x.i}`}. ${x.track.info.title} | ( ${toHumanTime(
              x.track.info.length,
            )} ) [ ${ctx.client.users.cache.get(x.track.requester!)?.tag} ]`,
        )
        .join("\n\n")}\n\`\`\``,
      inline: false,
    });
  }
  return field;
}
