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
  getLevelProgress,
  getCoinBonus,
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

  features = [new ViewInventory()];

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
    const coinBonus = getCoinBonus(userProfile.level);

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
          name: 'Бонус к монетам',
          value: `x${coinBonus.toFixed(1)} за минуту в войсе`,
          inline: true,
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
    }

    await interaction.reply({
      embeds: [embed],
      components: userProfile.discordID === interaction.user.id ? [profileOptions] : [],
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
