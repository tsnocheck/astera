import {
  constructEmbed,
  ICommand,
  RunCommandParams,
  RolesShopModel,
  UserModel,
} from '@lolz-bots/shared';
import {
  ApplicationCommandOptionData,
  PermissionFlagsBits,
} from 'discord.js';
import {
  ApplicationCommandOptionType,
} from 'discord-api-types/v10';

export default class Create implements ICommand {
  name = 'create';
  description = 'Create a new role in the shop';
  defaultMemberPermissions = PermissionFlagsBits.Administrator;
  options: ApplicationCommandOptionData[] = [
    {
      name: 'name',
      description: 'Role name',
      type: ApplicationCommandOptionType.String,
      required: true,
    },
    {
      name: 'color',
      description: 'Role color in HEX format (e.g., #FF5733)',
      type: ApplicationCommandOptionType.String,
      required: true,
    },
    {
      name: 'price',
      description: 'Role price in the shop',
      type: ApplicationCommandOptionType.Integer,
      required: true,
      minValue: 1,
    },
  ];

  async run({ interaction }: RunCommandParams) {
    await interaction.deferReply({ ephemeral: true });

    const name = interaction.options.getString('name', true);
    const colorHex = interaction.options.getString('color', true);
    const price = interaction.options.getInteger('price', true);

    // Проверка баланса пользователя
    let user = await UserModel.findOne({ discordID: interaction.user.id });
    if (!user) {
      user = await UserModel.create({
        discordID: interaction.user.id,
        level: 1,
      });
      await user.save();
    }

    if (user.coins < 10000) {
      await interaction.editReply({
        embeds: [
          constructEmbed({
            description: `Недостаточно средств для создания роли! Требуется 10 000 монет. У вас: ${user.coins}`,
            customType: 'error',
          }),
        ],
      });
      return;
    }

    // Проверка формата HEX
    const hexRegex = /^#[0-9A-Fa-f]{6}$/;
    if (!hexRegex.test(colorHex)) {
      await interaction.editReply({
        embeds: [
          constructEmbed({
            description: 'Неверный формат цвета! Используйте HEX формат (например, #FF5733)',
            customType: 'error',
          }),
        ],
      });
      return;
    }

    if (!interaction.guild) {
      await interaction.editReply({
        embeds: [
          constructEmbed({
            description: 'Эта команда может быть использована только на сервере!',
            customType: 'error',
          }),
        ],
      });
      return;
    }

    try {
      // Списываем 10 000 монет
      user.coins -= 10000;
      await user.save();

      // Создаем роль на сервере
      const role = await interaction.guild.roles.create({
        name: name,
        color: colorHex as `#${string}`,
        reason: `Role shop creation by ${interaction.user.username}`,
      });

      // Сохраняем в базу данных
      const extensionDate = new Date();
      extensionDate.setDate(extensionDate.getDate() + 30); // +30 дней

      await RolesShopModel.create({
        owner: interaction.user.id,
        roleId: role.id,
        price: price,
        buiedNumber: 0,
        isActive: true,
        extensionDate: extensionDate,
      });

      await interaction.editReply({
        embeds: [
          constructEmbed({
            description: `✅ Роль **${name}** успешно создана и добавлена в магазин!\nЦвет: ${colorHex}\nЦена: ${price} монет\nID роли: ${role.id}\nСписано: 10 000 монет`,
            customType: 'success',
          }),
        ],
      });
    } catch (error) {
      console.error('Error creating role:', error);
      await interaction.editReply({
        embeds: [
          constructEmbed({
            description: 'Произошла ошибка при создании роли. Убедитесь, что у бота есть права на управление ролями.',
            customType: 'error',
          }),
        ],
      });
    }
  }
}
