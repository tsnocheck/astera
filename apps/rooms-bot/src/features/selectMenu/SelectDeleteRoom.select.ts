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

export class SelectCoOwner implements IFeature<SelectMenuInteraction> {
  name = 'selectCoOwner';

  async run({ interaction }: RunFeatureParams<SelectMenuInteraction>) {
    const room = await RoomModel.findOne({ _id: interaction.values[0] });

    if (!room) {
      return interaction.update({
        content: 'Комната не найдена.',
        components: [],
      });
    }

    const channel = interaction.guild?.channels.cache.get(room.roomId!);
    if (channel) {
      await channel.delete();
    } 

    const roomUsers = await RoomUserModel.find({
      _id: { $in: room.users },
    });

    await room.deleteOne();
    await roomUsers.forEach(async (roomUser) => {
      await roomUser.deleteOne();
    });
  }
}

export default SelectCoOwner;
