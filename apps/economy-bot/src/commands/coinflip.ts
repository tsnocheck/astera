import {
  constructEmbed,
  ICommand,
  RunCommandParams,
  UserModel,
} from '@lolz-bots/shared';
import { ApplicationCommandOptionData, EmbedBuilder } from 'discord.js';
import { ApplicationCommandOptionType } from 'discord-api-types/v10';

export default class Coinflip implements ICommand {
  name = 'coinflip';
  description = 'Подбросьте монетку и удвойте свою ставку!';
  options: ApplicationCommandOptionData[] = [
    {
      name: 'bet',
      description: 'Ставка на игру',
      type: ApplicationCommandOptionType.Number,
      required: true,
    },
    {
      name: 'choice',
      description: 'Выберите орел или решка',
      type: ApplicationCommandOptionType.String,
      required: true,
      choices: [
        { name: '🦅 Орёл', value: 'heads' },
        { name: '🪙 Решка', value: 'tails' },
      ],
    },
  ];

  async run({ interaction }: RunCommandParams) {
    const bet = interaction.options.getNumber('bet');
    const choice = interaction.options.getString('choice');
    const userProfile = await UserModel.findOne({ discordID: interaction.user.id }) || await UserModel.create({ discordID: interaction.user.id });

    if (!bet) {
      return interaction.reply({
        content: 'Не удалось получить ставку, обратитесь в поддержку.',
        ephemeral: true,
      });
    }

    if (!choice) {
      return interaction.reply({
        content: 'Не удалось получить ваш выбор, обратитесь в поддержку.',
        ephemeral: true,
      });
    }

    if (bet <= 0) {
      return interaction.reply({
        content: 'Ставка должна быть больше нуля.',
        ephemeral: true,
      });
    }

    if (userProfile.coins < bet) {
      return interaction.reply({
        content: 'У вас недостаточно средств.',
        ephemeral: true,
      });
    }

    const result = Math.random() < 0.5 ? 'heads' : 'tails';
    const won = choice === result;

    const getEmoji = (side: string) => (side === 'heads' ? '🦅' : '🪙');
    const getName = (side: string) => (side === 'heads' ? 'Орёл' : 'Решка');

    const spinningEmbed = new EmbedBuilder()
      .setTitle('🪙 Подбрасываем монетку...')
      .setDescription(
        `**Ваш выбор:** ${getEmoji(choice)} ${getName(choice)}\n**Ставка:** ${bet} LOLZ`,
      )
      .setColor(0xffff00)
      .setFooter({ text: '🪙 Монетка в воздухе...' })
      .setThumbnail(
        interaction.user.displayAvatarURL({ size: 512, forceStatic: false }),
      );

    await interaction.reply({ embeds: [spinningEmbed] });

    const frames = ['🔄', '🔃', '🔄', '🔃', '🔄'];
    for (let i = 0; i < frames.length; i++) {
      await this.sleep(500);

      const animEmbed = new EmbedBuilder()
        .setTitle(`${frames[i]} Подбрасываем монетку...`)
        .setDescription(
          `**Ваш выбор:** ${getEmoji(choice)} ${getName(choice)}\n**Ставка:** ${bet} LOLZ`,
        )
        .setColor(0xffff00)
        .setFooter({ text: '🪙 Монетка крутится...' })
        .setThumbnail(
          interaction.user.displayAvatarURL({
            size: 512,
            forceStatic: false,
          }),
        );

      await interaction.editReply({ embeds: [animEmbed] });
    }

    await this.sleep(300);

    let winAmount = won ? bet : -bet;
    if (won) {
      winAmount = Math.floor(winAmount * 0.98);
    }
    userProfile.coins += winAmount;
    await userProfile.save();

    const finalEmbed = new EmbedBuilder()
      .setTitle('🪙 Результат')
      .setDescription(
        `**Монетка упала на:** ${getEmoji(result)} ${getName(result)}\n**Ваш выбор:** ${getEmoji(choice)} ${getName(choice)}`,
      )
      .addFields(
        { name: 'Ставка', value: `${bet} LOLZ`, inline: true },
        {
          name: won ? 'Выигрыш' : 'Проигрыш',
          value: `${won ? '+' : ''}${winAmount} LOLZ`,
          inline: true,
        },
        { name: 'Баланс', value: `${userProfile.coins} LOLZ`, inline: true },
      )
      .setColor(won ? 0x00ff00 : 0xff0000)
      .setFooter({
        text: won
          ? '🎉 Поздравляем! Вы угадали!'
          : '😔 Не повезло. Попробуйте ещё раз!',
      })
      .setThumbnail(
        interaction.user.displayAvatarURL({ size: 512, forceStatic: false }),
      );

    await interaction.editReply({ embeds: [finalEmbed] });
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
