import { Listener } from "@soon/structures/Listener";
import { ListenerOptions } from "@soon/typings";
import { ApplyOptions } from "@soon/utils/decorators/ApplyOptions";
import { Player } from "shoukaku";

@ApplyOptions<ListenerOptions>((client) => ({
  name: "disconnect",
  emitter: client.shoukaku,
}))
export class DisconnectListener extends Listener {
  public exec(name: string, _players: Player[], moved: boolean): void {
    this.client.logger.info(`[Lavalink] Node ${name} disconnected | ${moved ? "Moved" : "Disconnected"}`);
  }
}
