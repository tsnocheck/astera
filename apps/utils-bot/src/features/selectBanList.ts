import {
  IFeature,
  RunFeatureParams,
  GuildModel,
} from '@lolz-bots/shared';
import {
  EmbedBuilder,
  UserSelectMenuInteraction,
} from 'discord.js';

export default class SelectBanListFeature implements IFeature<UserSelectMenuInteraction> {
  name = 'selectBanList';

  async run({ interaction }: RunFeatureParams<UserSelectMenuInteraction>) {
    const parts = interaction.customId.split('-');
    
    if (parts[1] !== interaction.user.id) {
      return interaction.reply({
        content: 'Не ваше меню',
        ephemeral: true,
      });
    }

    const guild = await GuildModel.findOne({ guild: interaction.guildId! }) ||
      await GuildModel.create({ guild: interaction.guildId! });

    guild.banList.push(interaction.values[0]);
    await guild.save();

    const emb = new EmbedBuilder()
      .setTitle('Бан лист')
      .setDescription(`Вы успешно добавили <@${interaction.values[0]}> в бан лист`)
      .setTimestamp();

    await interaction.update({ embeds: [emb], components: [] });
  }
}
