import {
  constructEmbed,
  ICommand,
  RunCommandParams,
  UserModel,
} from '@lolz-bots/shared';
import { ApplicationCommandOptionData, EmbedBuilder } from 'discord.js';
import { ApplicationCommandOptionType } from 'discord-api-types/v10';

export default class Roulette implements ICommand {
  name = 'roulette';
  description = 'Сыграйте в рулетку!';
  options: ApplicationCommandOptionData[] = [
    {
      name: 'bet',
      description: 'Ставка на игру',
      type: ApplicationCommandOptionType.Number,
      required: true,
    },
    {
      name: 'type',
      description: 'Тип ставки',
      type: ApplicationCommandOptionType.String,
      required: true,
      choices: [
        { name: '🔴 Красное', value: 'red' },
        { name: '⚫ Черное', value: 'black' },
        { name: '🔢 Четное', value: 'even' },
        { name: '🔢 Нечетное', value: 'odd' },
        { name: '🎯 Конкретное число (0-36)', value: 'number' },
      ],
    },
    {
      name: 'number',
      description: 'Конкретное число от 0 до 36 (только для типа "Конкретное число")',
      type: ApplicationCommandOptionType.Integer,
      required: false,
      min_value: 0,
      max_value: 36,
    },
  ];

  private readonly RED_NUMBERS = [
    1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36,
  ];
  private readonly BLACK_NUMBERS = [
    2, 4, 6, 8, 10, 11, 13, 15, 17, 20, 22, 24, 26, 28, 29, 31, 33, 35,
  ];

  async run({ interaction }: RunCommandParams) {
    const bet = interaction.options.getNumber('bet');
    const type = interaction.options.getString('type');
    const chosenNumber = interaction.options.getInteger('number');
    const userProfile =
      (await UserModel.findOne({ discordID: interaction.user.id })) ||
      (await UserModel.create({ discordID: interaction.user.id }));

    if (!bet) {
      return interaction.reply({
        content: 'Не удалось получить ставку, обратитесь в поддержку.',
        ephemeral: true,
      });
    }

    if (!type) {
      return interaction.reply({
        content: 'Не удалось получить тип ставки, обратитесь в поддержку.',
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

    if (type === 'number') {
      if (chosenNumber === null || chosenNumber === undefined) {
        return interaction.reply({
          content: 'Для ставки на конкретное число укажите параметр "number" (от 0 до 36).',
          ephemeral: true,
        });
      }
      if (chosenNumber < 0 || chosenNumber > 36) {
        return interaction.reply({
          content: 'Число должно быть от 0 до 36.',
          ephemeral: true,
        });
      }
    } else {
      if (chosenNumber !== null && chosenNumber !== undefined) {
        return interaction.reply({
          content: 'Параметр "number" используется только для типа ставки "Конкретное число".',
          ephemeral: true,
        });
      }
    }

    const result = Math.floor(Math.random() * 37);
    const resultColor = this.getNumberColor(result);

    const betDescription = this.getBetDescription(type, chosenNumber);
    const spinningEmbed = new EmbedBuilder()
      .setTitle('🎡 Вращаем рулетку...')
      .setDescription(`**Ваша ставка:** ${betDescription}\n**Сумма:** ${bet} LOLZ`)
      .setColor(0xffff00)
      .setFooter({ text: '🎡 Шарик крутится...' })
      .setThumbnail(
        interaction.user.displayAvatarURL({ size: 512, forceStatic: false }),
      );

    await interaction.reply({ embeds: [spinningEmbed] });

    for (let i = 0; i < 8; i++) {
      await this.sleep(400);

      const randomNumber = Math.floor(Math.random() * 37);
      const randomColor = this.getNumberColor(randomNumber);
      const animEmbed = new EmbedBuilder()
        .setTitle('🎡 Вращаем рулетку...')
        .setDescription(
          `**${randomColor} ${randomNumber}**\n\n**Ваша ставка:** ${betDescription}\n**Сумма:** ${bet} LOLZ`,
        )
        .setColor(0xffff00)
        .setFooter({ text: i < 7 ? '🎡 Шарик крутится...' : '🎡 Результат...' })
        .setThumbnail(
          interaction.user.displayAvatarURL({
            size: 512,
            forceStatic: false,
          }),
        );

      await interaction.editReply({ embeds: [animEmbed] });
    }

    await this.sleep(500);

    const { won, multiplier } = this.checkWin(type, chosenNumber, result);
    let winAmount = won ? bet * multiplier - bet : -bet;
    if (won) {
      winAmount = Math.floor(winAmount * 0.98);
    }
    
    userProfile.coins += winAmount;
    await userProfile.save();

    const finalEmbed = new EmbedBuilder()
      .setTitle('🎡 Результат рулетки')
      .setDescription(
        `**Выпало:** ${resultColor} **${result}**\n**Ваша ставка:** ${betDescription}`,
      )
      .addFields(
        { name: 'Ставка', value: `${bet} LOLZ`, inline: true },
        {
          name: won ? 'Выигрыш' : 'Проигрыш',
          value: `${won ? '+' : ''}${winAmount} LOLZ${won ? ` (x${multiplier})` : ''}`,
          inline: true,
        },
        { name: 'Баланс', value: `${userProfile.coins} LOLZ`, inline: true },
      )
      .setColor(won ? 0x00ff00 : 0xff0000)
      .setFooter({
        text: won
          ? `🎉 Поздравляем! Вы выиграли!`
          : '😔 Не повезло. Попробуйте ещё раз!',
      })
      .setThumbnail(
        interaction.user.displayAvatarURL({ size: 512, forceStatic: false }),
      );

    await interaction.editReply({ embeds: [finalEmbed] });
  }

  private getNumberColor(num: number): string {
    if (num === 0) return '🟢';
    if (this.RED_NUMBERS.includes(num)) return '🔴';
    return '⚫';
  }

  private getBetDescription(type: string, number: number | null): string {
    switch (type) {
      case 'red':
        return '🔴 Красное';
      case 'black':
        return '⚫ Черное';
      case 'even':
        return '🔢 Четное';
      case 'odd':
        return '🔢 Нечетное';
      case 'number':
        return `🎯 Число ${number}`;
      default:
        return 'Неизвестно';
    }
  }

  private checkWin(
    type: string,
    chosenNumber: number | null,
    result: number,
  ): { won: boolean; multiplier: number } {
    switch (type) {
      case 'red':
        return { won: this.RED_NUMBERS.includes(result), multiplier: 2 };
      case 'black':
        return { won: this.BLACK_NUMBERS.includes(result), multiplier: 2 };
      case 'even':
        return { won: result !== 0 && result % 2 === 0, multiplier: 2 };
      case 'odd':
        return { won: result !== 0 && result % 2 === 1, multiplier: 2 };
      case 'number':
        return { won: result === chosenNumber, multiplier: 35 };
      default:
        return { won: false, multiplier: 0 };
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
