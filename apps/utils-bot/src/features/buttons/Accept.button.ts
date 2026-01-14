import {
  IFeature,
  RunFeatureParams,
} from '@lolz-bots/shared';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  EmbedBuilder,
} from 'discord.js';
import { applicationConfigs, staffConfig } from '../../config';

export default class AcceptButton implements IFeature<ButtonInteraction> {
  name = 'accept';

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
      text: `Взял в обработку: ${interaction.user.username}`,
    });

    const button = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`staff_accept-${parts[1]}-${parts[2]}-${interaction.user.id}`)
        .setLabel('Взять на стафф')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`staff_reject-${parts[1]}-${parts[2]}-${interaction.user.id}`)
        .setLabel('Отклонить заявку')
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId(`staff_moove-${parts[1]}-${parts[2]}-${interaction.user.id}`)
        .setLabel('Переместить пользователя')
        .setStyle(ButtonStyle.Secondary)
    );

    const member = await interaction.guild!.members.fetch(parts[2]);

    const emb = new EmbedBuilder()
      .setTitle('Заявка на стафф')
      .setDescription(
        `Ваша заявка на ${questionObject.name} была рассмотрена <@${interaction.user.id}>. \nВы были приглашены на собеседование. Для уточнения времени напишите человеку, рассмотревший вашу заявку.`
      )
      .setThumbnail(interaction.user.displayAvatarURL({ forceStatic: false }))
      .setTimestamp();

    await interaction.update({ embeds: [embed], components: [button] });

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
