import {
  constructEmbed,
  ICommand,
  IFeature,
  RunCommandParams,
  RunFeatureParams,
  MarryModel,
  UserModel,
} from '@lolz-bots/shared';
import {
  ActionRowBuilder,
  ApplicationCommandOptionData,
  ButtonBuilder,
  ButtonInteraction,
} from 'discord.js';
import {
  ApplicationCommandOptionType,
  ButtonStyle,
} from 'discord-api-types/v10';

export default class Marry implements ICommand {
  name = 'marry';
  description = 'Propose marriage to another user';
  options: ApplicationCommandOptionData[] = [
    {
      name: 'user',
      description: 'The user you want to marry',
      type: ApplicationCommandOptionType.User,
      required: true,
    },
  ];

  features = [new AcceptMarry(), new RejectMarry()];

  async run({ interaction }: RunCommandParams) {
    const targetUser = interaction.options.getUser('user', true);
    const proposer = interaction.user;

    // Проверка: нельзя жениться на самом себе
    if (targetUser.id === proposer.id) {
      await interaction.reply({
        embeds: [
          constructEmbed({
            description: 'Вы не можете жениться на самом себе!',
            customType: 'error',
          }),
        ],
        ephemeral: true,
      });
      return;
    }

    // Проверка: нельзя жениться на боте
    if (targetUser.bot) {
      await interaction.reply({
        embeds: [
          constructEmbed({
            description: 'Вы не можете жениться на боте!',
            customType: 'error',
          }),
        ],
        ephemeral: true,
      });
      return;
    }

    // Проверка: уже женаты
    const existingMarriage = await MarryModel.findOne({
      $or: [
        { user1: proposer.id, user2: targetUser.id },
        { user1: targetUser.id, user2: proposer.id },
      ],
    });

    if (existingMarriage) {
      await interaction.reply({
        embeds: [
          constructEmbed({
            description: 'Вы уже женаты на этом пользователе!',
            customType: 'error',
          }),
        ],
        ephemeral: true,
      });
      return;
    }

    // Проверка: один из пользователей уже женат на ком-то другом
    const proposerMarriage = await MarryModel.findOne({
      $or: [{ user1: proposer.id }, { user2: proposer.id }],
    });

    if (proposerMarriage) {
      await interaction.reply({
        embeds: [
          constructEmbed({
            description: 'Вы уже женаты на другом пользователе!',
            customType: 'error',
          }),
        ],
        ephemeral: true,
      });
      return;
    }

    const targetMarriage = await MarryModel.findOne({
      $or: [{ user1: targetUser.id }, { user2: targetUser.id }],
    });

    if (targetMarriage) {
      await interaction.reply({
        embeds: [
          constructEmbed({
            description: 'Этот пользователь уже женат на ком-то другом!',
            customType: 'error',
          }),
        ],
        ephemeral: true,
      });
      return;
    }

    // Проверка баланса (5000 монет)
    let proposerProfile = await UserModel.findOne({ discordID: proposer.id });
    if (!proposerProfile) {
      proposerProfile = await UserModel.create({
        discordID: proposer.id,
        level: 1,
      });
      await proposerProfile.save();
    }

    if (proposerProfile.coins < 5000) {
      await interaction.reply({
        embeds: [
          constructEmbed({
            description: `Недостаточно средств! Для предложения брака нужно 5000 монет. У вас: ${proposerProfile.coins}`,
            customType: 'error',
          }),
        ],
        ephemeral: true,
      });
      return;
    }

    // Создаем embed с предложением
    const embed = constructEmbed({
      description: `${proposer.username} предлагает вам пожениться! ${targetUser.username}, вы согласны?`,
      customType: 'custom',
    });

    // Создаем кнопки
    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`marry-accept_${proposer.id}_${targetUser.id}`)
        .setLabel('Принять')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`marry-reject_${proposer.id}_${targetUser.id}`)
        .setLabel('Отклонить')
        .setStyle(ButtonStyle.Danger)
    );

    const message = await interaction.reply({
      content: `<@${targetUser.id}>`,
      embeds: [embed],
      components: [row],
      fetchReply: true,
    });

    // Создаем коллектор для кнопок
    const collector = message.createMessageComponentCollector({
      time: 3 * 60 * 1000, // 3 минуты
    });

    collector.on('end', async (collected, reason) => {
      if (reason === 'time') {
        try {
          const disabledRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
              .setCustomId(`marry-accept_${proposer.id}_${targetUser.id}`)
              .setLabel('Принять')
              .setStyle(ButtonStyle.Success)
              .setDisabled(true),
            new ButtonBuilder()
              .setCustomId(`marry-reject_${proposer.id}_${targetUser.id}`)
              .setLabel('Отклонить')
              .setStyle(ButtonStyle.Danger)
              .setDisabled(true)
          );

          const timeoutEmbed = constructEmbed({
            description: 'Время на подтверждение истекло.',
            customType: 'error',
          });

          await message.edit({
            embeds: [timeoutEmbed],
            components: [disabledRow],
          });
        } catch (error) {
          // Сообщение уже было обновлено или удалено
        }
      }
    });
  }
}

