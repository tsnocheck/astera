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
  ModalActionRowComponent,
  ModalBuilder,
  ModalSubmitInteraction,
  PermissionFlagsBits,
  SelectMenuInteraction,
  StringSelectMenuBuilder,
  TextInputBuilder,
  TextInputStyle,
  VoiceChannel,
} from 'discord.js';
import { RoomModel, RoomUserModel, RoomUser } from '@lolz-bots/shared';
import { REPL_MODE_SLOPPY } from 'repl';

export class RoomNameInput implements IFeature<ModalSubmitInteraction> {
  name = 'reNameRoomModal';

  async run({ interaction }: RunFeatureParams<ModalSubmitInteraction>) {
    const roomNameValue =
      interaction.fields.getTextInputValue('roomNameInput');

    const roomId = interaction.customId.split('_')[1];
    const room = await RoomModel.findOne({ _id: roomId });

    if (!room) {
      return interaction.reply({
        content: 'Комната не найдена.',
        components: [],
      });
    }

    const channel = interaction.guild?.channels.cache.get(room.roomId!);

    if (!channel || channel.type !== ChannelType.GuildVoice) {
      return interaction.reply({
        content: 'Голосовой канал не найден.',
        ephemeral: true,
        components: [],
      });
    }

    if (
      room.ownerId !== interaction.user.id &&
      !room.coOwners.includes(interaction.user.id)
    ) {
      return interaction.reply({
        content: 'У вас нет прав для переименования этой комнаты.',
        components: [],
      });
    }

    try {
      channel.setName(roomNameValue);
      room.name = roomNameValue;
      await room.save();

      return interaction.reply({
        content: `Имя комнаты изменено на ${roomNameValue}.`,
        ephemeral: true,
      });
    } catch (e) {
      return interaction.reply({
        content: 'Не удалось переименовать комнату. Пожалуйста, обратитесь в поддержку.',
        components: [],
      });
    }
  }
}

export default RoomNameInput;
