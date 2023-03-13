import { Awaitable, ListenerOptions } from "@soon/typings";

import { BotClient } from "./Client";

export abstract class Listener {
  public constructor(public client: BotClient, public options: ListenerOptions) {}

  public abstract exec(...params: unknown[]): Awaitable<unknown>;
}
