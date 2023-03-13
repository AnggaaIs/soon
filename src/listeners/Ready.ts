import { BotClient } from "@soon/structures/Client";
import { Listener } from "@soon/structures/Listener";
import { ListenerOptions } from "@soon/typings";
import { syncApplicationCommands } from "@soon/utils";
import { ApplyOptions } from "@soon/utils/decorators/ApplyOptions";

@ApplyOptions<ListenerOptions>({
  name: "ready",
  once: true,
})
export class ReadyListener extends Listener {
  public exec(): void {
    syncApplicationCommands(this.client);

    this.client.logger.info(`Loaded ${this.client.listeners2.size} listeners.`);
    this.client.logger.info(`Loaded ${this.client.commands.size} commands.`);
    this.client.logger.info(`Logged in as ${this.client.user?.tag} (${this.client.user?.id})`);
    this.client.user?.setActivity({
      type: 5,
      name: `v${this.client.config.botConfig.version} | Party with me.`,
    });
  }
}
