import { readdirSync } from "node:fs";
import { join } from "node:path";

import { Collection } from "discord.js";

import { BotClient } from "../Client";
import { Command } from "../Command";
const fileTypes = /\.(js|ts)$/;

export class CommandManager extends Collection<string, Command> {
  public constructor(public client: BotClient) {
    super();
  }
  public category: Array<string> = [];

  public async init(directory: string): Promise<void> {
    try {
      const files = readdirSync(directory, { withFileTypes: true });

      for (const file of files) {
        if (file.isDirectory()) {
          this.category.push(file.name);
          this.init(join(directory, file.name));
          continue;
        }
        if (!fileTypes.test(file.name)) continue;

        const importedCommand = require(join(directory, file.name));
        const command: Command = new importedCommand[Object.keys(importedCommand)[0]](this.client);
        const option = command.options;

        this.set(option.name, command);
      }
    } catch (error: any) {
      this.client.logger.error("Failed to load commands", error.stack);
    }
  }

  public getCommand(name: string): Command | undefined {
    return this.get(name);
  }

  public getCommandsByCategory(category: string): Array<Command> {
    const commands = this.filter((command) => command.options.category.toLowerCase() === category.toLowerCase());
    return [...commands.values()];
  }
}
