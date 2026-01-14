import {
  IFeature,
  RunFeatureParams,
} from '@lolz-bots/shared';
import {
  ButtonInteraction,
  EmbedBuilder,
  TextChannel,
} from 'discord.js';
import { staffConfig } from '../../config';

export default class StaffRejectButton implements IFeature<ButtonInteraction> {
  name = 'staff_reject';

  async run({ interaction }: RunFeatureParams<ButtonInteraction>) {
    const parts = interaction.customId.split('-');

    if (interaction.user.id !== parts[3]) {
      return interaction.reply({
        content: 'Вы не можете отклонить заявку, которую не рассматриваете',
        ephemeral: true,
      });
    }

    const member = await interaction.guild!.members.fetch(parts[2]);

    const existingEmbed = interaction.message.embeds[0];
    const embed = new EmbedBuilder(existingEmbed.data).setFooter({
      text: `Отклонил заявку: ${interaction.user.username}`,
    });

    await interaction.update({ embeds: [embed], components: [] });
    await interaction.followUp({
      content: 'Вы успешно отклонили анкету пользователя в стафф',
      ephemeral: true,
    });

    await this.sendLogs(false, interaction, parts[1], member);
  }

  private async sendLogs(
    action: boolean,
    interaction: ButtonInteraction,
    roleName: string,
    member: any
  ) {
    const channel = interaction.guild!.channels.cache.get(
      staffConfig.logsChannel
    ) as TextChannel;
    if (!channel) return;

    const embed = new EmbedBuilder()
      .setTitle('Отклонил заявку на стафф')
      .setColor('#FF0000')
      .addFields(
        {
          name: 'Кто отказал:',
          value: `ID: ${interaction.user.id}\nPing: <@${interaction.user.id}>\nUsername: ${interaction.user.username}`,
          inline: true,
        },
        {
          name: 'Кому отказал:',
          value: `ID: ${member.user.id}\nPing: <@${member.user.id}>\nUsername: ${member.user.username}`,
          inline: true,
        },
        {
          name: 'Ветка',
          value: `<@&${staffConfig.staffRole[roleName]}>`,
          inline: true,
        }
      )
      .setThumbnail(interaction.user.displayAvatarURL({ forceStatic: false }))
      .setTimestamp();

    await channel.send({
      embeds: [embed],
      content: `<@&${staffConfig.acceptStaffRole[roleName]}>`,
    });
  }
}
