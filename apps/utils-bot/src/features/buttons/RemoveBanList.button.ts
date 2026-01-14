import {
  IFeature,
  RunFeatureParams,
} from '@lolz-bots/shared';
import {
  ActionRowBuilder,
  ButtonInteraction,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} from 'discord.js';

export default class RemoveBanListButton implements IFeature<ButtonInteraction> {
  name = 'removeBanList';

  async run({ interaction }: RunFeatureParams<ButtonInteraction>) {
    const parts = interaction.customId.split('-');

    if (parts[1] !== interaction.user.id) {
      return interaction.reply({ content: 'Не ваше меню', ephemeral: true });
    }

    const modal = new ModalBuilder()
      .setCustomId(`modalBanList`)
      .setTitle('Снять бан');

    const action = new ActionRowBuilder<TextInputBuilder>();

    const text = new TextInputBuilder()
      .setCustomId('getUserId')
      .setLabel('Введите id пользователя:')
      .setStyle(TextInputStyle.Short);

    modal.addComponents(action.addComponents(text));

    await interaction.showModal(modal);
  }
}
