import { IPrecondition } from '@lolz-bots/shared';
import {
  BaseInteraction,
  GuildMemberRoleManager,
  MessageFlags,
} from 'discord.js';

export default class ModeratorOnly implements IPrecondition {
  name = 'moderator-only';

  async run({ interaction }: { interaction: BaseInteraction }) {
    if (!interaction.isChatInputCommand()) {
      return false;
    }

    const member = interaction.member;
    if (!member) return false;
    const roles = member.roles as GuildMemberRoleManager;
    const adminRoles = process.env.ADMIN_ROLE_IDS?.split(',') || [];
    if (roles.cache.some((r) => adminRoles.includes(r.id))) {
      return true;
    }
    if (interaction.isRepliable()) {
      await interaction.reply({
        content: 'У вас нет прав для выполнения этой команды.',
        flags: [MessageFlags.Ephemeral],
      });
    }
    return false;
  }
}
