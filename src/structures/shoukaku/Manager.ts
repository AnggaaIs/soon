import { DispatcherOptions } from "@soon/typings";
import { Collection } from "discord.js";
import { Connectors, Shoukaku, Constants, LavalinkResponse } from "shoukaku";

import { BotClient } from "../Client";
import { LavalinkDispatcher } from "./Dispatcher";

export class ShoukakuManager extends Shoukaku {
  public dispatcher: Collection<string, LavalinkDispatcher> = new Collection();
  public constructor(public client: BotClient) {
    super(new Connectors.DiscordJS(client), client.config.botConfig.nodes, {
      moveOnDisconnect: true,
      reconnectInterval: 10_000,
      reconnectTries: 5,
    });
  }

  public getDispatcher(options: DispatcherOptions): LavalinkDispatcher {
    if (!this.dispatcher.has(options.ctx.interaction.guild!.id)) {
      this.dispatcher.set(options.ctx.interaction.guild!.id, new LavalinkDispatcher(this.client, options));
    }

    const dispatcher = this.dispatcher.get(options.ctx.interaction.guild!.id)!;
    if (
      dispatcher.player?.connection.state === Constants.State.CONNECTED &&
      !dispatcher.player.track &&
      dispatcher.queue.size === 0 &&
      !dispatcher.queue.current &&
      dispatcher.textChannel!.id !== options.textChannel.id
    )
      dispatcher.textChannel = options.textChannel;

    return this.dispatcher.get(options.ctx.interaction.guild!.id)!;
  }

  public destroyAll(guildId: string): void {
    const dispatcher = this.dispatcher.get(guildId);
    if (!dispatcher || !this.dispatcher.has(guildId)) return;

    if (dispatcher.player !== null) {
      if (dispatcher.player.connection.state === Constants.State.CONNECTED) dispatcher.player.connection.disconnect();
      dispatcher.player.connection.destroyLavalinkPlayer();
    }

    dispatcher.lastMuteMessageId = null;
    dispatcher.lastSongMessageId = null;
    dispatcher.lastSongExceptionMessageId = null;

    this.dispatcher.delete(guildId);
  }

  public async search(query: string, options: { requester: string }): Promise<LavalinkResponse | Error> {
    let isUrl = false;

    try {
      new URL(query);
      isUrl = true;
    } catch {
      isUrl = false;
    }

    const data = await this.client.shoukaku
      .getNode()!
      .rest.resolve(isUrl ? query : `ytsearch:${query}`)
      .catch((error: Error) => error);

    if (data instanceof Error) return data;

    if (data?.loadType !== "NO_MATCHES") {
      for (const track of data!.tracks) {
        track.requester = options.requester;
      }
    }

    return data as LavalinkResponse;
  }
}
