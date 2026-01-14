import {
  IFeature,
  RunFeatureParams,
} from '@lolz-bots/shared';
import {
  ActionRowBuilder,
  ModalBuilder,
  StringSelectMenuInteraction,
  TextInputBuilder,
  TextInputStyle,
} from 'discord.js';
import { applicationConfigs } from '../../config';

export default class CheckInfoSelect implements IFeature<StringSelectMenuInteraction> {
  name = 'checkInfo';

  async run({ interaction }: RunFeatureParams<StringSelectMenuInteraction>) {
    const selectedValue = interaction.values[0];
    const questionObject = applicationConfigs.find(
      (item) => item.customId === selectedValue
    );

    if (!questionObject) return;

    const modal = new ModalBuilder()
      .setCustomId(questionObject.customId)
      .setTitle(questionObject.name);

    questionObject.questions.forEach((question) => {
      const action = new ActionRowBuilder<TextInputBuilder>();
      const text = new TextInputBuilder()
        .setCustomId(question.customId)
        .setLabel(question.question)
        .setStyle(
          question.style === 'short'
            ? TextInputStyle.Short
            : TextInputStyle.Paragraph
        )
        .setPlaceholder(question.placeholder);

      modal.addComponents(action.addComponents(text));
    });

    await interaction.showModal(modal);
  }
}
