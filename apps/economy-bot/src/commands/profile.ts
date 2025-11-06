import {
  constructEmbed,
  ICommand,
  IFeature,
  Item,
  RunCommandParams,
  RunFeatureParams,
  UserInventoryItem,
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
      });
      await userProfile.save();
    }
    const embed = constructEmbed({
      title: `${user.username}'s Profile`,
      description: `Here are the stats for ${user.username}`,
      fields: [
        {
          name: 'Balance',
          value: `${userProfile.coins} LOLZ`,
          inline: true,
        },
        {
          name: 'Experience',
          value: `${userProfile.xp} XP`,
          inline: true,
        },
      ],
      customType: 'info',
    });
    const profileOptions = new ActionRowBuilder<ButtonBuilder>();
    if (userProfile.discordID === interaction.user.id) {
      profileOptions.addComponents(
        new ButtonBuilder()
          .setCustomId('profile_inventory')
          .setLabel('View Inventory')
          .setStyle(ButtonStyle.Secondary),
      );
    }

    await interaction.reply({
      embeds: [embed],
      components: [profileOptions],
      ephemeral: true,
    });
  }
}

class ViewInventory implements IFeature<ButtonInteraction> {
  name = 'profile_inventory';

  async run({ interaction }: RunFeatureParams<ButtonInteraction>) {
    let userProfile = await UserModel.findOne({
      discordID: interaction.user.id,
    }).populate('inventory');
    if (!userProfile) {
      userProfile = await UserModel.create({
        discordID: interaction.user.id,
      });
      await userProfile.save();
    }
    if (userProfile!.inventory.length === 0) {
      await interaction.reply({
        ephemeral: true,
        embeds: [
          constructEmbed({
            title: 'Inventory',
            description: 'Your inventory is empty.',
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
    console.log(inventory);
    const inventoryItems = inventory
      .map((item) => `${item.item.name} - Quantity: ${item.quantity}`)
      .join('\n');

    const embed = constructEmbed({
      title: 'Your Inventory',
      description: inventoryItems,
      customType: 'info',
    });
    await interaction.reply({
      embeds: [embed],
      ephemeral: true,
    });
  }
}
