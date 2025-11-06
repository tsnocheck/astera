import {
  ActionRowBuilder,
  ButtonInteraction,
  ButtonStyle,
  ChannelType,
  MessageFlags,
  ModalActionRowComponentBuilder,
  ModalBuilder,
  ModalSubmitInteraction,
  OverwriteType,
  TextInputBuilder,
  TextInputStyle,
} from 'discord.js';
import { BotClient, constructEmbed, IFeature } from '@lolz-bots/shared';
import { createTicket } from '../services/createTicket';

export default class CreateTicketButton implements IFeature<ButtonInteraction> {
  name = 'CreateTicketButton';
  subfeatures = [new CreateTicketModal()];

  async run({ interaction }: { interaction: ButtonInteraction }) {
    const modal = new ModalBuilder()
      .setCustomId('CreateTicketModal')
      .setTitle('Создать тикет')
      .addComponents([
        new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(
          new TextInputBuilder()
            .setLabel('Тема тикета')
            .setCustomId('topic')
            .setStyle(TextInputStyle.Short)
            .setRequired(true),
        ),
        new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(
          new TextInputBuilder()
            .setRequired(false)
            .setLabel('Описание тикета')
            .setCustomId('description')
            .setStyle(TextInputStyle.Paragraph),
        ),
      ]);

    await interaction.showModal(modal);
  }
}

class CreateTicketModal implements IFeature<ModalSubmitInteraction> {
  name = 'CreateTicketModal';

  async run({
    interaction,
    client,
  }: {
    interaction: ModalSubmitInteraction;
    client: BotClient;
  }) {
    await interaction.deferReply({
      flags: [MessageFlags.Ephemeral],
    });
    const topic = interaction.fields.getTextInputValue('topic');
    const description = interaction.fields.getTextInputValue('description');
    const images =
      description.match(/https?:\/\/.+\.(png|jpg|jpeg|gif)/gi) || [];
    const channelID = await createTicket(
      topic,
      description,
      interaction.user.id,
      images,
      client,
    );
    const answerEmbed = constructEmbed({
      title: 'Тикет создан',
      description: `Ваш тикет успешно создан. Вы можете перейти к нему по ссылке: https://discord.com/channels/${interaction.guild!.id}/${channelID}`,
      customType: 'success',
    });
    await interaction.editReply({
      embeds: [answerEmbed],
    });
  }
}
