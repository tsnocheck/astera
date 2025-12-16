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
  RepliableInteraction,
  ApplicationCommandOptionData,
} from 'discord.js';
import { ButtonStyle, ApplicationCommandOptionType } from 'discord-api-types/v10';

let originalInteraction: RepliableInteraction;
const activeDuels = new Map<string, boolean>();

export default class Duel implements ICommand {
  name = 'duel';
  description = 'Вызвать пользователя на дуэль';
  features = [new AcceptDuel()];
  options: ApplicationCommandOptionData[] = [
    {
      name: 'bet',
      description: 'Ставка на дуэль',
      type: ApplicationCommandOptionType.Number,
      required: true,
    },
    {
      name: 'user',
      description: 'Пользователь для дуэли',
      type: ApplicationCommandOptionType.User,
      required: false,
    },
  ];

  async run({ interaction }: RunCommandParams) {
    const user = interaction.options.getUser('user');
    const bet = interaction.options.getNumber('bet');
    const userProfile = await UserModel.findOne({ discordID: interaction.user.id }) || await UserModel.create({ discordID: interaction.user.id });
    
    if (!bet) {
      return interaction.reply({ content: 'Не удалось получить ставку, обратитесь в поддержку.', ephemeral: true });
    }

    if (bet <= 0) {
      return interaction.reply({ content: 'Ставка должна быть больше нуля.', ephemeral: true });
    }

    if (userProfile.coins < bet) {
      return interaction.reply({ content: 'У вас недостаточно средств.', ephemeral: true });
    }

    const embed = constructEmbed({
      title: `Дуэль от ${interaction.user.username}`,
      thumbnail: { url: interaction.user.displayAvatarURL({ size: 512, forceStatic: false }) },
      footer: { text: 'У вас есть минута на принятие дуэли.' },
      customType: 'info',
    });

    const acceptButton = new ButtonBuilder()
      .setLabel('Принять дуэль')
      .setStyle(ButtonStyle.Primary);

    let duelId: string;

    if (!user) {
      embed.setDescription(`Ставка ${bet} LOLZ.`);
      duelId = `accept-duel_${interaction.user.id}_${bet}`;
      acceptButton.setCustomId(duelId);

      const actionRow = new ActionRowBuilder<ButtonBuilder>().addComponents(acceptButton);

      await interaction.reply({ embeds: [embed], components: [actionRow] });
    } else {
      if (user.id === interaction.user.id) {
        return interaction.reply({ content: 'Вы не можете вызвать самого себя на дуэль!', ephemeral: true });
      }

      if (user.bot) {
        return interaction.reply({ content: 'Вы не можете вызвать бота на дуэль!', ephemeral: true });
      }

      const opponentProfile = await UserModel.findOne({ discordID: user.id }) || await UserModel.create({ discordID: user.id });
      
      if (opponentProfile.coins < bet) {
        return interaction.reply({ content: 'У вашего оппонента недостаточно средств.', ephemeral: true });
      }

      embed.setDescription(`${user}, вам вызов от ${interaction.user} с ставкой в ${bet} LOLZ!`);

      duelId = `accept-duel_${interaction.user.id}_${bet}_${user.id}`;
      acceptButton.setCustomId(duelId);
      const actionRow = new ActionRowBuilder<ButtonBuilder>().addComponents(acceptButton);

      await interaction.reply({ embeds: [embed], components: [actionRow], content: `<@${user.id}>` });
    }
    
    originalInteraction = interaction as RepliableInteraction;
    activeDuels.set(duelId, false);

    setTimeout(async () => {
      if (!activeDuels.get(duelId)) {
        activeDuels.delete(duelId);
        await interaction.editReply({
          embeds: [
            constructEmbed({
              title: '⏱️ Время истекло',
              description: 'Дуэль не была принята вовремя.',
              customType: 'error',
            }),
          ],
          components: [],
          content: '',
        });
      }
    }, 60000);
  }
}

class AcceptDuel implements IFeature<ButtonInteraction> {
  name = 'accept-duel';

  async run({ interaction }: RunFeatureParams<ButtonInteraction>) {
    const parts = interaction.customId.split('_');
    const challengerId = parts[1];
    const bet = parseInt(parts[2]);
    const targetId = parts[3] || null;

    activeDuels.set(interaction.customId, true);

    if (targetId && interaction.user.id !== targetId) {
      return interaction.reply({ content: 'Эта дуэль не для вас!', ephemeral: true });
    }

    if (!targetId && interaction.user.id === challengerId) {
      return interaction.reply({ content: 'Вы не можете принять свою собственную дуэль!', ephemeral: true });
    }

    const challenger = await UserModel.findOne({ discordID: challengerId });
    const acceptor = await UserModel.findOne({ discordID: interaction.user.id }) || await UserModel.create({ discordID: interaction.user.id });

    if (!challenger) {
      return interaction.reply({ content: 'Инициатор дуэли не найден.', ephemeral: true });
    }

    if (challenger.coins < bet) {
      await interaction.deferUpdate();
      await originalInteraction.editReply({
        embeds: [
          constructEmbed({
            title: 'Дуэль отменена',
            description: 'У инициатора дуэли недостаточно средств.',
            customType: 'error',
          }),
        ],
        components: [],
      });
      return;
    }

    if (acceptor.coins < bet) {
      return interaction.reply({ content: 'У вас недостаточно средств.', ephemeral: true });
    }

    const challengerUser = await interaction.client.users.fetch(challengerId);

    await interaction.deferUpdate();
    await originalInteraction.editReply({
      embeds: [
        constructEmbed({
          title: '⚔️ Дуэль началась!',
          description: `**${challengerUser.username}** vs **${interaction.user.username}**\n\nСтавка: **${bet}** LOLZ\n\n⚡ Идет сражение...`,
          customType: 'info',
        }),
      ],
      components: [],
    });

    const delay = Math.floor(Math.random() * 2000) + 4000;
    await new Promise(resolve => setTimeout(resolve, delay));

    challenger.coins -= bet;
    acceptor.coins -= bet;

    const winner = Math.random() < 0.5 ? challenger : acceptor;
    const loser = winner === challenger ? acceptor : challenger;

    const totalPot = bet * 2;
    const commission = Math.floor(totalPot * 0.02);
    winner.coins += totalPot - commission;

    await challenger.save();
    await acceptor.save();

    const winnerUser = winner === challenger ? challengerUser : interaction.user;
    const loserUser = winner === challenger ? interaction.user : challengerUser;

    await originalInteraction.editReply({
      embeds: [
        constructEmbed({
          title: '⚔️ Результат дуэли',
          description: `**${challengerUser.username}** vs **${interaction.user.username}**\n\nПобедитель: ${winnerUser}\nВыигрыш: **${bet * 2}** LOLZ`,
          fields: [
            {
              name: '🏆 Победитель',
              value: `${winnerUser.username}\nБаланс: **${winner.coins}** LOLZ`,
              inline: true,
            },
            {
              name: '💀 Проигравший',
              value: `${loserUser.username}\nБаланс: **${loser.coins}** LOLZ`,
              inline: true,
            },
          ],
          customType: 'success',
        }),
      ],
      components: [],
    });
  }
}
