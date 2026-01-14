import {
  IFeature,
  RunFeatureParams,
  constructEmbed,
  ClanModel,
} from '@lolz-bots/shared';
import {
  ButtonInteraction,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
} from 'discord.js';

export default class ClanEditDescriptionFeature implements IFeature<ButtonInteraction> {
  name = 'clanEditDescription';

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

    const modal = new ModalBuilder()
      .setCustomId('clanDescriptionModal')
      .setTitle('Изменить описание клана');

    const descriptionInput = new TextInputBuilder()
      .setCustomId('description')
      .setLabel('Новое описание клана')
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(false)
      .setMaxLength(500)
      .setValue(clan.description || '');

    const actionRow = new ActionRowBuilder<TextInputBuilder>().addComponents(
      descriptionInput
    );

    modal.addComponents(actionRow);

    return interaction.showModal(modal);
  }
}
