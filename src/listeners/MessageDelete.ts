import { Listener } from "@soon/structures/Listener";
import { ListenerOptions } from "@soon/typings";
import { COLORS } from "@soon/utils/Constants";
import { ApplyOptions } from "@soon/utils/decorators/ApplyOptions";
import { EmbedBuilder, Message } from "discord.js";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

@ApplyOptions<ListenerOptions>({
  name: "messageDelete",
})
export class MessageDelete extends Listener {
  public async exec(message: Message): Promise<void> {
    const guild = message.guild;
    if (guild) {
      const dispatcher = this.client.shoukaku.dispatcher.get(guild?.id);
      if (!dispatcher) return;

      if (message.id === dispatcher.lastSongMessageId) {
        const embedAlert = new EmbedBuilder()
          .setColor(COLORS.GENERAL)
          .setTitle("Uuuppssss")
          .setDescription(
            "👀 Looks like someone deleted the message / panel song, calm down, I'm bringing it back HAHAHAHAHA",
          );

        dispatcher.textChannel.send({ embeds: [embedAlert] }).then((message) => {
          delay(15_000).then(() => message.delete());
        });

        await dispatcher.sendMessageSong();
      }
    }
  }
}
