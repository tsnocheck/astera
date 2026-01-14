import {
  IFeature,
  RunFeatureParams,
  constructEmbed,
  ClanModel,
  ClanPrivateRoomModel,
  logger,
} from '@lolz-bots/shared';
import { UserSelectMenuInteraction, ChannelType } from 'discord.js';

export default class ClanRoomSelectUserToMuteFeature implements IFeature<UserSelectMenuInteraction> {
  name = 'clanRoomSelectUserToMute';

  async run({ interaction }: RunFeatureParams<UserSelectMenuInteraction>) {
    const selectedUser = interaction.users.first();
    if (!selectedUser) return;

    const clan = await ClanModel.findOne({ 'users.userID': interaction.user.id });
    if (!clan) {
      return interaction.update({
        embeds: [
          constructEmbed({
            title: '❌ Ошибка',
            description: 'Вы не состоите в клане',
            customType: 'error',
          }),
        ],
        components: [],
      });
    }

    const privateRoom = await ClanPrivateRoomModel.findOne({
      ownerId: interaction.user.id,
      clanId: clan.id,
    });

    if (!privateRoom || !privateRoom.roomId) {
      return interaction.update({
        embeds: [
          constructEmbed({
            title: '❌ Ошибка',
            description: 'У вас нет приватной комнаты',
            customType: 'error',
          }),
        ],
        components: [],
      });
    }

    const channel = interaction.guild?.channels.cache.get(privateRoom.roomId);
    if (!channel || channel.type !== ChannelType.GuildVoice) {
      return interaction.update({
        embeds: [
          constructEmbed({
            title: '❌ Ошибка',
            description: 'Комната не найдена',
            customType: 'error',
          }),
        ],
        components: [],
      });
    }

    try {
      const member = channel.members.get(selectedUser.id);
      if (!member) {
        return interaction.update({
          embeds: [
            constructEmbed({
              title: '❌ Ошибка',
              description: 'Пользователь не в комнате',
              customType: 'error',
            }),
          ],
          components: [],
        });
      }

      const isMuted = member.voice.serverMute;
      await member.voice.setMute(!isMuted);

      return interaction.update({
        embeds: [
          constructEmbed({
            title: '✅ Успешно',
            description: `<@${selectedUser.id}> ${isMuted ? 'разглушен' : 'заглушен'}`,
            customType: 'success',
          }),
        ],
        components: [],
      });
    } catch (error) {
      logger.error('Error muting user in clan room:', error);
      return interaction.update({
        embeds: [
          constructEmbed({
            title: '❌ Ошибка',
            description: 'Не удалось изменить статус звука',
            customType: 'error',
          }),
        ],
        components: [],
      });
    }
  }
}
