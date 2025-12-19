import {
  constructEmbed,
  ICommand,
  IFeature,
  RunCommandParams,
  RunFeatureParams,
  UserModel,
  getLevelUpCost,
  getXPForLevel,
  getCoinBonus,
} from '@lolz-bots/shared';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonInteraction,
} from 'discord.js';
import { ButtonStyle } from 'discord-api-types/v10';

function calculateTotalCost(currentLevel: number, levelsCount: number): number {
  let totalCost = 0;
  for (let i = 0; i < levelsCount; i++) {
    const level = currentLevel + i;
    if (level >= 50) break;
    totalCost += getLevelUpCost(level);
  }
  return totalCost;
}

export default class BuyLevel implements ICommand {
  name = 'buylevel';
  description = 'Купить уровень за валюту';

  features = [new IncreaseLevelCount(), new DecreaseLevelCount(), new ConfirmBuy()];

  async run({ interaction }: RunCommandParams) {
    let userProfile = await UserModel.findOne({
      discordID: interaction.user.id,
    });
    if (!userProfile) {
      userProfile = await UserModel.create({
        discordID: interaction.user.id,
        level: 1,
      });
      await userProfile.save();
    }

    if (userProfile.level >= 50) {
      await interaction.reply({
        ephemeral: true,
        embeds: [
          constructEmbed({
            title: 'Максимальный уровень достигнут',
            description: 'Вы уже достигли максимального уровня (50)!',
            customType: 'info',
          }),
        ],
      });
      return;
    }

    const levelsCount = 1;
    const maxLevelsAvailable = 50 - userProfile.level;
    const totalCost = calculateTotalCost(userProfile.level, levelsCount);
    const newLevel = userProfile.level + levelsCount;
    const coinBonus = getCoinBonus(newLevel);

    const embed = constructEmbed({
      title: '💰 Покупка уровней',
      description: `Текущий уровень: **${userProfile.level}**\nБаланс: **${userProfile.coins}** LOLZ`,
      fields: [
        {
          name: 'Количество уровней',
          value: `${levelsCount}`,
          inline: true,
        },
        {
          name: 'Новый уровень',
          value: `${newLevel}`,
          inline: true,
        },
        {
          name: 'Стоимость',
          value: `${totalCost} LOLZ`,
          inline: true,
        },
        {
          name: 'Бонус к монетам',
          value: `x${coinBonus.toFixed(1)} за минуту`,
          inline: false,
        },
      ],
      customType: 'info',
    });

    const row = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(`buylevel-decrease_${levelsCount}`)
          .setLabel('➖')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(levelsCount <= 1),
        new ButtonBuilder()
          .setCustomId(`buylevel-increase_${levelsCount}`)
          .setLabel('➕')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(levelsCount >= maxLevelsAvailable),
        new ButtonBuilder()
          .setCustomId(`buylevel-confirm_${levelsCount}`)
          .setLabel('Купить')
          .setStyle(ButtonStyle.Success)
          .setDisabled(userProfile.coins < totalCost),
      );

    await interaction.reply({
      embeds: [embed],
      components: [row],
      ephemeral: true,
    });
  }
}

class IncreaseLevelCount implements IFeature<ButtonInteraction> {
  name = 'buylevel-increase';

  async run({ interaction }: RunFeatureParams<ButtonInteraction>) {
    const currentCount = parseInt(interaction.customId.split('_')[1]);
    const newCount = currentCount + 1;

    let userProfile = await UserModel.findOne({
      discordID: interaction.user.id,
    });
    if (!userProfile) {
      await interaction.reply({
        content: 'Произошла ошибка. Попробуйте снова.',
        ephemeral: true,
      });
      return;
    }

    const maxLevelsAvailable = 50 - userProfile.level;
    if (newCount > maxLevelsAvailable) {
      await interaction.reply({
        content: 'Достигнут максимальный уровень!',
        ephemeral: true,
      });
      return;
    }

    const totalCost = calculateTotalCost(userProfile.level, newCount);
    const newLevel = userProfile.level + newCount;
    const coinBonus = getCoinBonus(newLevel);

    const embed = constructEmbed({
      title: '💰 Покупка уровней',
      description: `Текущий уровень: **${userProfile.level}**\nБаланс: **${userProfile.coins}** LOLZ`,
      fields: [
        {
          name: 'Количество уровней',
          value: `${newCount}`,
          inline: true,
        },
        {
          name: 'Новый уровень',
          value: `${newLevel}`,
          inline: true,
        },
        {
          name: 'Стоимость',
          value: `${totalCost} LOLZ`,
          inline: true,
        },
        {
          name: 'Бонус к монетам',
          value: `x${coinBonus.toFixed(1)} за минуту`,
          inline: false,
        },
      ],
      customType: 'info',
    });

    const row = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(`buylevel-decrease_${newCount}`)
          .setLabel('➖')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(newCount <= 1),
        new ButtonBuilder()
          .setCustomId(`buylevel-increase_${newCount}`)
          .setLabel('➕')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(newCount >= maxLevelsAvailable),
        new ButtonBuilder()
          .setCustomId(`buylevel-confirm_${newCount}`)
          .setLabel('Купить')
          .setStyle(ButtonStyle.Success)
          .setDisabled(userProfile.coins < totalCost),
      );

