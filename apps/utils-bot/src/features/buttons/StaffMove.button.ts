import {
  IFeature,
  RunFeatureParams,
} from '@lolz-bots/shared';
import { ButtonInteraction } from 'discord.js';
import { staffConfig } from '../../config';

export default class StaffMoveButton implements IFeature<ButtonInteraction> {
  name = 'staff_moove';

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
    const user = interaction.guild!.members.cache.get(interaction.user.id);

    if (!user?.voice.channel) {
      return interaction.reply({
        content: 'Вы не находитесь в войсе',
        ephemeral: true,
      });
    }
    if (!member.voice.channel) {
      return interaction.reply({
        content: 'Пользователь не находится в войсе',
        ephemeral: true,
      });
    }

    if (!staffConfig.interviewChannelsId.includes(user.voice.channel.id)) {
      return interaction.reply({
        content: 'Вы не находитесь в канале собеседования.',
        ephemeral: true,
      });
    }
    if (staffConfig.interviewChannelsId.includes(member.voice.channel.id)) {
      return interaction.reply({
        content: 'Пользователь уже находится в канале собеседование.',
        ephemeral: true,
      });
    }

    await member.voice.setChannel(user.voice.channel.id);
    await interaction.reply({
      content: 'Вы успешно переместили пользователя',
      ephemeral: true,
    });
  }
}
