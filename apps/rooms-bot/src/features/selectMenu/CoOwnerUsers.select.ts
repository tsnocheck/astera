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

export class SelectCoOwnerUsers implements IFeature<SelectMenuInteraction> {
  name = 'selectUserCoOwner';

  async run({ interaction }: RunFeatureParams<SelectMenuInteraction>) {
    const room = await RoomModel.findOne({ ownerId: interaction.user.id });

    if (!room) {
      return interaction.update({
        content: 'У вас нет комнат для добавления совладельца.',
        components: [],
      });
    }

    const selectedUserIds = interaction.values;

    const currentCoOwners = room.coOwners || [];
    const updatedCoOwners = [...currentCoOwners];

    for (const userId of selectedUserIds) {
      const index = updatedCoOwners.indexOf(userId);
      if (index > -1) {
        updatedCoOwners.splice(index, 1);
      } else {
        updatedCoOwners.push(userId);

        const existingRoomUser = await RoomUserModel.findOne({
          userId: userId,
          _id: { $in: room.users },
        });

        if (!existingRoomUser) {
          const newRoomUser = await RoomUserModel.create({
            userId: userId,
            muted: false,
            roomId: room._id,
          });
          room.users.push(newRoomUser._id);
        }
      }
    }

    room.coOwners = updatedCoOwners;

    await room.save();

    const added = selectedUserIds.filter((id) => updatedCoOwners.includes(id));
    const removed = selectedUserIds.filter(
      (id) => !updatedCoOwners.includes(id),
    );

    let message = '';
    if (added.length > 0) {
      message += `Совладельцы добавлены: <@${added.join('>, <@')}>`;
    }
    if (removed.length > 0) {
      if (message) message += '\n';
      message += `Совладельцы удалены: <@${removed.join('>, <@')}>`;
    }

    await interaction.update({
      content: message || 'Изменения не внесены.',
      components: [],
      embeds: [],
    });
  }
}

export default SelectCoOwnerUsers;
