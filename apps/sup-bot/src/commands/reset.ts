import {
  ICommand,
  IFeature,
  RunCommandParams,
  RunFeatureParams,
  PrimeTimeModel,
} from '@lolz-bots/shared';
import {
  ApplicationCommandOptionData,
  EmbedBuilder,
  ActionRowBuilder,
  UserSelectMenuBuilder,
  UserSelectMenuInteraction,
} from 'discord.js';
import { supConfig } from '../config';

export default class ResetCommand implements ICommand {
  name = 'reset';
  description = 'Сбросить прайм тайм';
  options: ApplicationCommandOptionData[] = [];

  features = [new ResetSlaveFeature()];

  async run({ interaction }: RunCommandParams) {
    const member = interaction.guild!.members.cache.get(interaction.user.id);
    const hasAccess = supConfig.roles.acceptPrimeTime.some((roleId) =>
      member?.roles.cache.has(roleId)
    );
    
    if (!hasAccess) {
      return interaction.reply({
        content: 'У вас нет доступа к этой команде',
        ephemeral: true,
      });
    }

    const emb = new EmbedBuilder()
      .setTitle('Сбросить прайм тайм')
      .setDescription('Выберите 5 пользователей, которым хотите сбросить прайм тайм')
      .setThumbnail(interaction.user.displayAvatarURL({ forceStatic: false }))
      .setColor(0x2b2d31)
      .setTimestamp();

    const selectMenu = new ActionRowBuilder<UserSelectMenuBuilder>().addComponents(
      new UserSelectMenuBuilder()
        .setCustomId(`resetSlave-${interaction.user.id}`)
        .setPlaceholder('Выберите рабов')
        .setMaxValues(5)
    );

    await interaction.reply({ embeds: [emb], components: [selectMenu], ephemeral: true });
  }
}

class ResetSlaveFeature implements IFeature<UserSelectMenuInteraction> {
  name = 'resetSlave';

  async run({ interaction }: RunFeatureParams<UserSelectMenuInteraction>) {
    const parts = interaction.customId.split('-');
    if (parts[1] !== interaction.user.id) {
      return interaction.reply({ content: 'Не ваше меню', ephemeral: true });
    }

    const selectedUsers = interaction.values;
    
    for (const userId of selectedUsers) {
      await PrimeTimeModel.findOneAndDelete({
        guild: interaction.guildId!,
        userId: userId,
      });
    }

    const userMentions = selectedUsers.map(id => `<@${id}>`).join(', ');
    
    await interaction.update({
      content: `Прайм тайм сброшен для: ${userMentions}`,
      embeds: [],
      components: [],
    });
  }
}
