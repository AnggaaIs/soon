import { CommandOptions, MessageInteractionActionType } from "@soon/typings";
import { COLORS } from "@soon/utils/Constants";
import {
  PermissionsString,
  CommandInteraction,
  InteractionReplyOptions,
  Message,
  User,
  ChannelType,
  EmbedBuilder,
} from "discord.js";

import { BotClient } from "./Client";

export class CommandContext {
  channel: any;
  public constructor(public client: BotClient, public interaction: CommandInteraction) {}

  public async reply(
    content: string | InteractionReplyOptions,
    action: MessageInteractionActionType = "reply",
  ): Promise<Message> {
    let timeout: number | undefined;

    if (this.interaction.deferred && action === "reply") action = "followUp";
    else if (!this.interaction.deferred && action !== "reply") action = "reply";

    if (content instanceof Object) {
      timeout = content.timeout ?? undefined;
      if (content.timeout && content.ephemeral) throw new Error("Cannot set both timeout and ephemeral");
    }

    const msg = (await this.interaction[action](content)) as Message;
    if (timeout) setTimeout(() => this.interaction.deleteReply(), timeout);
    return msg;
  }

  public checkUserPermission(permission: PermissionsString): boolean {
    return this.interaction.guild?.members.cache.get(this.interaction.user.id)?.permissions.has(permission)!;
  }

  public checkClientPermission(permission: PermissionsString): boolean {
    return this.interaction.guild?.members.cache.get(this.client.user!.id)?.permissions.has(permission)!;
  }

  public checkUserPermissions(permissions: PermissionsString[]): PermissionsString[] {
    const missingPermissions: PermissionsString[] = [];

    for (const perm of permissions) {
      if (!this.checkUserPermission(perm)) missingPermissions.push(perm);
    }

    return missingPermissions;
  }

  public checkClientPermissions(permissions: PermissionsString[]): PermissionsString[] {
    const missingPermissions: PermissionsString[] = [];

    for (const perm of permissions) {
      if (!this.checkClientPermission(perm)) missingPermissions.push(perm);
    }

    return missingPermissions;
  }

  public inGuild(): boolean {
    return this.interaction.inGuild();
  }

  public inDM(): boolean {
    return this.interaction.channel?.type === ChannelType.DM;
  }

  public isDev(): boolean {
    return this.client.config.botConfig.owners.includes(this.interaction.user.id);
  }

  public async deferReply(): Promise<void> {
    if (this.interaction.deferred) return;
    await this.interaction.deferReply();
  }

  public get user(): User {
    return this.interaction.user;
  }

  public makeEmbed(title: string, description: string): EmbedBuilder {
    const embed = new EmbedBuilder().setColor(COLORS.GENERAL);
    if (title !== "") embed.setTitle(title);
    if (title !== "") embed.setDescription(description);

    return embed;
  }
}
