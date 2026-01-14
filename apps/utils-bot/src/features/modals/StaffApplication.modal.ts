import {
  IFeature,
  RunFeatureParams,
} from '@lolz-bots/shared';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  ModalSubmitInteraction,
  TextChannel,
} from 'discord.js';
import { applicationConfigs, staffConfig } from '../../config';

export default class StaffApplicationModal implements IFeature<ModalSubmitInteraction> {
  name = 'staffApplication';

  async run({ interaction }: RunFeatureParams<ModalSubmitInteraction>) {
    const questionObject = applicationConfigs.find(
      (item) => item.customId === interaction.customId
    );
    if (!questionObject) return;

    const channel = interaction.guild!.channels.cache.get(
      questionObject.channelId
    ) as TextChannel;
    if (!channel) return;

    let text = '';
    questionObject.questions.forEach((question) => {
      const answer = interaction.fields.getTextInputValue(question.customId);
      text += `**${question.question}**\n\`\`\`${answer}\`\`\`\n`;
    });

    const button = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`accept-${interaction.customId}-${interaction.user.id}`)
        .setLabel('Принять заявку')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`reject-${interaction.customId}-${interaction.user.id}`)
        .setLabel('Отклонить')
        .setStyle(ButtonStyle.Danger)
    );

    const emb = new EmbedBuilder()
      .setTitle(`Заявка от ${interaction.user.username}`)
      .setDescription(
        `**ID: ${interaction.user.id}\nUsername: ${interaction.user.username}\nPing: ${interaction.user}**\n\n${text}`
      )
      .setThumbnail(
        interaction.user.displayAvatarURL({ forceStatic: false })
      )
      .setTimestamp();

    await channel.send({
      content: `<@&${staffConfig.acceptStaffRole[interaction.customId]}>`,
      embeds: [emb],
      components: [button],
    });

    await interaction.reply({
      content: 'Вы успешно отправили заявку! В скором времени с вами свяжутся.',
      ephemeral: true,
    });
  }
}
