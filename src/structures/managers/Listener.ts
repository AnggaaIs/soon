import { readdir, stat } from "node:fs/promises";
import { join } from "node:path";

import { Collection } from "discord.js";

import { BotClient } from "../Client";
import { Listener } from "../Listener";
const fileTypes = /\.(js|ts)$/;

export class ListenerManager extends Collection<string, Listener> {
  public constructor(public client: BotClient) {
    super();
  }

  public async init(directory: string): Promise<void> {
    try {
      const files = await readdir(directory);

      for (const file of files) {
        const stats = await stat(join(directory, file));
        if (stats.isDirectory()) {
          return this.init(join(directory, file));
        }

        if (!fileTypes.test(file)) continue;

        const importedListener = require(join(directory, file));
        const listener: Listener = new importedListener[Object.keys(importedListener)[0]](this.client);
        const option = listener.options;
        if (!option) throw new Error("Listener option is not defined");

        const emitter = option.emitter ?? this.client;

        emitter[option.once ? "once" : "on"](option.name, (...params) => listener.exec(...params));

        this.set(option.name, listener);
      }
    } catch (error: any) {
      this.client.logger.error("Failed to load listeners", error.stack);
    }
  }
}