class AcceptMarry implements IFeature<ButtonInteraction> {
  name = 'marry-accept';

  async run({ interaction }: RunFeatureParams<ButtonInteraction>) {
    const [, proposerId, targetId] = interaction.customId.split('_');

    // Проверка: только получатель предложения может принять
    if (interaction.user.id !== targetId) {
      await interaction.reply({
        embeds: [
          constructEmbed({
            description: 'Только получатель предложения может принять его!',
            customType: 'error',
          }),
        ],
        ephemeral: true,
      });
      return;
    }

    // Проверяем, что оба пользователя еще не женаты
    const existingMarriage = await MarryModel.findOne({
      $or: [
        { user1: proposerId },
        { user2: proposerId },
        { user1: targetId },
        { user2: targetId },
      ],
    });

    if (existingMarriage) {
      const embed = constructEmbed({
        description: 'Один из вас уже женат на другом пользователе!',
        customType: 'error',
      });

      await interaction.update({
        embeds: [embed],
        components: [],
      });
      return;
    }

    // Списываем 5000 монет с инициатора
    const proposerProfile = await UserModel.findOne({ discordID: proposerId });
    if (proposerProfile) {
      proposerProfile.coins -= 5000;
      await proposerProfile.save();
    }

    // Создаем брак с датой следующей оплаты через 30 дней
    const nextPaymentDate = new Date();
    nextPaymentDate.setDate(nextPaymentDate.getDate() + 30);

    await MarryModel.create({
      user1: proposerId,
      user2: targetId,
      dateRegistered: new Date(),
      balance: 0,
      paymentDate: nextPaymentDate,
    });

    // Выдаем роль брака обоим пользователям
    const marryRoleId = process.env.MARRY_ROLE_ID;
    if (marryRoleId && interaction.guild) {
      try {
        const proposerMember = await interaction.guild.members.fetch(proposerId);
        const targetMember = await interaction.guild.members.fetch(targetId);
        
        await proposerMember.roles.add(marryRoleId);
        await targetMember.roles.add(marryRoleId);
      } catch (roleError) {
        console.error('Failed to add marry role:', roleError);
      }
    }

    // Обновляем профили пользователей (если нужно)
    await UserModel.findOne({ discordID: proposerId });
    await UserModel.findOne({ discordID: targetId });

    const embed = constructEmbed({
      description: `🎉 Поздравляем! <@${proposerId}> и <@${targetId}> теперь женаты!`,
      customType: 'success',
    });

    await interaction.update({
      content: `<@${proposerId}> <@${targetId}>`,
      embeds: [embed],
      components: [],
    });
  }
}

class RejectMarry implements IFeature<ButtonInteraction> {
  name = 'marry-reject';

  async run({ interaction }: RunFeatureParams<ButtonInteraction>) {
    const [, proposerId, targetId] = interaction.customId.split('_');

    // Проверка: только получатель предложения может отклонить
    if (interaction.user.id !== targetId) {
      await interaction.reply({
        embeds: [
          constructEmbed({
            description: 'Только получатель предложения может отклонить его!',
            customType: 'error',
          }),
        ],
        ephemeral: true,
      });
      return;
    }

    const embed = constructEmbed({
      description: `<@${targetId}> отклонил(а) предложение от <@${proposerId}>.`,
      customType: 'error',
    });

    await interaction.update({
      content: `<@${proposerId}>`,
      embeds: [embed],
      components: [],
    });
  }
}
