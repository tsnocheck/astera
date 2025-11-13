import { IFeature, logger, RunFeatureParams } from '@lolz-bots/shared';
import {
  ActionRowBuilder,
  Base,
  BaseChannel,
  ButtonInteraction,
  ChannelType,
  Guild,
  GuildBasedChannel,
  GuildChannel,
  GuildChannelTypes,
  PermissionFlagsBits,
  SelectMenuInteraction,
  StringSelectMenuBuilder,
  VoiceChannel,
} from 'discord.js';
import { RoomModel, RoomUserModel, RoomUser } from '@lolz-bots/shared';

export class SelectMuteOrUnMuteUsers implements IFeature<SelectMenuInteraction> {
  name = 'selectMuteOrUnMuteUsers';

  async run({ interaction }: RunFeatureParams<SelectMenuInteraction>) {
    const member = interaction.guild?.members.cache.get(interaction.user.id);

    if (!member) {
      return interaction.reply({
        content: 'Участник не найден.',
        components: [],
      });
    }

    const channel = member.voice.channel;

    if (!channel || channel.type !== ChannelType.GuildVoice) {
      return interaction.reply({
        content: 'Вы должны находиться в голосовом канале для управления мутом.',
        components: [],
      });
    }

    const room = await RoomModel.findOne({ _id: interaction.customId.split('_')[1] });

    if (!room) {
      return interaction.reply({
        content: 'Комната не найдена.',
        components: [],
      });
    }

    if (
      room.ownerId !== interaction.user.id &&
      !room.coOwners.includes(interaction.user.id)
    ) {
      return interaction.reply({
        content: 'У вас нет прав для управления мутом в этой комнате.',
        components: [],
      });
    }

    const voice = await interaction.guild?.channels.fetch(
      room.roomId!,
    ) as VoiceChannel;

    if (!voice) {
      return interaction.reply({
        content: 'Голосовой канал не найден.',
        components: [],
      });
    }

    const selectedUserIds = interaction.values;

    const roomUsers = await RoomUserModel.find({
      userId: { $in: selectedUserIds },
      _id: { $in: room.users },
    });

    if (roomUsers.length === 0) {
      return interaction.reply({
        content: 'Не найдено подходящих пользователей в этой комнате.',
        components: [],
      });
    }

    await Promise.all(
      roomUsers.map(async (roomUser) => {
        const user = await interaction.guild?.members.fetch(roomUser.userId);
        if (!user) return;

        if (roomUser.muted) {
          await voice.permissionOverwrites.edit(roomUser.userId, {
            Speak: true,
          });
          roomUser.muted = false;
          await user.voice.setChannel(channel.id);
        } else {
          await voice.permissionOverwrites.edit(roomUser.userId, {
            Speak: false,
          });
          roomUser.muted = true;
          await user.voice.setChannel(channel.id);
        }

        await roomUser.save();
      }),
    );

    return interaction.update({
      content: `Статус мута обновлен для выбранных пользователей.`,
      components: [],
    });
  }
}

export default SelectMuteOrUnMuteUsers;
