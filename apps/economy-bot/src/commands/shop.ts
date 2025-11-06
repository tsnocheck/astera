import {
  CaseItem,
  CaseModel,
  constructEmbed,
  ICommand,
  IFeature,
  Item,
  RunCommandParams,
  RunFeatureParams,
  UserModel,
} from '@lolz-bots/shared';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonInteraction,
  RepliableInteraction,
} from 'discord.js';
import { ButtonStyle } from 'discord-api-types/v10';

let originalInteraction: RepliableInteraction;

export default class Shop implements ICommand {
  name = 'shop';
  description = 'View the shop to buy items';
  features = [new ShowCases(), new BuyCase()];

  async run({ interaction }: RunCommandParams) {
    const embed = constructEmbed({
      title: 'Shop',
      description:
        'Welcome to the shop! Here you can buy items to enhance your experience.',
      customType: 'info',
    });
    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId('cases')
        .setLabel('Show cases')
        .setStyle(ButtonStyle.Primary),
    );

    await interaction.reply({
      embeds: [embed],
      components: [row],
      ephemeral: true,
    });
    originalInteraction = interaction as RepliableInteraction;
  }
}

class ShowCases implements IFeature<ButtonInteraction> {
  name = 'cases';

  async run({ interaction }: RunFeatureParams<ButtonInteraction>) {
    const embed = constructEmbed({
      title: 'Cases',
      description:
        'Here are the available cases you can purchase. Each case contains a random item.',
      customType: 'info',
    });

    const cases = await CaseModel.find();
    if (!cases || cases.length === 0) {
      embed.setDescription('No cases available at the moment.');
      await interaction.reply({
        embeds: [embed],
        ephemeral: true,
      });
      return;
    }

    const caseDescriptions = cases
      .map((c) => `**${c.name}**: ${c.description} - Price: ${c.price} coins`)
      .join('\n');
    embed.setDescription(caseDescriptions);
    const row = new ActionRowBuilder<ButtonBuilder>();
    cases.forEach((c) => {
      row.addComponents(
        new ButtonBuilder()
          .setCustomId(`buy_case:${c.id}`)
          .setLabel(`Open ${c.name}`)
          .setStyle(ButtonStyle.Success),
      );
    });

    await interaction.deferUpdate();
    await originalInteraction.editReply({
      embeds: [embed],
      components: [row],
    });
  }
}

class BuyCase implements IFeature<ButtonInteraction> {
  name = 'buy_case';

  async run({ interaction }: RunFeatureParams<ButtonInteraction>) {
    const caseId = interaction.customId.split(':')[1];
    const caseDoc = await CaseModel.findById(caseId).populate<{
      items: (CaseItem & {
        item: Item;
      })[];
    }>({
      path: 'items.item',
    });
    if (!caseDoc) {
      await interaction.reply({
        content: 'Case not found.',
        ephemeral: true,
      });
      return;
    }
    let user = await UserModel.findOne({
      discordID: interaction.user.id,
    }).populate('inventory.item');
    if (!user) {
      user = await UserModel.create({
        discordID: interaction.user.id,
      });
      await user.save();
    }
    if (user.coins < caseDoc.price) {
      await interaction.reply({
        ephemeral: true,
        embeds: [
          constructEmbed({
            title: 'Insufficient Coins',
            description: `You need ${caseDoc.price} coins to buy this case, but you only have ${user.coins} coins.`,
            customType: 'error',
          }),
        ],
      });
      return;
    }
    user.coins -= caseDoc.price;
    const item =
      caseDoc.items[Math.floor(Math.random() * caseDoc.items.length)];
    const inventoryItem = user.inventory.find(
      (i) => item.item.id === i.item.id,
    );
    if (inventoryItem) {
      inventoryItem.quantity += 1;
    } else {
      user.inventory.push({
        item: item.item,
        quantity: 1,
      });
    }
    await user.save();
    await interaction.reply({
      ephemeral: true,
      embeds: [
        constructEmbed({
          title: 'Case opened',
          description: `You got ${item.item.name} from the case!`,
          customType: 'success',
        }),
      ],
    });
  }
}
