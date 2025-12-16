import {
  constructEmbed,
  ICommand,
  RunCommandParams,
  UserModel,
} from '@lolz-bots/shared';
import { ApplicationCommandOptionData, EmbedBuilder } from 'discord.js';
import { ApplicationCommandOptionType } from 'discord-api-types/v10';

export default class Slots implements ICommand {
  name = 'slots';
  description = 'Играйте в слоты и выигрывайте монеты!';
  options: ApplicationCommandOptionData[] = [
    {
      name: 'bet',
      description: 'Ставка на игру',
      type: ApplicationCommandOptionType.Number,
      required: true,
    },
  ];

  private readonly SYMBOLS = ['🍒', '🍋', '🍊', '🍇', '💎', '7️⃣'];
  private readonly JACKPOT_SYMBOL = '7️⃣';
  private readonly RARE_SYMBOL = '💎';

  async run({ interaction }: RunCommandParams) {
    const bet = interaction.options.getNumber('bet');
    const userProfile = await UserModel.findOne({ discordID: interaction.user.id }) || 
                        await UserModel.create({ discordID: interaction.user.id });

    if (!bet) {
      return interaction.reply({ content: 'Не удалось получить ставку, обратитесь в поддержку.', ephemeral: true });
    }

    if (bet <= 0) {
      return interaction.reply({ content: 'Ставка должна быть больше нуля.', ephemeral: true });
    }

    if (userProfile.coins < bet) {
      return interaction.reply({ content: 'У вас недостаточно средств.', ephemeral: true });
    }

    const finalSlots = [
      this.getRandomSymbol(),
      this.getRandomSymbol(),
      this.getRandomSymbol(),
    ];

    const spinningEmbed = new EmbedBuilder()
      .setTitle('🎰 Слоты')
      .setDescription(`**🎲 | 🎲 | 🎲**`)
      .addFields({ name: 'Ставка', value: `${bet} LOLZ`, inline: true })
      .setColor(0xffff00)
      .setFooter({ text: '🎰 Крутим барабаны...' })
      .setThumbnail(interaction.user.displayAvatarURL({ size: 512, forceStatic: false }));

    await interaction.reply({ embeds: [spinningEmbed] });

    const frames = 4;
    for (let i = 0; i < frames; i++) {
      await this.sleep(400);
      
      const currentSlots = [
        i >= frames - 1 ? finalSlots[0] : this.getRandomSymbol(),
        i >= frames - 1 ? finalSlots[1] : this.getRandomSymbol(),
        i >= frames - 1 ? finalSlots[2] : this.getRandomSymbol(),
      ];

      const animEmbed = new EmbedBuilder()
        .setTitle('🎰 Слоты')
        .setDescription(`**${currentSlots.join(' | ')}**`)
        .addFields({ name: 'Ставка', value: `${bet} LOLZ`, inline: true })
        .setColor(0xffff00)
        .setFooter({ text: i < frames - 1 ? '🎰 Крутим барабаны...' : '🎰 Результат...' })
        .setThumbnail(interaction.user.displayAvatarURL({ size: 512, forceStatic: false }));

      await interaction.editReply({ embeds: [animEmbed] });
    }

    await this.sleep(500);

    const result = this.calculateWin(finalSlots, bet);
    
    userProfile.coins += result.winAmount;
    await userProfile.save();

    const finalEmbed = new EmbedBuilder()
      .setTitle('🎰 Слоты')
      .setDescription(`**${finalSlots.join(' | ')}**`)
      .addFields(
        { name: 'Ставка', value: `${bet} LOLZ`, inline: true },
        { name: result.winAmount >= 0 ? 'Выигрыш' : 'Проигрыш', value: `${result.winAmount >= 0 ? '+' : ''}${result.winAmount} LOLZ`, inline: true },
        { name: 'Баланс', value: `${userProfile.coins} LOLZ`, inline: true }
      )
      .setColor(result.winAmount > 0 ? 0x00ff00 : 0xff0000)
      .setFooter({ text: result.message })
      .setThumbnail(interaction.user.displayAvatarURL({ size: 512, forceStatic: false }));

    await interaction.editReply({ embeds: [finalEmbed] });
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private getRandomSymbol(): string {
    const weights = [30, 25, 20, 15, 8, 2];
    const totalWeight = weights.reduce((sum, w) => sum + w, 0);
    let random = Math.random() * totalWeight;

    for (let i = 0; i < this.SYMBOLS.length; i++) {
      random -= weights[i];
      if (random <= 0) {
        return this.SYMBOLS[i];
      }
    }

    return this.SYMBOLS[0];
  }

  private calculateWin(slots: string[], bet: number): { winAmount: number; message: string } {
    const [first, second, third] = slots;

    if (first === second && second === third) {
      if (first === this.JACKPOT_SYMBOL) {
        return { winAmount: bet * 10, message: '🎉 ДЖЕКПОТ! Три семерки! x10' };
      }
      if (first === this.RARE_SYMBOL) {
        return { winAmount: bet * 7, message: '💎 Три бриллианта! x7' };
      }
      return { winAmount: bet * 5, message: '🎊 Три одинаковых символа! x5' };
    }

    if (first === second || second === third || first === third) {
      const matchedSymbol = first === second ? first : (second === third ? second : first);
      
      if (matchedSymbol === this.JACKPOT_SYMBOL) {
        return { winAmount: bet * 3, message: '✨ Две семерки! x3' };
      }
      if (matchedSymbol === this.RARE_SYMBOL) {
        return { winAmount: bet * 2, message: '💫 Два бриллианта! x2' };
      }
      return { winAmount: Math.floor(bet * 0.5), message: '⭐ Два одинаковых символа! x0.5' };
    }

    return { winAmount: -bet, message: '😔 Не повезло. Попробуйте еще раз!' };
  }
}
