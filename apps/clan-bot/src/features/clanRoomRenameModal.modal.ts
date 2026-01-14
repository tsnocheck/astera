import {
  IFeature,
  RunFeatureParams,
  constructEmbed,
  ClanModel,
  ClanPrivateRoomModel,
  logger,
} from '@lolz-bots/shared';
import { ModalSubmitInteraction, ChannelType } from 'discord.js';

export default class ClanRoomRenameModalFeature implements IFeature<ModalSubmitInteraction> {
  name = 'clanRoomRenameModal';

  async run({ interaction }: RunFeatureParams<ModalSubmitInteraction>) {
    const newName = interaction.fields.getTextInputValue('roomName');

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
      await channel.setName(newName);
      privateRoom.name = newName;
      await privateRoom.save();

      return interaction.reply({
        embeds: [
          constructEmbed({
            title: '✅ Успешно',
            description: `Комната переименована в **${newName}**`,
            customType: 'success',
          }),
        ],
        ephemeral: true,
      });
    } catch (error) {
      logger.error('Error renaming clan room:', error);
      return interaction.reply({
        embeds: [
          constructEmbed({
            title: '❌ Ошибка',
            description: 'Не удалось переименовать комнату',
            customType: 'error',
          }),
        ],
        ephemeral: true,
      });
    }
  }
}
