import {
  IFeature,
  RunFeatureParams,
  GuildModel,
} from '@lolz-bots/shared';
import { ButtonInteraction, EmbedBuilder } from 'discord.js';

export default class BanListButton implements IFeature<ButtonInteraction> {
  name = 'banList';

  async run({ interaction }: RunFeatureParams<ButtonInteraction>) {
    const parts = interaction.customId.split('-');

    if (parts[1] !== interaction.user.id) {
      return interaction.reply({ content: 'Не ваше меню', ephemeral: true });
    }

    const banList = await GuildModel.findOne({ guild: interaction.guildId! });

    if (!banList || banList.banList.length === 0) {
      return interaction.reply({
        content: 'Бан лист пустой',
        ephemeral: true,
      });
    }

    let description = '';
    banList.banList.forEach((userId: string, i: number) => {
      description += `#${i + 1} <@${userId}> - ${userId}\n`;
    });

    const emb = new EmbedBuilder()
      .setTitle('Бан лист')
      .setDescription(description)
      .setTimestamp();

    await interaction.update({ embeds: [emb], components: [] });
  }
}
