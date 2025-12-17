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
      title: 'Магазин',
      description:
        'Добро пожаловать в магазин! Здесь вы можете приобрести предметы.',
      customType: 'info',
    });
    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId('cases')
        .setLabel('Показать кейсы')
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
      title: 'Кейсы',
      description:
        'Доступные кейсы для покупки. Каждый кейс содержит случайный предмет.',
      customType: 'info',
    });

    const cases = await CaseModel.find();
    if (!cases || cases.length === 0) {
      embed.setDescription('В данный момент нет доступных кейсов.');
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
          .setCustomId(`buy-case_${c.id}`)
          .setLabel(`Открыть ${c.name}`)
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
  name = 'buy-case';

  async run({ interaction }: RunFeatureParams<ButtonInteraction>) {
    const caseId = interaction.customId.split('_')[1];
    const caseDoc = await CaseModel.findById(caseId).populate<{
      items: (CaseItem & {
        item: Item;
      })[];
    }>({
      path: 'items.item',
    });
    if (!caseDoc) {
      await interaction.reply({
        content: 'Кейс не найден.',
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
            title: 'Недостаточно монет',
            description: `Для покупки этого кейса нужно ${caseDoc.price} монет, а у вас только ${user.coins} монет.`,
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
