import { join } from "node:path";

import config from "@soon/config";
import { DatabaseManager } from "@soon/database/Manager";
import { Client, ClientOptions, Collection } from "discord.js";

import { Logger } from "./Logger";
import { CommandManager } from "./managers/Command";
import { ListenerManager } from "./managers/Listener";
import { ShoukakuManager } from "./shoukaku/Manager";
import { Client as GeniusClient } from "genius-lyrics";

const geniusClientT = new GeniusClient(config.botConfig.genius.client_access_token);
const listenersDirectory = join(__dirname, "..", "listeners");
const commandsDirectory = join(__dirname, "..", "commands");

export class BotClient extends Client {
  public constructor(options: ClientOptions) {
    super(options);
  }
  public readonly config: typeof config = config;
  public database = new DatabaseManager(this);
  public logger = new Logger();
  public listeners2 = new ListenerManager(this);
  public commands = new CommandManager(this);
  public cooldowns: Collection<string, Collection<string, number>> = new Collection();
  public shoukaku = new ShoukakuManager(this);
  public geniusClient = geniusClientT;

  async start(): Promise<void> {
    try {
      this.database
        .connect()
        .then(() => {
          this.logger.info("Connected to database");

          this.listeners2.init(listenersDirectory);
          this.commands.init(commandsDirectory);
        })
        .catch((error) => this.logger.error("Failed to connect to database", error));

      this.login(this.config.botConfig.token);
    } catch (error) {
      this.logger.error("Failed to start bot", error);
    }
  }
}
