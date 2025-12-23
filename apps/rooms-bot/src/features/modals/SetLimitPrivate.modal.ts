import { IFeature, PrivateModel, RunFeatureParams } from '@lolz-bots/shared';
import { ChannelType, ModalSubmitInteraction } from 'discord.js';

export class SetLimitPrivateModal implements IFeature<ModalSubmitInteraction> {
  name = 'setLimitPrivateModal';

  async run({ interaction }: RunFeatureParams<ModalSubmitInteraction>) {
    const roomLimitValue = interaction.fields.getTextInputValue('roomLimitInput');

    const limit = parseInt(roomLimitValue, 10);

    if (isNaN(limit) || limit < 0) {
      return interaction.reply({
        content: 'Неверное значение лимита. Пожалуйста, введите неотрицательное целое число.',
        ephemeral: true,
      });
    }

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
      channel.setUserLimit(limit);
      return interaction.reply({
        content: `Лимит комнаты установлен на ${limit === 0 ? 'без лимита' : limit}.`,
        ephemeral: true,
      });
    } catch (e) {
      return interaction.reply({
        content: 'Не удалось установить лимит комнаты. Пожалуйста, обратитесь в поддержку.',
        components: [],
      });
    }
  }
}

export default SetLimitPrivateModal;