    await interaction.update({
      embeds: [embed],
      components: [row],
    });
  }
}

class DecreaseLevelCount implements IFeature<ButtonInteraction> {
  name = 'buylevel-decrease';

  async run({ interaction }: RunFeatureParams<ButtonInteraction>) {
    const currentCount = parseInt(interaction.customId.split('_')[1]);
    const newCount = Math.max(1, currentCount - 1);

    let userProfile = await UserModel.findOne({
      discordID: interaction.user.id,
    });
    if (!userProfile) {
      await interaction.reply({
        content: 'Произошла ошибка. Попробуйте снова.',
        ephemeral: true,
      });
      return;
    }

    const maxLevelsAvailable = 50 - userProfile.level;
    const totalCost = calculateTotalCost(userProfile.level, newCount);
    const newLevel = userProfile.level + newCount;
    const coinBonus = getCoinBonus(newLevel);

    const embed = constructEmbed({
      title: '💰 Покупка уровней',
      description: `Текущий уровень: **${userProfile.level}**\nБаланс: **${userProfile.coins}** LOLZ`,
      fields: [
        {
          name: 'Количество уровней',
          value: `${newCount}`,
          inline: true,
        },
        {
          name: 'Новый уровень',
          value: `${newLevel}`,
          inline: true,
        },
        {
          name: 'Стоимость',
          value: `${totalCost} LOLZ`,
          inline: true,
        },
        {
          name: 'Бонус к монетам',
          value: `x${coinBonus.toFixed(1)} за минуту`,
          inline: false,
        },
      ],
      customType: 'info',
    });

    const row = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(`buylevel-decrease_${newCount}`)
          .setLabel('➖')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(newCount <= 1),
        new ButtonBuilder()
          .setCustomId(`buylevel-increase_${newCount}`)
          .setLabel('➕')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(newCount >= maxLevelsAvailable),
        new ButtonBuilder()
          .setCustomId(`buylevel-confirm_${newCount}`)
          .setLabel('Купить')
          .setStyle(ButtonStyle.Success)
          .setDisabled(userProfile.coins < totalCost),
      );

    await interaction.update({
      embeds: [embed],
      components: [row],
    });
  }
}

class ConfirmBuy implements IFeature<ButtonInteraction> {
  name = 'buylevel-confirm';

  async run({ interaction }: RunFeatureParams<ButtonInteraction>) {
    const levelsCount = parseInt(interaction.customId.split('_')[1]);

    let userProfile = await UserModel.findOne({
      discordID: interaction.user.id,
    });
    if (!userProfile) {
      await interaction.reply({
        content: 'Произошла ошибка. Попробуйте снова.',
        ephemeral: true,
      });
      return;
    }

    const totalCost = calculateTotalCost(userProfile.level, levelsCount);

    if (userProfile.coins < totalCost) {
      await interaction.update({
        embeds: [
          constructEmbed({
            title: 'Недостаточно средств',
            description: `Для покупки ${levelsCount} уровн${levelsCount === 1 ? 'я' : 'ей'} нужно ${totalCost} LOLZ.\nУ вас только ${userProfile.coins} LOLZ.`,
            customType: 'error',
          }),
        ],
        components: [],
      });
      return;
    }

    const oldLevel = userProfile.level;
    userProfile.coins -= totalCost;
    userProfile.level += levelsCount;
    userProfile.xp = 0;

    await userProfile.save();

    const newMaxXP = getXPForLevel(userProfile.level);
    const coinBonus = getCoinBonus(userProfile.level);
    const nextLevelCost = userProfile.level < 50 ? getLevelUpCost(userProfile.level) : 0;

    await interaction.update({
      embeds: [
        constructEmbed({
          title: '🎉 Уровни куплены!',
          description: `Поздравляем! Вы повысились с ${oldLevel} до ${userProfile.level} уровня!`,
          fields: [
            {
              name: 'Новый уровень',
              value: `${userProfile.level}`,
              inline: true,
            },
            {
              name: 'Требуется XP',
              value: userProfile.level < 50 ? `${newMaxXP} XP` : 'Максимальный уровень',
              inline: true,
            },
            {
              name: 'Остаток монет',
              value: `${userProfile.coins} LOLZ`,
              inline: true,
            },
            {
              name: 'Бонус к монетам',
              value: `x${coinBonus.toFixed(1)} за минуту`,
              inline: true,
            },
            ...(nextLevelCost > 0
              ? [
                  {
                    name: 'Стоимость следующего уровня',
                    value: `${nextLevelCost} LOLZ`,
                    inline: true,
                  },
                ]
              : []),
          ],
          customType: 'success',
        }),
      ],
      components: [],
    });
  }
}
