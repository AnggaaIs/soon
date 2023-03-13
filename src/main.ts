import { BotClient } from "@soon/structures/Client";
import { IntentsBitField, Partials } from "discord.js";

import { botConfig } from "./config";

const client = new BotClient({
  allowedMentions: {
    repliedUser: true,
    parse: ["users", "roles"],
  },
  intents: new IntentsBitField(32_767),
  failIfNotExists: true,
  partials: [Partials.Channel, Partials.GuildMember, Partials.Message, Partials.Reaction, Partials.User],
});

process
  .on("exit", (code) => {
    client.logger.info(`Process exiting with code ${code}`);
  })
  .on("unhandleRejection", (reason) => {
    client.logger.error(`Unhandled rejection: ${reason}`);
  })
  .on("uncaughtException", (err) => {
    client.logger.error(`Uncaught exception: ${err.stack}`);
  });

client.start();
