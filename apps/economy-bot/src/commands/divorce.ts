import {
  constructEmbed,
  ICommand,
  IFeature,
  RunCommandParams,
  RunFeatureParams,
  MarryModel,
  logger,
} from '@lolz-bots/shared';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonInteraction,
} from 'discord.js';
import {
  ButtonStyle,
} from 'discord-api-types/v10';

export default class Divorce implements ICommand {
  name = 'divorce';
  description = 'End your marriage';

  features = [new ConfirmDivorce(), new CancelDivorce()];

  async run({ interaction }: RunCommandParams) {
    const userId = interaction.user.id;

    // Проверяем, состоит ли пользователь в браке
    const marriage = await MarryModel.findOne({
      $or: [{ user1: userId }, { user2: userId }],
    });

    if (!marriage) {
      await interaction.reply({
        embeds: [
          constructEmbed({
            description: 'Вы не состоите в браке!',
            customType: 'error',
          }),
        ],
        ephemeral: true,
      });
      return;
    }

    const partnerId = marriage.user1 === userId ? marriage.user2 : marriage.user1;

    // Создаем embed с подтверждением
    const embed = constructEmbed({
      description: `Вы уверены, что хотите расторгнуть брак с <@${partnerId}>?\nЭто действие необратимо.`,
      customType: 'error',
    });

    // Создаем кнопки
    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`divorce-confirm_${userId}`)
        .setLabel('Подтвердить')
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId(`divorce-cancel_${userId}`)
        .setLabel('Отменить')
        .setStyle(ButtonStyle.Secondary)
    );

    const message = await interaction.reply({
      embeds: [embed],
      components: [row],
      ephemeral: true,
      fetchReply: true,
    });

    // Создаем коллектор для кнопок
    const collector = message.createMessageComponentCollector({
      time: 60 * 1000, // 1 минута
    });

    collector.on('end', async (collected, reason) => {
      if (reason === 'time') {
        try {
          const disabledRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
              .setCustomId(`divorce-confirm_${userId}`)
              .setLabel('Подтвердить')
              .setStyle(ButtonStyle.Danger)
              .setDisabled(true),
            new ButtonBuilder()
              .setCustomId(`divorce-cancel_${userId}`)
              .setLabel('Отменить')
              .setStyle(ButtonStyle.Secondary)
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

class ConfirmDivorce implements IFeature<ButtonInteraction> {
  name = 'divorce-confirm';

  async run({ interaction }: RunFeatureParams<ButtonInteraction>) {
    const [, initiatorId] = interaction.customId.split('_');

    // Проверка: только инициатор может подтвердить
    if (interaction.user.id !== initiatorId) {
      await interaction.reply({
        embeds: [
          constructEmbed({
            description: 'Только инициатор может подтвердить развод!',
            customType: 'error',
          }),
        ],
        ephemeral: true,
      });
      return;
    }

    // Находим брак
    const marriage = await MarryModel.findOne({
      $or: [{ user1: initiatorId }, { user2: initiatorId }],
    });

    if (!marriage) {
      const embed = constructEmbed({
        description: 'Вы не состоите в браке!',
        customType: 'error',
      });

      await interaction.update({
        embeds: [embed],
        components: [],
      });
      return;
    }

    const partnerId = marriage.user1 === initiatorId ? marriage.user2 : marriage.user1;

    // Убираем роль брака у обоих пользователей
    const marryRoleId = process.env.MARRY_ROLE_ID;
    if (marryRoleId && interaction.guild) {
      try {
        const initiatorMember = await interaction.guild.members.fetch(initiatorId);
        const partnerMember = await interaction.guild.members.fetch(partnerId);
        
        await initiatorMember.roles.remove(marryRoleId);
        await partnerMember.roles.remove(marryRoleId);
      } catch (roleError) {
        logger.error('Failed to remove marry role:', roleError);
      }
    }

    // Удаляем брак из базы данных
    await MarryModel.deleteOne({ _id: marriage._id });

    // Отправляем уведомление партнёру
    try {
      const partnerUser = await interaction.client.users.fetch(partnerId);
      const notificationEmbed = constructEmbed({
        description: `💔 Ваш брак с <@${initiatorId}> был расторгнут.`,
        customType: 'custom',
      });
      
      await partnerUser.send({
        embeds: [notificationEmbed],
      });
    } catch (dmError) {
      logger.error('Failed to send divorce notification to partner:', dmError);
    }

    const embed = constructEmbed({
      description: `💔 Брак расторгнут. <@${initiatorId}> и <@${partnerId}> больше не женаты.`,
      customType: 'success',
    });

    await interaction.update({
      embeds: [embed],
      components: [],
    });
  }
}

class CancelDivorce implements IFeature<ButtonInteraction> {
  name = 'divorce-cancel';

  async run({ interaction }: RunFeatureParams<ButtonInteraction>) {
    const [, initiatorId] = interaction.customId.split('_');

    // Проверка: только инициатор может отменить
    if (interaction.user.id !== initiatorId) {
      await interaction.reply({
        embeds: [
          constructEmbed({
            description: 'Только инициатор может отменить развод!',
            customType: 'error',
          }),
        ],
        ephemeral: true,
      });
      return;
    }

    const embed = constructEmbed({
      description: 'Развод отменен.',
      customType: 'custom',
    });

    await interaction.update({
      embeds: [embed],
      components: [],
    });
  }
}
