import {
  constructEmbed,
  ICommand,
  RunCommandParams,
  UserModel,
} from '@lolz-bots/shared';
import { ApplicationCommandOptionData } from 'discord.js';
import { ApplicationCommandOptionType } from 'discord-api-types/v10';

export default class Give implements ICommand {
  name = 'give';
  description = 'Передать деньги другому пользователю';
  options: ApplicationCommandOptionData[] = [
    {
      name: 'user',
      description: 'Пользователь, которому передать деньги',
      type: ApplicationCommandOptionType.User,
      required: true,
    },
    {
      name: 'amount',
      description: 'Количество LOLZ для передачи',
      type: ApplicationCommandOptionType.Number,
      required: true,
    },
  ];

  async run({ interaction }: RunCommandParams) {
    const targetUser = interaction.options.getUser('user');
    const amount = interaction.options.getNumber('amount');

    if (!targetUser || !amount) {
      return interaction.reply({
        content: 'Не удалось получить данные, обратитесь в поддержку.',
        ephemeral: true,
      });
    }

    if (amount <= 0) {
      return interaction.reply({
        content: 'Сумма должна быть больше нуля.',
        ephemeral: true,
      });
    }

    if (targetUser.id === interaction.user.id) {
      return interaction.reply({
        content: 'Вы не можете передать деньги самому себе!',
        ephemeral: true,
      });
    }

    if (targetUser.bot) {
      return interaction.reply({
        content: 'Вы не можете передать деньги боту!',
        ephemeral: true,
      });
    }

    let senderProfile = await UserModel.findOne({ discordID: interaction.user.id }) || await UserModel.create({ discordID: interaction.user.id });

    const commission = Math.ceil(amount * 0.05);
    const totalCost = amount + commission;

    if (senderProfile.coins < totalCost) {
      return interaction.reply({
        content: `У вас недостаточно средств. Требуется ${totalCost} LOLZ (${amount} + ${commission} комиссия 5%).`,
        ephemeral: true,
      });
    }

    let receiverProfile = await UserModel.findOne({ discordID: targetUser.id }) || await UserModel.create({ discordID: targetUser.id, level: 1 });

    senderProfile.coins -= totalCost;
    receiverProfile.coins += amount;

    await senderProfile.save();
    await receiverProfile.save();

    await interaction.reply({
      embeds: [
        constructEmbed({
          title: '💸 Передача средств',
          description: `${interaction.user} передал **${amount}** LOLZ пользователю ${targetUser}`,
          fields: [
            {
              name: 'Отправитель',
              value: `${interaction.user.username}\nОстаток: **${senderProfile.coins}** LOLZ`,
              inline: true,
            },
            {
              name: 'Получатель',
              value: `${targetUser.username}\nБаланс: **${receiverProfile.coins}** LOLZ`,
              inline: true,
            },
            {
              name: 'Комиссия бота (5%)',
              value: `${commission} LOLZ`,
              inline: false,
            },
          ],
          customType: 'success',
        }),
      ],
    });
  }
}
