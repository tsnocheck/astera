import { IFeature, PrivateModel, RunFeatureParams } from '@lolz-bots/shared';
import {
  ChannelType,
  ModalSubmitInteraction,
} from 'discord.js';

export class RoomNameInput implements IFeature<ModalSubmitInteraction> {
  name = 'reNamePrivateModal';

  async run({ interaction }: RunFeatureParams<ModalSubmitInteraction>) {
    const roomNameValue =
      interaction.fields.getTextInputValue('roomNameInput');

    const roomId = interaction.customId.split('_')[1];
    const room = await PrivateModel.findOne({ _id: roomId });

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
