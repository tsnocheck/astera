import {
  IFeature,
  RunFeatureParams,
  constructEmbed,
  ClanModel,
} from '@lolz-bots/shared';
import { ButtonInteraction } from 'discord.js';

export default class ClanDeleteAvatarFeature implements IFeature<ButtonInteraction> {
  name = 'clanDeleteAvatar';

  async run({ interaction }: RunFeatureParams<ButtonInteraction>) {
    // Находим клан, где пользователь овнер
    const clan = await ClanModel.findOne({ owner: interaction.user.id });

    if (!clan) {
      return interaction.reply({
        embeds: [
          constructEmbed({
            title: '❌ Ошибка',
            description: 'Вы не являетесь овнером клана',
            customType: 'error',
          }),
        ],
        ephemeral: true,
      });
    }

    if (!clan.avatarURL) {
      return interaction.reply({
        embeds: [
          constructEmbed({
            title: '❌ Ошибка',
            description: 'У клана нет аватарки',
            customType: 'error',
          }),
        ],
        ephemeral: true,
      });
    }

    // Удаляем аватарку
    await ClanModel.updateOne(
      { _id: clan._id },
      { $unset: { avatarURL: '' } }
    );

    return interaction.reply({
      embeds: [
        constructEmbed({
          title: '✅ Успешно',
          description: `Аватарка клана **${clan.name}** удалена`,
          customType: 'success',
        }),
      ],
      ephemeral: true,
    });
  }
}
