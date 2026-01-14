import {
  IFeature,
  RunFeatureParams,
  constructEmbed,
  ClanModel,
} from '@lolz-bots/shared';
import { ButtonInteraction } from 'discord.js';

export default class ClanProfileFeature implements IFeature<ButtonInteraction> {
  name = 'clanProfile';

  async run({ interaction }: RunFeatureParams<ButtonInteraction>) {
    const clan = await ClanModel.findOne({ 'users.userID': interaction.user.id });

    if (!clan) {
      return interaction.reply({
        embeds: [
          constructEmbed({
            title: '❌ Ошибка',
            description: 'Вы не состоите ни в одном клане',
            customType: 'error',
          }),
        ],
        ephemeral: true,
      });
    }

    const owner = clan.users.find((u: any) => u.userID === clan.owner);
    const coOwners = clan.users.filter((u: any) => clan.coOwners.includes(u.userID));
    const members = clan.users.filter(
      (u: any) => !clan.coOwners.includes(u.userID) && u.userID !== clan.owner
    );

    const formatUser = (u: any) => `<@${u.userID}> - ${u.online}ч онлайна`;

    let description = '';

    if (owner) {
      description += `**👑 Овнер:**\n${formatUser(owner)}\n\n`;
    }

    if (coOwners.length > 0) {
      description += `**👨‍💼 Со-овнеры:**\n${coOwners.map(formatUser).join('\n')}\n\n`;
    }

    if (members.length > 0) {
      description += `**👥 Участники:**\n${members.map(formatUser).join('\n')}`;
    }

    const embed = constructEmbed({
      title: `👥 Участники клана ${clan.name}`,
      description: description || 'Нет участников',
      customType: 'custom',
    });

    return interaction.reply({
      embeds: [embed],
      ephemeral: true,
    });
  }
}
