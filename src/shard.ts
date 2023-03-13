import { Logger } from "@soon/structures/Logger";
import { ShardingManager } from "discord.js";

import { botConfig } from "./config";

const logger = new Logger();
const shard = new ShardingManager("dist/main.js", {
  respawn: true,
  token: botConfig.token,
  totalShards: botConfig.shards,
});

shard.on("shardCreate", (shard) => {
  logger.info(`[SHARD] Shard ${shard.id} created`);
});

shard.spawn();
