import {
  IFeature,
  RunFeatureParams,
  constructEmbed,
  ClanModel,
} from '@lolz-bots/shared';
import { ButtonInteraction } from 'discord.js';

export default class ClanLeaveFeature implements IFeature<ButtonInteraction> {
  name = 'clanLeave';

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

    if (clan.owner === interaction.user.id) {
      return interaction.reply({
        embeds: [
          constructEmbed({
            title: '❌ Ошибка',
            description: 'Овнер не может покинуть клан. Передайте права или удалите клан.',
            customType: 'error',
          }),
        ],
        ephemeral: true,
      });
    }

    await ClanModel.updateOne(
      { _id: clan._id },
      {
        $pull: {
          users: { userID: interaction.user.id },
          coOwners: interaction.user.id,
        },
      }
    );

    return interaction.reply({
      embeds: [
        constructEmbed({
          title: '✅ Успешно',
          description: `Вы покинули клан **${clan.name}**`,
          customType: 'success',
        }),
      ],
      ephemeral: true,
    });
  }
}
