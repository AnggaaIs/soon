import EventEmitter from "node:events";

import { CommandContext } from "@soon/structures/CommandContext";
import { ClientEvents, TextChannel, VoiceChannel, ApplicationCommandOptionData, PermissionsString } from "discord.js";

export type Awaitable<T> = Promise<T> | T;

export type MessageInteractionActionType = "reply" | "followUp" | "editReply";

export interface DispatcherOptions {
  voiceChannel: VoiceChannel;
  textChannel: TextChannel;
  ctx: CommandContext;
}

export interface CommandOptions {
  name: string;
  category: string;
  description?: string;
  cooldown?: number;
  devOnly?: boolean;
  allowDM?: boolean;
  userPermissions?: PermissionsString[];
  clientPermissions?: PermissionsString[];
  options?: ApplicationCommandOptionData[];
}

export interface ListenerOptions {
  name: keyof ClientEvents | string;
  emitter?: EventEmitter;
  once?: boolean;
}

export interface GuildModelOptions {
  id: string;
  language?: string;
  commandRunning?: {
    date?: Date;
    amount?: number;
  };
}

declare global {
  interface String {
    toProperCase(): string;
  }
}
