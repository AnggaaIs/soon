import { BotClient } from "@soon/structures/Client";
import mongoose from "mongoose";

import Guild from "./models/Guild";

export class DatabaseManager {
  public guild: typeof Guild = Guild;
  public constructor(public client: BotClient) {}

  public async connect(): Promise<any> {
    mongoose.set("strictQuery", false);
    await mongoose
      .connect(this.client.config.botConfig.mongo_url)
      .then((d) => d)
      .catch((error) => {
        throw error;
      });
  }
}
