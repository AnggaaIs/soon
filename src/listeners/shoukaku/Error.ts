import { Listener } from "@soon/structures/Listener";
import { ListenerOptions } from "@soon/typings";
import { ApplyOptions } from "@soon/utils/decorators/ApplyOptions";

@ApplyOptions<ListenerOptions>((client) => ({
  name: "error",
  emitter: client.shoukaku,
}))
export class ErrorListener extends Listener {
  public exec(name: string, error: Error): void {
    this.client.logger.error(`[Lavalink] ${name}: ${error.message}`);
  }
}
