import { InteractionReplyOptions } from "discord.js";

declare module "discord.js" {
  export interface InteractionReplyOptions {
    timeout?: number;
  }
}
