import {
  IFeature,
  RunFeatureParams,
} from '@lolz-bots/shared';
import {
  ActionRowBuilder,
  ButtonInteraction,
  UserSelectMenuBuilder,
} from 'discord.js';

export default class AddBanListButton implements IFeature<ButtonInteraction> {
  name = 'addBanList';

  async run({ interaction }: RunFeatureParams<ButtonInteraction>) {
    const parts = interaction.customId.split('-');

    if (parts[1] !== interaction.user.id) {
      return interaction.reply({ content: 'Не ваше меню', ephemeral: true });
    }

    const selectMenu = new UserSelectMenuBuilder()
      .setCustomId(`selectBanList-${interaction.user.id}`)
      .setPlaceholder('Выберите пользователей:')
      .setMaxValues(1);

    const action = new ActionRowBuilder<UserSelectMenuBuilder>().addComponents(
      selectMenu
    );

    await interaction.update({ components: [action] });
  }
}
