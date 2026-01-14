import {
  IFeature,
  RunFeatureParams,
  constructEmbed,
  ClanModel,
} from '@lolz-bots/shared';
import { ButtonInteraction } from 'discord.js';

export default class AcceptClanInviteFeature implements IFeature<ButtonInteraction> {
  name = 'acceptClanInvite';

  async run({ interaction }: RunFeatureParams<ButtonInteraction>) {
    // Извлекаем ID клана из customId (acceptClanInvite_clanId)
    const clanId = interaction.customId.split('_')[1];
    
    const clan = await ClanModel.findById(clanId);

    if (!clan) {
      return interaction.update({
        embeds: [
          constructEmbed({
            title: '❌ Ошибка',
            description: 'Клан не найден',
            customType: 'error',
          }),
        ],
        components: [],
      });
    }

    // Проверяем, что пользователь еще не в каком-либо клане
    const userClan = await ClanModel.findOne({ 'users.userID': interaction.user.id });
    if (userClan) {
      return interaction.update({
        embeds: [
          constructEmbed({
            title: '❌ Приглашение недействительно',
            description: `Вы уже состоите в клане **${userClan.name}**`,
            customType: 'error',
          }),
        ],
        components: [],
      });
    }

    // Добавляем пользователя в клан
    await ClanModel.updateOne(
      { _id: clan._id },
      {
        $push: {
          users: {
            userID: interaction.user.id,
            role: 'member',
            online: 0,
            voiceTime: 0,
          },
        },
      }
    );

    return interaction.update({
      embeds: [
        constructEmbed({
          title: '✅ Приглашение принято',
          description: `Вы вступили в клан **${clan.name}**!`,
          customType: 'success',
        }),
      ],
      components: [],
    });
  }
}
