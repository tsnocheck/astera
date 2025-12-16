import {
  constructEmbed,
  ICommand,
  IFeature,
  RunCommandParams,
  RunFeatureParams,
  UserModel,
} from '@lolz-bots/shared';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonInteraction,
  EmbedBuilder,
  RepliableInteraction,
  ApplicationCommandOptionData,
} from 'discord.js';
import { ButtonStyle, ApplicationCommandOptionType } from 'discord-api-types/v10';

interface GameState {
  playerHand: Card[];
  dealerHand: Card[];
  deck: Card[];
  bet: number;
  userId: string;
  gameOver: boolean;
}

interface Card {
  suit: string;
  rank: string;
  value: number;
}

const gameStates = new Map<string, GameState>();

export default class Blackjack implements ICommand {
  name = 'blackjack';
  description = 'Сыграйте в блэкджек против дилера!';
  features = [new BlackjackButtons()];
  options: ApplicationCommandOptionData[] = [
    {
      name: 'bet',
      description: 'Ставка на игру',
      type: ApplicationCommandOptionType.Number,
      required: true,
    },
  ];

  private readonly SUITS = ['♠️', '♣️', '♥️', '♦️'];
  private readonly RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

  async run({ interaction }: RunCommandParams) {
    const bet = interaction.options.getNumber('bet');
    const userProfile =
      (await UserModel.findOne({ discordID: interaction.user.id })) ||
      (await UserModel.create({ discordID: interaction.user.id }));

    if (!bet) {
      return interaction.reply({
        content: 'Не удалось получить ставку, обратитесь в поддержку.',
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

    const deck = this.createDeck();
    this.shuffleDeck(deck);

    const playerHand = [deck.pop()!, deck.pop()!];
    const dealerHand = [deck.pop()!, deck.pop()!];

    const gameState: GameState = {
      playerHand,
      dealerHand,
      deck,
      bet,
      userId: interaction.user.id,
      gameOver: false,
    };
    gameStates.set(interaction.user.id, gameState);

    userProfile.coins -= bet;
    await userProfile.save();

    const playerScore = this.calculateScore(playerHand);
    const dealerScore = this.calculateScore(dealerHand);

    if (playerScore === 21) {
      gameState.gameOver = true;
      const winAmount = dealerScore === 21 ? bet : Math.floor(bet * 2.5);
      userProfile.coins += winAmount;
      await userProfile.save();

      const embed = this.createGameEmbed(gameState, true, dealerScore === 21 ? 'push' : 'blackjack');
      return interaction.reply({ embeds: [embed] });
    }

    const embed = this.createGameEmbed(gameState, false);
    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId('blackjack_hit')
        .setLabel('Взять карту (Hit)')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('blackjack_stand')
        .setLabel('Хватит (Stand)')
        .setStyle(ButtonStyle.Secondary),
    );

    await interaction.reply({ embeds: [embed], components: [row] });
  }

  private createDeck(): Card[] {
    const deck: Card[] = [];
    for (const suit of this.SUITS) {
      for (const rank of this.RANKS) {
        let value = parseInt(rank);
        if (isNaN(value)) {
          value = rank === 'A' ? 11 : 10;
        }
        deck.push({ suit, rank, value });
      }
    }
    return deck;
  }

  private shuffleDeck(deck: Card[]): void {
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
  }

  private calculateScore(hand: Card[]): number {
    let score = 0;
    let aces = 0;

    for (const card of hand) {
      score += card.value;
      if (card.rank === 'A') aces++;
    }

    while (score > 21 && aces > 0) {
      score -= 10;
      aces--;
    }

    return score;
  }

  private formatHand(hand: Card[], hideFirst: boolean = false): string {
    return hand
      .map((card, index) => {
        if (hideFirst && index === 0) return '🎴';
        return `${card.rank}${card.suit}`;
      })
      .join(' ');
  }

  private createGameEmbed(
    gameState: GameState,
    showDealerCards: boolean,
    result?: 'win' | 'lose' | 'push' | 'blackjack',
  ): EmbedBuilder {
    const playerScore = this.calculateScore(gameState.playerHand);
    const dealerScore = this.calculateScore(gameState.dealerHand);

    const embed = new EmbedBuilder().setTitle('🃏 Блэкджек');

    let description = `**Дилер:** ${this.formatHand(gameState.dealerHand, !showDealerCards)}`;
    if (showDealerCards) {
      description += ` (${dealerScore})`;
    }
    description += `\n**Вы:** ${this.formatHand(gameState.playerHand)} (${playerScore})`;
    description += `\n\n**Ставка:** ${gameState.bet} LOLZ`;

    embed.setDescription(description);

    if (result) {
      switch (result) {
        case 'blackjack':
          embed.setColor(0xffd700).setFooter({ text: '🎉 БЛЭКДЖЕК! Выигрыш x2.5' });
          break;
        case 'win':
          embed.setColor(0x00ff00).setFooter({ text: '🎉 Вы выиграли! Выигрыш x2' });
          break;
        case 'lose':
          embed.setColor(0xff0000).setFooter({ text: '😔 Вы проиграли!' });
          break;
        case 'push':
          embed.setColor(0xffff00).setFooter({ text: '🤝 Ничья! Ставка возвращена.' });
          break;
      }
    } else {
      embed.setColor(0x0099ff).setFooter({ text: 'Выберите действие' });
    }

    return embed;
  }
}

class BlackjackButtons implements IFeature<ButtonInteraction> {
  name = 'blackjack';

  async run({ interaction }: RunFeatureParams<ButtonInteraction>) {
    const isHit = interaction.customId.includes('hit');
    const isStand = interaction.customId.includes('stand');

    if (!isHit && !isStand) {
      return;
    }

    const gameState = gameStates.get(interaction.user.id);

    if (!gameState) {
      return interaction.reply({
        content: 'Игра не найдена. Начните новую игру командой /blackjack.',
        ephemeral: true,
      });
    }

    if (gameState.userId !== interaction.user.id) {
      return interaction.reply({
        content: 'Это не ваша игра!',
        ephemeral: true,
      });
    }

    if (gameState.gameOver) {
      return interaction.reply({
        content: 'Игра уже завершена. Начните новую игру командой /blackjack.',
        ephemeral: true,
      });
    }

    if (isHit) {
      await this.handleHit(interaction, gameState);
    } else if (isStand) {
      await this.handleStand(interaction, gameState);
    }
  }

  private async handleHit(interaction: ButtonInteraction, gameState: GameState) {
    gameState.playerHand.push(gameState.deck.pop()!);
    const playerScore = this.calculateScore(gameState.playerHand);

    const blackjack = new Blackjack();

    if (playerScore > 21) {
      gameState.gameOver = true;
      gameStates.delete(interaction.user.id);

      const embed = (blackjack as any).createGameEmbed(gameState, true, 'lose');
      await interaction.update({ embeds: [embed], components: [] });
      return;
    }

    if (playerScore === 21) {
      await this.handleStand(interaction, gameState);
      return;
    }

    const embed = (blackjack as any).createGameEmbed(gameState, false);
    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId('blackjack_hit')
        .setLabel('Взять карту (Hit)')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('blackjack_stand')
        .setLabel('Хватит (Stand)')
        .setStyle(ButtonStyle.Secondary),
    );

    await interaction.update({ embeds: [embed], components: [row] });
  }

  private async handleStand(interaction: ButtonInteraction, gameState: GameState) {
    gameState.gameOver = true;

    while (this.calculateScore(gameState.dealerHand) < 17) {
      gameState.dealerHand.push(gameState.deck.pop()!);
    }

    const playerScore = this.calculateScore(gameState.playerHand);
    const dealerScore = this.calculateScore(gameState.dealerHand);

    let result: 'win' | 'lose' | 'push';
    let winAmount = 0;

    if (dealerScore > 21 || playerScore > dealerScore) {
      result = 'win';
      winAmount = gameState.bet * 2;
    } else if (playerScore === dealerScore) {
      result = 'push';
      winAmount = gameState.bet;
    } else {
      result = 'lose';
      winAmount = 0;
    }

    const userProfile = await UserModel.findOne({
      discordID: interaction.user.id,
    });
    if (userProfile) {
      userProfile.coins += winAmount;
      await userProfile.save();
    }

    gameStates.delete(interaction.user.id);

    const blackjack = new Blackjack();
    const embed = (blackjack as any).createGameEmbed(gameState, true, result);
    await interaction.update({ embeds: [embed], components: [] });
  }

  private calculateScore(hand: Card[]): number {
    let score = 0;
    let aces = 0;

    for (const card of hand) {
      score += card.value;
      if (card.rank === 'A') aces++;
    }

    while (score > 21 && aces > 0) {
      score -= 10;
      aces--;
    }

    return score;
  }
}
