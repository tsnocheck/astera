import { IFeature, RunFeatureParams } from '@lolz-bots/shared';
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

export class SelectMuteOrUnMuteUsers implements IFeature<SelectMenuInteraction> {
  name = 'selectMuteOrUnMuteRoom';

  async run({ interaction }: RunFeatureParams<SelectMenuInteraction>) {
    const room = await RoomModel.findOne({
      _id: interaction.values[0],
    });

    if (!room) {
      return interaction.update({
        content: 'Комната не найдена.',
        components: [],
      });
    }

    const userSelect =
      new ActionRowBuilder<UserSelectMenuBuilder>().addComponents(
        new UserSelectMenuBuilder()
          .setCustomId(`selectMuteOrUnMuteUsers_${room._id.toString()}`)
          .setPlaceholder('Выберите пользователей для мута/анмута:')
          .setMinValues(1)
          .setMaxValues(25),
      );

    await interaction.update({
      content: `Вы управляете мутом пользователей в комнате: ${room.name}`,
      components: [userSelect],
    });
  }
}

export default SelectMuteOrUnMuteUsers;
