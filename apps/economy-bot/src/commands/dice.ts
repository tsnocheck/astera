import {
  constructEmbed,
  ICommand,
  RunCommandParams,
  UserModel,
} from '@lolz-bots/shared';
import { ApplicationCommandOptionData, EmbedBuilder } from 'discord.js';
import { ApplicationCommandOptionType } from 'discord-api-types/v10';

export default class Dice implements ICommand {
  name = 'dice';
  description = 'Бросьте кубик и угадайте число!';
  options: ApplicationCommandOptionData[] = [
    {
      name: 'bet',
      description: 'Ставка на игру',
      type: ApplicationCommandOptionType.Number,
      required: true,
    },
    {
      name: 'number',
      description: 'Число от 1 до 6',
      type: ApplicationCommandOptionType.Integer,
      required: true,
      choices: [
        { name: '⚀ 1', value: 1 },
        { name: '⚁ 2', value: 2 },
        { name: '⚂ 3', value: 3 },
        { name: '⚃ 4', value: 4 },
        { name: '⚄ 5', value: 5 },
        { name: '⚅ 6', value: 6 },
      ],
    },
  ];

  private readonly DICE_EMOJIS = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];

  async run({ interaction }: RunCommandParams) {
    const bet = interaction.options.getNumber('bet');
    const choice = interaction.options.getInteger('number');
    const userProfile =
      (await UserModel.findOne({ discordID: interaction.user.id })) ||
      (await UserModel.create({ discordID: interaction.user.id }));

    if (!bet) {
      return interaction.reply({
        content: 'Не удалось получить ставку, обратитесь в поддержку.',
        ephemeral: true,
      });
    }

    if (!choice || choice < 1 || choice > 6) {
      return interaction.reply({
        content: 'Выберите число от 1 до 6.',
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

    const result = Math.floor(Math.random() * 6) + 1;
    const won = choice === result;

    const spinningEmbed = new EmbedBuilder()
      .setTitle('🎲 Бросаем кубик...')
      .setDescription(
        `**Ваш выбор:** ${this.DICE_EMOJIS[choice - 1]} ${choice}\n**Ставка:** ${bet} LOLZ`,
      )
      .setColor(0xffff00)
      .setFooter({ text: '🎲 Кубик крутится...' })
      .setThumbnail(
        interaction.user.displayAvatarURL({ size: 512, forceStatic: false }),
      );

    await interaction.reply({ embeds: [spinningEmbed] });

    for (let i = 0; i < 6; i++) {
      await this.sleep(400);

      const randomDice = Math.floor(Math.random() * 6);
      const animEmbed = new EmbedBuilder()
        .setTitle('🎲 Бросаем кубик...')
        .setDescription(
          `**${this.DICE_EMOJIS[randomDice]}**\n\n**Ваш выбор:** ${this.DICE_EMOJIS[choice - 1]} ${choice}\n**Ставка:** ${bet} LOLZ`,
        )
        .setColor(0xffff00)
        .setFooter({ text: i < 5 ? '🎲 Кубик крутится...' : '🎲 Результат...' })
        .setThumbnail(
          interaction.user.displayAvatarURL({
            size: 512,
            forceStatic: false,
          }),
        );

      await interaction.editReply({ embeds: [animEmbed] });
    }

    await this.sleep(500);

    let winAmount = won ? bet * 5 : -bet;
    if (won) {
      winAmount = Math.floor(winAmount * 0.98);
    }
    userProfile.coins += winAmount;
    await userProfile.save();

    const finalEmbed = new EmbedBuilder()
      .setTitle('🎲 Результат')
      .setDescription(
        `**Выпало:** ${this.DICE_EMOJIS[result - 1]} ${result}\n**Ваш выбор:** ${this.DICE_EMOJIS[choice - 1]} ${choice}`,
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
          ? '🎉 Невероятно! Вы угадали! x5'
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
