import {
  constructEmbed,
  ICommand,
  IFeature,
  RunCommandParams,
  RunFeatureParams,
  UserModel,
  RolesShopModel,
} from '@lolz-bots/shared';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonInteraction,
  ChatInputCommandInteraction,
  RepliableInteraction,
} from 'discord.js';
import { ButtonStyle } from 'discord-api-types/v10';

let originalInteraction: RepliableInteraction;

export default class Shop implements ICommand {
  name = 'shop';
  description = 'View the shop to buy roles';
  features = [new ShowRoles(), new BuyRole(), new RolesPageNav()];

  async run({ interaction, client }: RunCommandParams) {
    originalInteraction = interaction as RepliableInteraction;
    
    // Сразу показываем роли
    const showRoles = new ShowRoles();
    await showRoles.run({ interaction: interaction as any, client });
  }
}

class ShowRoles implements IFeature<ButtonInteraction> {
  name = 'roles';

  async run({ interaction }: RunFeatureParams<ButtonInteraction | ChatInputCommandInteraction>) {
    const customId = 'customId' in interaction ? interaction.customId : 'roles_1';
    const page = parseInt(customId.split('_')[1]) || 1;
    const rolesPerPage = 5;
    
    // Фильтруем только активные роли
    const allRoles = await RolesShopModel.find({ isActive: true });
    
    if (!allRoles || allRoles.length === 0) {
      const embed = constructEmbed({
        title: 'Магазин ролей',
        description: 'В данный момент нет доступных ролей для покупки.',
        customType: 'custom',
      });
      
      if (interaction.isButton()) {
        await interaction.deferUpdate();
        await originalInteraction.editReply({
          embeds: [embed],
          components: [],
        });
      } else {
        await interaction.reply({
          embeds: [embed],
          ephemeral: true,
        });
      }
      return;
    }

    const totalPages = Math.ceil(allRoles.length / rolesPerPage);
    const startIndex = (page - 1) * rolesPerPage;
    const endIndex = startIndex + rolesPerPage;
    const currentRoles = allRoles.slice(startIndex, endIndex);

    let roleDescriptions = '';
    const buyButtons: ButtonBuilder[] = [];

    for (let i = 0; i < currentRoles.length; i++) {
      const roleDoc = currentRoles[i];
      const roleNumber = i + 1;
      try {
        const role = await interaction.guild?.roles.fetch(roleDoc.roleId);
        if (role) {
          roleDescriptions += `**${roleNumber}.** <@&${role.id}>\nВладелец: <@${roleDoc.owner}>\nЦена: ${roleDoc.price} монет\nКуплено: ${roleDoc.buiedNumber} раз\n\n`;
          buyButtons.push(
            new ButtonBuilder()
              .setCustomId(`buy-role_${roleDoc.id}`)
              .setLabel(`${roleNumber}`)
              .setStyle(ButtonStyle.Success)
          );
        }
      } catch (error) {
        console.error(`Failed to fetch role ${roleDoc.roleId}:`, error);
      }
    }

    const embed = constructEmbed({
      title: 'Магазин ролей',
      description: roleDescriptions || 'Нет ролей для отображения.',
      customType: 'custom',
    });

    embed.setFooter({ text: `Страница ${page}/${totalPages}` });

    const rows: ActionRowBuilder<ButtonBuilder>[] = [];
    
    // Добавляем кнопки покупки (максимум 5 в ряд)
    for (let i = 0; i < buyButtons.length; i += 5) {
      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        ...buyButtons.slice(i, i + 5)
      );
      rows.push(row);
    }

    // Добавляем кнопки навигации
    const navRow = new ActionRowBuilder<ButtonBuilder>();
    
    navRow.addComponents(
      new ButtonBuilder()
        .setCustomId(`roles_${page - 1}`)
        .setLabel('◀ Назад')
        .setStyle(ButtonStyle.Primary)
        .setDisabled(page <= 1)
    );
    
    navRow.addComponents(
      new ButtonBuilder()
        .setCustomId(`roles_${page + 1}`)
        .setLabel('Вперед ▶')
        .setStyle(ButtonStyle.Primary)
        .setDisabled(page >= totalPages)
    );

    rows.push(navRow);

