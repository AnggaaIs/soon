import { BotClient } from "@soon/structures/Client";

import { classDecorator } from "..";

/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-return,  */

export function ApplyOptions<T>(option: T | ((param: BotClient) => T)): ClassDecorator {
  return classDecorator((target) => {
    return new Proxy(target, {
      construct: (tgt, [client]) => new tgt(client, option instanceof Function ? option(client) : option),
    });
  });
}
