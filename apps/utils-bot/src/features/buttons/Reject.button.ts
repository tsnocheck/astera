import {
  IFeature,
  RunFeatureParams,
} from '@lolz-bots/shared';
import {
  ButtonInteraction,
  EmbedBuilder,
} from 'discord.js';
import { applicationConfigs, staffConfig } from '../../config';

export default class RejectButton implements IFeature<ButtonInteraction> {
  name = 'reject';

  async run({ interaction }: RunFeatureParams<ButtonInteraction>) {
    const parts = interaction.customId.split('-');
    const questionObject = applicationConfigs.find(
      (item) => item.customId === parts[1]
    );

    if (!questionObject) return;

    const iUser = interaction.guild!.members.cache.get(interaction.user.id);
    if (!iUser?.roles.cache.has(staffConfig.acceptStaffRole[parts[1]])) {
      return interaction.reply({ content: 'Не ваша ветка', ephemeral: true });
    }

    const existingEmbed = interaction.message.embeds[0];
    const embed = new EmbedBuilder(existingEmbed.data).setFooter({
      text: `Отклонил анкету: ${interaction.user.username}`,
    });

    const member = await interaction.guild!.members.fetch(parts[2]);

    const emb = new EmbedBuilder()
      .setTitle('Заявка на стафф')
      .setDescription(
        `Ваша заявка на ${questionObject.name} была рассмотрена <@${interaction.user.id}>. \nК сожалению, ваша заявка была отклонена`
      )
      .setThumbnail(interaction.user.displayAvatarURL({ forceStatic: false }))
      .setTimestamp();

    await interaction.update({ embeds: [embed], components: [] });

    try {
      await member.send({ embeds: [emb] });
    } catch {
      await interaction.followUp({
        content:
          'К сожалению я не смог связаться с пользователем. Уведомите его вручную',
        ephemeral: true,
      });
    }
  }
}
