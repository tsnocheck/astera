import {
  IFeature,
  RunFeatureParams,
  constructEmbed,
  ClanModel,
} from '@lolz-bots/shared';
import { ButtonInteraction } from 'discord.js';

export default class ClanVoiceActivityFeature implements IFeature<ButtonInteraction> {
  name = 'clanVoiceActivity';

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

    // Сортируем участников по голосовому времени
    const sortedUsers = [...clan.users].sort((a: any, b: any) => b.voiceTime - a.voiceTime);

    const formatUser = (u: any, index: number) => {
      const hours = Math.floor(u.voiceTime / (60 * 60 * 1000));
      const minutes = Math.floor((u.voiceTime % (60 * 60 * 1000)) / (60 * 1000));
      return `${index + 1}. <@${u.userID}> - ${hours}ч ${minutes}м`;
    };

    const description = sortedUsers.length > 0 
      ? sortedUsers.map(formatUser).join('\n')
      : 'Нет данных о голосовой активности';

    const embed = constructEmbed({
      title: `🎤 Голосовая активность клана ${clan.name}`,
      description,
      customType: 'custom',
    });

    return interaction.reply({
      embeds: [embed],
      ephemeral: true,
    });
  }
}
