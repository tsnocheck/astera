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

export default class StaffAcceptButton implements IFeature<ButtonInteraction> {
  name = 'staff_accept';

  async run({ interaction }: RunFeatureParams<ButtonInteraction>) {
    const parts = interaction.customId.split('-');

    if (interaction.user.id !== parts[3]) {
      return interaction.reply({
        content:
          'Вы не можете взять в стафф заявку, которую не рассматриваете',
        ephemeral: true,
      });
    }

    const member = await interaction.guild!.members.fetch(parts[2]);

    await member.roles.add(staffConfig.staffRole[parts[1]]);
    await member.roles.add(staffConfig.staffRole['staff']);

    const existingEmbed = interaction.message.embeds[0];
    const embed = new EmbedBuilder(existingEmbed.data).setFooter({
      text: `Взял в стафф: ${interaction.user.username}`,
    });

    await interaction.update({ embeds: [embed], components: [] });
    await interaction.followUp({
      content: 'Вы успешно взяли пользователя в стафф',
      ephemeral: true,
    });

    await this.sendLogs(true, interaction, parts[1], member);
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
      .setTitle('Принял на стафф')
      .setColor('#00FF00')
      .addFields(
        {
          name: 'Кто принял:',
          value: `ID: ${interaction.user.id}\nPing: <@${interaction.user.id}>\nUsername: ${interaction.user.username}`,
          inline: true,
        },
        {
          name: 'Кого принял:',
          value: `ID: ${member.user.id}\nPing: <@${member.user.id}>\nUsername: ${member.user.username}`,
          inline: true,
        },
        {
          name: 'Роли',
          value: `<@&${staffConfig.staffRole[roleName]}>\n<@&${staffConfig.staffRole['staff']}>`,
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
