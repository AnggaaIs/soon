import { Listener } from "@soon/structures/Listener";
import { ListenerOptions } from "@soon/typings";
import { ApplyOptions } from "@soon/utils/decorators/ApplyOptions";

@ApplyOptions<ListenerOptions>((client) => ({
  name: "close",
  emitter: client.shoukaku,
}))
export class CLoseListener extends Listener {
  public exec(name: string, code: number, reason: string): void {
    this.client.logger.info(`[Lavalink] Node ${name} closed | Code: ${code} | Reason: ${reason}`);
  }
}
