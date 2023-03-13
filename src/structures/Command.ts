import { Awaitable, CommandOptions } from "@soon/typings";

import { BotClient } from "./Client";
import { CommandContext } from "./CommandContext";

export abstract class Command {
  public constructor(public client: BotClient, public options: CommandOptions) {}

  public abstract exec(ctx: CommandContext, anyParams: unknown): Awaitable<unknown>;
}
