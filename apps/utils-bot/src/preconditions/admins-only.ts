import { IPrecondition } from '@lolz-bots/shared';
import {
  BaseInteraction,
  GuildMemberRoleManager,
  MessageFlags,
  Role,
} from 'discord.js';

export default class AdminsOnly implements IPrecondition {
  name = 'admins-only';

  async run({ interaction }: { interaction: BaseInteraction }): Promise<boolean> {
    if (!interaction.isChatInputCommand() && !interaction.isMessageComponent()) {
      return false;
    }

    const member = interaction.member;
    if (!member) return false;
    const roles = member.roles as GuildMemberRoleManager;
    const adminIds = process.env.ADMIN_ROLE_IDS?.split(',') || [];
    const hasAdminRole = roles.cache.some((role: Role) =>
      adminIds.includes(role.id)
    );

    if (!hasAdminRole) {
      if (interaction.isRepliable()) {
        await interaction.reply({
          content: 'У вас нет прав для использования этой команды!',
          ephemeral: true,
        });
      }
      return false;
    }

    return true;
  }
}
