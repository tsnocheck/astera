import {
  IFeature,
  RunFeatureParams,
  GuildModel,
} from '@lolz-bots/shared';
import {
  ModalBuilder,
  ActionRowBuilder,
  TextInputBuilder,
  TextInputStyle,
  StringSelectMenuInteraction,
  StringSelectMenuBuilder,
} from 'discord.js';
import { applicationConfigs } from '../config';

export default class CheckInfoFeature implements IFeature<StringSelectMenuInteraction> {
  name = 'checkInfo';

  async run({ interaction }: RunFeatureParams<StringSelectMenuInteraction>) {
    const ban = await GuildModel.findOne({ guild: interaction.guildId! }) ||
      await GuildModel.create({ guild: interaction.guildId! });
    
    if (ban.banList.includes(interaction.user.id)) {
      return interaction.reply({
        content: 'Вы не можете отправить заявку так как находитесь в бан листе',
        ephemeral: true,
      });
    }

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

    // Reset select menu components BEFORE showing modal
    console.log('Starting reset, components count:', interaction.message.components.length);
    
    const updatedComponents = interaction.message.components.map((row: any, rowIndex: number) => {
      console.log(`Row ${rowIndex}:`, row);
      console.log(`Row ${rowIndex} has components:`, row.components?.length);
      
      row.components?.forEach((component: any, compIndex: number) => {
        console.log(`Component ${rowIndex}-${compIndex} type:`, component.type);
        
        if (component.type === 3) {
          console.log(`Component ${rowIndex}-${compIndex} is StringSelect, options:`, component.options?.length);
          component.options?.forEach((option: any, optIndex: number) => {
            console.log(`Option ${optIndex} before:`, option.default);
            option.default = false;
            console.log(`Option ${optIndex} after:`, option.default);
          });
        }
      });
      
      return row;
    });

    console.log('Editing message with updated components');
    await interaction.message.edit({ components: updatedComponents });
    console.log('Message edited successfully');

    // Show modal AFTER editing message
    await interaction.showModal(modal);
  }
}
