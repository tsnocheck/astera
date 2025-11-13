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
  UserSelectMenuBuilder,
  VoiceChannel,
} from 'discord.js';
import { RoomModel, RoomUserModel, RoomUser } from '@lolz-bots/shared';

export class SelectUserToInvite implements IFeature<SelectMenuInteraction> {
  name = 'selectUserToInvite';

  async run({ interaction }: RunFeatureParams<SelectMenuInteraction>) {
    const room = await RoomModel.findOne({
      _id: interaction.customId.split('_')[1],
    });

    if (!room) {
      return interaction.update({
        content: 'Комната не найдена.',
        components: [],
      });
    }

    const selectedUserIds = interaction.values;

    const addedUsers: string[] = [];
    const removedUsers: string[] = [];
    const isBots: string[] = [];

    for (const userId of selectedUserIds) {
      const user = interaction.guild?.members.fetch(userId);

      if (!user) {
        continue;
      }

      if ((await user).user.bot) {
        isBots.push(userId);
        continue;
      }

      if ((await user).user.id === room.ownerId) {
        isBots.push(userId);
        continue;
      }

      const existingRoomUser = await RoomUserModel.findOne({
        userId: userId,
        _id: { $in: room.users },
      });

      if (existingRoomUser) {
        room.users = room.users.filter(
          (id) => id.toString() !== existingRoomUser._id.toString(),
        );
        room.coOwners = room.coOwners.filter((id) => id !== userId);
        await RoomUserModel.deleteOne({ _id: existingRoomUser._id });
        removedUsers.push(userId);

        const channel = interaction.guild?.channels.cache.get(room.roomId!) as VoiceChannel;
        if (!channel) continue;

        await channel.permissionOverwrites.edit(userId, {
          Connect: true,
        });

      } else {
        const newRoomUser = await RoomUserModel.create({
          roomId: room._id,
          userId: userId,
          muted: false,
        });
        room.users.push(newRoomUser._id);
        addedUsers.push(userId);
      }
    }

    await room.save();

    let message = '';
    if (addedUsers.length > 0) {
      message += `Пользователи приглашены: <@${addedUsers.join('>, <@')}>`;
    }
    if (removedUsers.length > 0) {
      if (message) message += '\n';
      message += `Пользователи удалены: <@${removedUsers.join('>, <@')}>`;
    }
    if (isBots.length > 0) {
      if (message) message += '\n';
      message += `Пользователи проигнорированы: <@${isBots.join('>, <@')}>`;
    }

    await interaction.update({
      content: message || 'Изменения не внесены.',
      components: [],
      embeds: [],
    });
  }
}

export default SelectUserToInvite;
