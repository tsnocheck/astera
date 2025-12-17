import {
  constructEmbed,
  ICommand,
  IFeature,
  Item,
  RunCommandParams,
  RunFeatureParams,
  UserInventoryItem,
  UserModel,
  getXPForLevel,
  getLevelUpCost,
  hasReachedMaxXP,
  getLevelProgress,
  formatTime,
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

export default class Profile implements ICommand {
  name = 'profile';
  description = 'View your profile and stats';
  options: ApplicationCommandOptionData[] = [
    {
      name: 'user',
      description: 'The user whose profile you want to view',
      type: ApplicationCommandOptionType.User,
      required: false,
    },
  ];

  features = [new ViewInventory(), new LevelUp()];

  async run({ interaction }: RunCommandParams) {
    const user = interaction.options.getUser('user') || interaction.user;

    let userProfile = await UserModel.findOne({ discordID: user.id });
    if (!userProfile) {
      userProfile = await UserModel.create({
        discordID: user.id,
        level: 1,
      });
      await userProfile.save();
    }

    const maxXP = getXPForLevel(userProfile.level);
    const progress = getLevelProgress(userProfile.xp, userProfile.level);
    const canLevelUp = hasReachedMaxXP(userProfile.xp, userProfile.level) && userProfile.level < 50;
    const levelUpCost = getLevelUpCost(userProfile.level);

    const embed = constructEmbed({
      title: `${user.username}'s Profile`,
      description: `Here are the stats for ${user.username}`,
      fields: [
        {
          name: 'Баланс',
          value: `${userProfile.coins} LOLZ`,
          inline: true,
        },
        {
          name: 'Уровень',
          value: `${userProfile.level}`,
          inline: true,
        },
        {
          name: 'Опыт',
          value: `${userProfile.xp} / ${maxXP} XP (${progress}%)`,
          inline: false,
        },
        {
          name: 'Время в войсе',
          value: formatTime(userProfile.online),
          inline: true,
        }
      ],
      customType: 'info',
    });

    const profileOptions = new ActionRowBuilder<ButtonBuilder>();
    if (userProfile.discordID === interaction.user.id) {
      profileOptions.addComponents(
        new ButtonBuilder()
          .setCustomId('profile-inventory')
          .setLabel('Инвентарь')
          .setStyle(ButtonStyle.Secondary),
      );

      if (canLevelUp) {
        profileOptions.addComponents(
          new ButtonBuilder()
            .setCustomId('profile-levelup')
            .setLabel('Купить уровень')
            .setStyle(ButtonStyle.Success),
        );
        
        embed.setFooter({ text: `Стоимость повышения: ${levelUpCost} LOLZ` });
      }
    }

    await interaction.reply({
      embeds: [embed],
      components: [profileOptions],
      ephemeral: true,
    });
  }
}

class ViewInventory implements IFeature<ButtonInteraction> {
  name = 'profile-inventory';

  async run({ interaction }: RunFeatureParams<ButtonInteraction>) {
    let userProfile = await UserModel.findOne({
      discordID: interaction.user.id,
    }).populate('inventory');
    if (!userProfile) {
      userProfile = await UserModel.create({
        discordID: interaction.user.id,
        level: 1,
      });
      await userProfile.save();
    }
    if (userProfile!.inventory.length === 0) {
      await interaction.reply({
        ephemeral: true,
        embeds: [
          constructEmbed({
            title: 'Инвентарь',
            description: 'Ваш инвентарь пуст.',
            customType: 'info',
          }),
        ],
      });
      return;
    }
    const { inventory } = await userProfile.populate<{
      inventory: (UserInventoryItem & {
        item: Item;
      })[];
    }>({
      path: 'inventory',
      populate: {
        path: 'item',
      },
    });

    const inventoryItems = inventory
      .map((item) => `${item.item.name} - Количество: ${item.quantity}`)
      .join('\n');

    const embed = constructEmbed({
      title: 'Ваш инвентарь',
      description: inventoryItems,
      customType: 'info',
    });
    await interaction.reply({
      embeds: [embed],
      ephemeral: true,
    });
  }
}

class LevelUp implements IFeature<ButtonInteraction> {
  name = 'profile-levelup';

  async run({ interaction }: RunFeatureParams<ButtonInteraction>) {
    let userProfile = await UserModel.findOne({ discordID: interaction.user.id }) || await UserModel.create({ discordID: interaction.user.id });

    if (!hasReachedMaxXP(userProfile.xp, userProfile.level)) {
      await interaction.reply({
        ephemeral: true,
        embeds: [
          constructEmbed({
            title: 'Невозможно повысить уровень',
            description: 'Сначала нужно набрать максимальное количество XP для текущего уровня!',
            customType: 'error',
          }),
        ],
      });
      return;
    }

    if (userProfile.level >= 50) {
      await interaction.reply({
        ephemeral: true,
        embeds: [
          constructEmbed({
            title: 'Максимальный уровень достигнут',
            description: 'Вы уже достигли максимального уровня!',
            customType: 'info',
          }),
        ],
      });
      return;
    }

    const levelUpCost = getLevelUpCost(userProfile.level);

    if (userProfile.coins < levelUpCost) {
      await interaction.reply({
        ephemeral: true,
        embeds: [
          constructEmbed({
            title: 'Недостаточно средств',
            description: `Для повышения уровня нужно ${levelUpCost} LOLZ. У вас только ${userProfile.coins} LOLZ.`,
            customType: 'error',
          }),
        ],
      });
      return;
    }

    userProfile.coins -= levelUpCost;
    userProfile.level += 1;
    userProfile.xp = 0;

    await userProfile.save();

    const newMaxXP = getXPForLevel(userProfile.level);

    await interaction.reply({
      ephemeral: true,
      embeds: [
        constructEmbed({
          title: '🎉 Повышение уровня!',
          description: `Поздравляем! Вы достигли ${userProfile.level} уровня!`,
          fields: [
            {
              name: 'Новый уровень',
              value: `${userProfile.level}`,
              inline: true,
            },
            {
              name: 'Требуется XP',
              value: `${newMaxXP} XP`,
              inline: true,
            },
            {
              name: 'Остаток',
              value: `${userProfile.coins} LOLZ`,
              inline: true,
            },
          ],
          customType: 'success',
        }),
      ],
    });
  }
}