    if (interaction.isButton()) {
      await interaction.deferUpdate();
      await originalInteraction.editReply({
        embeds: [embed],
        components: rows,
      });
    } else {
      await interaction.reply({
        embeds: [embed],
        components: rows,
        ephemeral: true,
      });
    }
  }
}

class BuyRole implements IFeature<ButtonInteraction> {
  name = 'buy-role';

  async run({ interaction }: RunFeatureParams<ButtonInteraction>) {
    const roleShopId = interaction.customId.split('_')[1];
    
    const roleDoc = await RolesShopModel.findById(roleShopId);
    if (!roleDoc || !roleDoc.isActive) {
      await interaction.reply({
        embeds: [
          constructEmbed({
            description: 'Роль не найдена или неактивна.',
            customType: 'error',
          }),
        ],
        ephemeral: true,
      });
      return;
    }

    let user = await UserModel.findOne({ discordID: interaction.user.id });
    if (!user) {
      user = await UserModel.create({
        discordID: interaction.user.id,
        level: 1,
      });
      await user.save();
    }

    if (user.coins < roleDoc.price) {
      await interaction.reply({
        embeds: [
          constructEmbed({
            description: `Недостаточно средств! Нужно ${roleDoc.price} монет, у вас: ${user.coins}`,
            customType: 'error',
          }),
        ],
        ephemeral: true,
      });
      return;
    }

    const role = await interaction.guild?.roles.fetch(roleDoc.roleId);
    if (!role) {
      await interaction.reply({
        embeds: [
          constructEmbed({
            description: 'Роль не найдена на сервере.',
            customType: 'error',
          }),
        ],
        ephemeral: true,
      });
      return;
    }

    const member = await interaction.guild?.members.fetch(interaction.user.id);
    if (!member) {
      await interaction.reply({
        embeds: [
          constructEmbed({
            description: 'Не удалось найти вас на сервере.',
            customType: 'error',
          }),
        ],
        ephemeral: true,
      });
      return;
    }

    if (member.roles.cache.has(role.id)) {
      await interaction.reply({
        embeds: [
          constructEmbed({
            description: 'У вас уже есть эта роль!',
            customType: 'error',
          }),
        ],
        ephemeral: true,
      });
      return;
    }

    // Проверяем лимит ролей (25 штук)
    const userRolesCount = user.roles?.length || 0;
    if (userRolesCount >= 25) {
      await interaction.reply({
        embeds: [
          constructEmbed({
            description: 'Вы достигли лимита ролей! Максимум 25 ролей на пользователя.',
            customType: 'error',
          }),
        ],
        ephemeral: true,
      });
      return;
    }

    try {
      // Списываем монеты
      user.coins -= roleDoc.price;
      
      // Добавляем роль в список купленных ролей пользователя
      if (!user.roles) {
        user.roles = [];
      }
      user.roles.push(roleDoc as any);
      
      await user.save();

      // Выдаем роль
      await member.roles.add(role);

      // Начисляем владельцу роли 90% от цены
      const ownerProfit = Math.floor(roleDoc.price * 0.9);
      let ownerProfile = await UserModel.findOne({ discordID: roleDoc.owner });
      if (!ownerProfile) {
        ownerProfile = await UserModel.create({
          discordID: roleDoc.owner,
          level: 1,
        });
      }
      ownerProfile.coins += ownerProfit;
      roleDoc.totalEarnings += ownerProfit;
      await ownerProfile.save();

      // Обновляем статистику
      roleDoc.buiedNumber += 1;
      await roleDoc.save();

      await interaction.reply({
        embeds: [
          constructEmbed({
            description: `✅ Вы успешно купили роль **${role.name}** за ${roleDoc.price} монет!`,
            customType: 'success',
          }),
        ],
        ephemeral: true,
      });
    } catch (error) {
      console.error('Error buying role:', error);
      await interaction.reply({
        embeds: [
          constructEmbed({
            description: 'Произошла ошибка при покупке роли.',
            customType: 'error',
          }),
        ],
        ephemeral: true,
      });
    }
  }
}

class RolesPageNav implements IFeature<ButtonInteraction> {
  name = 'roles';

  async run({ interaction, client }: RunFeatureParams<ButtonInteraction>) {
    const showRoles = new ShowRoles();
    await showRoles.run({ interaction, client });
  }
}
