import { IPrecondition } from '@lolz-bots/shared';
import {
  BaseInteraction,
  GuildMemberRoleManager,
  MessageFlags,
} from 'discord.js';

export default class AdminsOnly implements IPrecondition {
  name = 'admins-only';

  async run({ interaction }: { interaction: BaseInteraction }) {
    if (!interaction.isChatInputCommand()) {
      return false;
    }

    const adminIds = process.env.ADMIN_IDS?.split(',').map((id: string) => id.trim()) || [];
    
    if (adminIds.includes(interaction.user.id)) {
      return true;
    }

    if (interaction.isRepliable()) {
      await interaction.reply({
        content: 'У вас нет прав для использования этой команды.',
        flags: [MessageFlags.Ephemeral],
      });
    }
    
    return false;
  }
}
