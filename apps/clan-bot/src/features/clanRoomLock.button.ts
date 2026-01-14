import {
  IFeature,
  RunFeatureParams,
  constructEmbed,
  ClanModel,
  ClanPrivateRoomModel,
} from '@lolz-bots/shared';
import { ButtonInteraction, ChannelType, PermissionFlagsBits } from 'discord.js';

export default class ClanRoomLockFeature implements IFeature<ButtonInteraction> {
  name = 'clanRoomLock';

  async run({ interaction }: RunFeatureParams<ButtonInteraction>) {
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

    if (!interaction.guild) {
      return interaction.reply({
        embeds: [
          constructEmbed({
            title: '❌ Ошибка',
            description: 'Команда доступна только на сервере',
            customType: 'error',
          }),
        ],
        ephemeral: true,
      });
    }

    const channel = interaction.guild.channels.cache.get(privateRoom.roomId);
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

    // Проверяем, закрыта ли комната для соклановцев
    // Комната открыта если хотя бы у одного соклановца есть явное разрешение Connect: true
    let isOpen = false;
    for (const member of clan.users) {
      if (member.userID !== interaction.user.id) {
        const memberPerms = channel.permissionOverwrites.cache.get(member.userID);
        if (memberPerms && memberPerms.allow.has(PermissionFlagsBits.Connect)) {
          isOpen = true;
          break;
        }
      }
    }

    if (isOpen) {
      // Закрываем - удаляем разрешения у всех соклановцев
      for (const member of clan.users) {
        if (member.userID !== interaction.user.id) {
          await channel.permissionOverwrites.delete(member.userID);
        }
      }

      return interaction.reply({
        embeds: [
          constructEmbed({
            title: '🔒 Комната закрыта',
            description: 'Только вы можете подключаться',
            customType: 'success',
          }),
        ],
        ephemeral: true,
      });
    } else {
      // Открываем - даем разрешения всем членам клана
      for (const member of clan.users) {
        if (member.userID !== interaction.user.id) {
          await channel.permissionOverwrites.edit(member.userID, {
            Connect: true,
            ViewChannel: true,
          });
        }
      }

      return interaction.reply({
        embeds: [
          constructEmbed({
            title: '🔓 Комната открыта',
            description: 'Члены клана могут подключаться',
            customType: 'success',
          }),
        ],
        ephemeral: true,
      });
    }
  }
}
