import {
  IFeature,
  RunFeatureParams,
  constructEmbed,
  ClanModel,
} from '@lolz-bots/shared';
import {
  ActionRowBuilder,
  ButtonInteraction,
  UserSelectMenuBuilder,
} from 'discord.js';

export default class ClanAddCoownerFeature implements IFeature<ButtonInteraction> {
  name = 'clanAddCoowner';

  async run({ interaction }: RunFeatureParams<ButtonInteraction>) {
    const clan = await ClanModel.findOne({ owner: interaction.user.id });

    if (!clan) {
      return interaction.reply({
        embeds: [
          constructEmbed({
            title: '❌ Ошибка',
            description: 'Вы не являетесь овнером клана',
            customType: 'error',
          }),
        ],
        ephemeral: true,
      });
    }

    const row = new ActionRowBuilder<UserSelectMenuBuilder>().addComponents(
      new UserSelectMenuBuilder()
        .setCustomId('selectUserToAddCoowner')
        .setPlaceholder('Выберите участника для назначения со-овнером')
        .setMinValues(1)
        .setMaxValues(1)
    );

    return interaction.reply({
      content: 'Выберите участника для назначения со-овнером:',
      components: [row],
      ephemeral: true,
    });
  }
}
