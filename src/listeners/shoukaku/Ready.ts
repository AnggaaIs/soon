import { Listener } from "@soon/structures/Listener";
import { ListenerOptions } from "@soon/typings";
import { ApplyOptions } from "@soon/utils/decorators/ApplyOptions";

@ApplyOptions<ListenerOptions>((client) => ({
  name: "ready",
  emitter: client.shoukaku,
}))
export class ReadyListener extends Listener {
  public exec(name: string, resumed: boolean): void {
    this.client.logger.info(`[Lavalink] Node ${name} connected | ${resumed ? "Resumed" : "New connection"}`);
  }
}
