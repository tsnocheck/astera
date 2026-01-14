import {
  ICommand,
  RunCommandParams,
} from '@lolz-bots/shared';
import {
  ApplicationCommandOptionData,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} from 'discord.js';

export default class BanCommand implements ICommand {
  name = 'ban';
  description = 'Управление бан листом';
  options: ApplicationCommandOptionData[] = [];

  async run({ interaction }: RunCommandParams) {
    const button = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`banList-${interaction.user.id}`)
        .setLabel(`Бан лист`)
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`addBanList-${interaction.user.id}`)
        .setLabel('Выдать банлист')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`removeBanList-${interaction.user.id}`)
        .setLabel('Снять банлист')
        .setStyle(ButtonStyle.Secondary)
    );

    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle('Управление бан листом')
          .setDescription('Выберите действие:')
          .setTimestamp()
          .setColor('#00FF00'),
      ],
      components: [button],
    });
  }
}
