import {
  IFeature,
  RunFeatureParams,
  constructEmbed,
  ClanModel,
  ClanPrivateRoomModel,
  logger,
} from '@lolz-bots/shared';
import { ModalSubmitInteraction, ChannelType } from 'discord.js';

export default class ClanRoomSetLimitModalFeature implements IFeature<ModalSubmitInteraction> {
  name = 'clanRoomSetLimitModal';

  async run({ interaction }: RunFeatureParams<ModalSubmitInteraction>) {
    const limitStr = interaction.fields.getTextInputValue('userLimit');
    const limit = parseInt(limitStr, 10);

    if (isNaN(limit) || limit < 0 || limit > 99) {
      return interaction.reply({
        embeds: [
          constructEmbed({
            title: '❌ Ошибка',
            description: 'Лимит должен быть числом от 0 до 99',
            customType: 'error',
          }),
        ],
        ephemeral: true,
      });
    }

    const clan = await ClanModel.findOne({ 'users.userID': interaction.user.id });
    if (!clan) {
      return interaction.reply({
        embeds: [
          constructEmbed({
            title: '❌ Ошибка',
            description: 'Вы не состоите в клане',
            customType: 'error',
          }),
        ],
        ephemeral: true,
      });
    }

    const privateRoom = await ClanPrivateRoomModel.findOne({
      ownerId: interaction.user.id,
      clanId: clan.id,
    });

    if (!privateRoom || !privateRoom.roomId) {
      return interaction.reply({
        embeds: [
          constructEmbed({
            title: '❌ Ошибка',
            description: 'У вас нет приватной комнаты',
            customType: 'error',
          }),
        ],
        ephemeral: true,
      });
    }

    const channel = interaction.guild?.channels.cache.get(privateRoom.roomId);
    if (!channel || channel.type !== ChannelType.GuildVoice) {
      return interaction.reply({
        embeds: [
          constructEmbed({
            title: '❌ Ошибка',
            description: 'Комната не найдена',
            customType: 'error',
          }),
        ],
        ephemeral: true,
      });
    }

    try {
      await channel.setUserLimit(limit);

      return interaction.reply({
        embeds: [
          constructEmbed({
            title: '✅ Успешно',
            description: limit === 0 
              ? 'Лимит участников снят' 
              : `Лимит участников установлен: **${limit}**`,
            customType: 'success',
          }),
        ],
        ephemeral: true,
      });
    } catch (error) {
      logger.error('Error setting clan room limit:', error);
      return interaction.reply({
        embeds: [
          constructEmbed({
            title: '❌ Ошибка',
            description: 'Не удалось установить лимит',
            customType: 'error',
          }),
        ],
        ephemeral: true,
      });
    }
  }
}
