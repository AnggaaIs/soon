import { Command } from "@soon/structures/Command";
import { CommandContext } from "@soon/structures/CommandContext";
import { CommandOptions } from "@soon/typings";
import { ApplyOptions } from "@soon/utils/decorators/ApplyOptions";
import { Message } from "discord.js";

@ApplyOptions<CommandOptions>({
  name: "ping",
  description: "Check bot latency.",
  category: "General",
  cooldown: 10,
})
export class PingCommand extends Command {
  public async exec(ctx: CommandContext): Promise<Message | void> {
    const ping = this.client.ws.ping;
    return ctx.reply(`:ping_pong: | **Pong!** ${ping}ms`);
  }
}
