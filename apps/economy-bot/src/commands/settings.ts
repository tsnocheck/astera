import {
  constructEmbed,
  ICommand,
  IFeature,
  RunCommandParams,
  RunFeatureParams,
  RolesShopModel,
  UserModel,
} from '@lolz-bots/shared';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonInteraction,
  Guild,
  Message,
  ModalBuilder,
  ModalSubmitInteraction,
  StringSelectMenuBuilder,
  StringSelectMenuInteraction,
  TextInputBuilder,
} from 'discord.js';
import {
  ButtonStyle,
  TextInputStyle,
} from 'discord-api-types/v10';

// Вспомогательная функция для создания кнопок настроек роли
async function createRoleSettingsButtons(roleShopId: string, roleDoc: any, guild: Guild, ownerId: string, isOwner: boolean) {
  const member = await guild.members.fetch(ownerId).catch(() => null);
  const role = await guild.roles.fetch(roleDoc.roleId).catch(() => null);
  const hasRole = member && role ? member.roles.cache.has(role.id) : false;

  // Если пользователь не владелец, показываем только кнопку скрыть/вернуть роль
  if (!isOwner) {
    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`hide-role_${roleShopId}`)
        .setLabel(hasRole ? 'Скрыть роль' : 'Вернуть роль')
        .setStyle(ButtonStyle.Secondary)
    );
    return [row];
  }

  // Владелец видит все кнопки
  const row1 = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`change-name_${roleShopId}`)
      .setLabel('Изменить название')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(`change-price_${roleShopId}`)
      .setLabel('Изменить цену')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(`toggle-shop_${roleShopId}`)
      .setLabel(roleDoc.isActive ? 'Убрать из магазина' : 'Добавить в магазин')
      .setStyle(ButtonStyle.Secondary)
  );

  const row2 = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`hide-role_${roleShopId}`)
      .setLabel(hasRole ? 'Скрыть роль' : 'Вернуть роль')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`extend-role_${roleShopId}`)
      .setLabel('Продлить роль')
      .setStyle(ButtonStyle.Success)
  );

  return [row1, row2];
}

// Вспомогательная функция для обновления embed'а настроек роли
async function updateRoleSettingsEmbed(message: Message, roleShopId: string, guild: any) {
  const roleDoc = await RolesShopModel.findById(roleShopId);
  if (!roleDoc) return;

  const role = await guild?.roles.fetch(roleDoc.roleId);
  if (!role) return;

  const embed = constructEmbed({
    title: `Настройки роли ${role.name}`,
    description: `Цена: ${roleDoc.price} монет\nСтатус: ${roleDoc.isActive ? 'В магазине' : 'Скрыта из магазина'}\nКуплено: ${roleDoc.buiedNumber} раз\n\nДля обновления иконки используйте </update:1456999861215039549>`,
    customType: 'custom',
  });

  const row1 = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`change-name_${roleShopId}`)
      .setLabel('Сменить название')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(`change-price_${roleShopId}`)
      .setLabel('Сменить цену')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(`toggle-shop_${roleShopId}`)
      .setLabel(roleDoc.isActive ? 'Убрать из магазина' : 'Выложить в магазин')
      .setStyle(roleDoc.isActive ? ButtonStyle.Danger : ButtonStyle.Success)
  );

  const row2 = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`hide-role_${roleShopId}`)
      .setLabel('Скрыть роль')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`extend-role_${roleShopId}`)
      .setLabel('Продлить роль')
      .setStyle(ButtonStyle.Success)
  );

  await message.edit({
    embeds: [embed],
    components: [row1, row2],
  });
}

export default class Settings implements ICommand {
  name = 'role-manage';
  description = 'Manage your roles in the shop';
  
  features = [
    new SelectRoleSettings(),
    new ChangeName(),
    new ChangePrice(),
    new ToggleShop(),
    new HideRole(),
    new ExtendRole(),
    new SubmitChangeName(),
    new SubmitChangePrice(),
  ];

  async run({ interaction }: RunCommandParams) {
    await interaction.deferReply({ ephemeral: true });

    // Получаем роли, которыми владеет пользователь (создал)
    const ownedRoles = await RolesShopModel.find({ owner: interaction.user.id });
    
    // Получаем роли, которые пользователь купил
    const user = await UserModel.findOne({ discordID: interaction.user.id });
    const purchasedRoleIds = user?.roles?.map(r => r.toString()) || [];
    const purchasedRoles = await RolesShopModel.find({ _id: { $in: purchasedRoleIds } });

    // Объединяем все роли
    const allRoles = [...ownedRoles, ...purchasedRoles.filter(pr => !ownedRoles.find(or => or.id === pr.id))];

    if (allRoles.length === 0) {
      await interaction.editReply({
        embeds: [
          constructEmbed({
            description: 'У вас нет ролей!',
            customType: 'error',
          }),
        ],
      });
      return;
    }

    // Создаем select menu
    const options = [];
    for (const roleDoc of allRoles) {
      try {
        const role = await interaction.guild?.roles.fetch(roleDoc.roleId);
        const isOwner = roleDoc.owner === interaction.user.id;
        if (role) {
          options.push({
            label: role.name,
            description: `${isOwner ? '👑 Владелец' : '🛒 Куплено'} | Цена: ${roleDoc.price} | ${roleDoc.isActive ? 'В магазине' : 'Не в магазине'}`,
            value: roleDoc.id,
          });
        }
      } catch (error) {
        console.error(`Failed to fetch role ${roleDoc.roleId}:`, error);
      }
    }

    if (options.length === 0) {
      await interaction.editReply({
        embeds: [
          constructEmbed({
            description: 'Не удалось загрузить ваши роли!',
            customType: 'error',
          }),
        ],
      });
      return;
    }

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('select-role-settings')
      .setPlaceholder('Выберите роль для настройки')
      .addOptions(options);

    const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);

    await interaction.editReply({
      embeds: [
        constructEmbed({
          title: 'Настройки ролей',
          description: 'Выберите роль, которую хотите настроить:',
          customType: 'custom',
        }),
      ],
      components: [row],
    });
  }
}

class SelectRoleSettings implements IFeature<StringSelectMenuInteraction> {
  name = 'select-role-settings';

  async run({ interaction }: RunFeatureParams<StringSelectMenuInteraction>) {
    const roleShopId = interaction.values[0];
    
    const roleDoc = await RolesShopModel.findById(roleShopId);
    if (!roleDoc) {
      await interaction.update({
        embeds: [
          constructEmbed({
            description: 'Роль не найдена!',
            customType: 'error',
          }),
        ],
        components: [],
      });
      return;
    }

    // Проверка владельца
    const isOwner = roleDoc.owner === interaction.user.id;
    
    if (!isOwner) {
      // Проверяем, есть ли роль у пользователя в купленных
      const user = await UserModel.findOne({ discordID: interaction.user.id });
      const hasPurchased = user?.roles?.some(r => r.toString() === roleShopId);
      
      if (!hasPurchased) {
        await interaction.reply({
          embeds: [
            constructEmbed({
              description: 'Эта роль вам не принадлежит!',
              customType: 'error',
            }),
          ],
          ephemeral: true,
        });
        return;
      }
    }

    const role = await interaction.guild?.roles.fetch(roleDoc.roleId);
    if (!role) {
      await interaction.reply({
        embeds: [
          constructEmbed({
            description: 'Роль не найдена на сервере!',
            customType: 'error',
          }),
        ],
        ephemeral: true,
      });
      return;
    }

    const embed = constructEmbed({
      title: `${isOwner ? 'Настройки' : 'Управление'} роли ${role.name}`,
      description: isOwner 
        ? `Цена: ${roleDoc.price} монет\nСтатус: ${roleDoc.isActive ? 'В магазине' : 'Скрыта из магазина'}\nКуплено: ${roleDoc.buiedNumber} раз\nПродление: <t:${Math.floor(new Date(roleDoc.extensionDate).getTime() / 1000)}:R>\nСтоимость продления: 5000 монет (+30 дней)\n\nДля обновления иконки используйте </update:1456999861215039549>`
        : `Цена: ${roleDoc.price} монет\nСтатус: ${roleDoc.isActive ? 'В магазине' : 'Скрыта из магазина'}`,
      customType: 'custom',
    });

    if (!interaction.guild) return;

    const buttons = await createRoleSettingsButtons(roleShopId, roleDoc, interaction.guild, interaction.user.id, isOwner);

    await interaction.update({
      embeds: [embed],
      components: buttons,
    });
  }
}

class ChangeName implements IFeature<ButtonInteraction> {
  name = 'change-name';

  async run({ interaction }: RunFeatureParams<ButtonInteraction>) {
    const roleShopId = interaction.customId.split('_')[1];

    const modal = new ModalBuilder()
      .setCustomId(`submit-change-name_${roleShopId}`)
      .setTitle('Сменить название роли');

    const nameInput = new TextInputBuilder()
      .setCustomId('name')
      .setLabel('Новое название роли')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('Введите новое название')
      .setRequired(true)
      .setMinLength(1)
      .setMaxLength(100);

    const row = new ActionRowBuilder<TextInputBuilder>().addComponents(nameInput);
    modal.addComponents(row);

    await interaction.showModal(modal);
  }
}

class ChangePrice implements IFeature<ButtonInteraction> {
  name = 'change-price';

  async run({ interaction }: RunFeatureParams<ButtonInteraction>) {
    const roleShopId = interaction.customId.split('_')[1];

    const modal = new ModalBuilder()
      .setCustomId(`submit-change-price_${roleShopId}`)
      .setTitle('Сменить цену роли');

    const priceInput = new TextInputBuilder()
      .setCustomId('price')
      .setLabel('Новая цена роли')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('1000')
      .setRequired(true)
      .setMinLength(1)
      .setMaxLength(10);

    const row = new ActionRowBuilder<TextInputBuilder>().addComponents(priceInput);
    modal.addComponents(row);

    await interaction.showModal(modal);
  }
}

class ToggleShop implements IFeature<ButtonInteraction> {
  name = 'toggle-shop';

  async run({ interaction }: RunFeatureParams<ButtonInteraction>) {
    await interaction.deferReply({ ephemeral: true });
    
    const roleShopId = interaction.customId.split('_')[1];

    const roleDoc = await RolesShopModel.findById(roleShopId);
    if (!roleDoc || roleDoc.owner !== interaction.user.id) {
      await interaction.editReply({
        embeds: [
          constructEmbed({
            description: 'Роль не найдена или вы не являетесь владельцем!',
            customType: 'error',
          }),
        ],
      });
      return;
    }

    roleDoc.isActive = !roleDoc.isActive;
    await roleDoc.save();

    // Обновляем embed через webhook
    if (interaction.guild) {
      const role = await interaction.guild.roles.fetch(roleDoc.roleId);
      const embed = constructEmbed({
        title: `Настройки роли ${role?.name || 'Неизвестно'}`,
        description: `**ID роли:** ${roleDoc.roleId}\n**Цена:** ${roleDoc.price} монет\n**Куплено:** ${roleDoc.buiedNumber} раз\n**В магазине:** ${roleDoc.isActive ? 'Да' : 'Нет'}\n\nДля обновления иконки используйте </update:1456999861215039549>`,
        customType: 'custom',
      });

      const buttons = await createRoleSettingsButtons(roleShopId, roleDoc, interaction.guild, interaction.user.id, true);

      await interaction.webhook.editMessage(interaction.message!.id, {
        embeds: [embed],
        components: buttons,
      });
    }

    await interaction.editReply({
      embeds: [
        constructEmbed({
          description: roleDoc.isActive 
            ? '✅ Роль успешно выложена в магазин!' 
            : '✅ Роль успешно убрана из магазина!',
          customType: 'success',
        }),
      ],
    });
  }
}

class HideRole implements IFeature<ButtonInteraction> {
  name = 'hide-role';

  async run({ interaction }: RunFeatureParams<ButtonInteraction>) {
    await interaction.deferReply({ ephemeral: true });
    
    const roleShopId = interaction.customId.split('_')[1];

    const roleDoc = await RolesShopModel.findById(roleShopId);
    if (!roleDoc) {
      await interaction.editReply({
        embeds: [
          constructEmbed({
            description: 'Роль не найдена!',
            customType: 'error',
          }),
        ],
      });
      return;
    }

    const isOwner = roleDoc.owner === interaction.user.id;
    
    // Проверяем, есть ли доступ к этой роли
    if (!isOwner) {
      const user = await UserModel.findOne({ discordID: interaction.user.id });
      const hasPurchased = user?.roles?.some(r => r.toString() === roleShopId);
      if (!hasPurchased) {
        await interaction.editReply({
          embeds: [
            constructEmbed({
              description: 'Эта роль вам не принадлежит!',
              customType: 'error',
            }),
          ],
        });
        return;
      }
    }

    const role = await interaction.guild?.roles.fetch(roleDoc.roleId);
    const member = await interaction.guild?.members.fetch(interaction.user.id);
    
    if (role && member && interaction.guild) {
      const hasRole = member.roles.cache.has(role.id);
      
      if (hasRole) {
        // Удаляем роль
        await member.roles.remove(role);
        
        // Обновляем embed
        const embed = constructEmbed({
          title: `${isOwner ? 'Настройки' : 'Управление'} роли ${role.name}`,
          description: isOwner 
            ? `**ID роли:** ${roleDoc.roleId}\n**Цена:** ${roleDoc.price} монет\n**Куплено:** ${roleDoc.buiedNumber} раз\n**В магазине:** ${roleDoc.isActive ? 'Да' : 'Нет'}\n\nДля обновления иконки используйте </update:1456999861215039549>`
            : `**Цена:** ${roleDoc.price} монет`,
          customType: 'custom',
        });

        const buttons = await createRoleSettingsButtons(roleShopId, roleDoc, interaction.guild, interaction.user.id, isOwner);

        await interaction.webhook.editMessage(interaction.message!.id, {
          embeds: [embed],
          components: buttons,
        });
        
        await interaction.editReply({
          embeds: [
            constructEmbed({
              description: '✅ Роль успешно удалена!',
              customType: 'success',
            }),
          ],
        });
      } else {
        // Возвращаем роль
        await member.roles.add(role);
        
        // Обновляем embed
        const embed = constructEmbed({
          title: `${isOwner ? 'Настройки' : 'Управление'} роли ${role.name}`,
          description: isOwner 
            ? `**ID роли:** ${roleDoc.roleId}\n**Цена:** ${roleDoc.price} монет\n**Куплено:** ${roleDoc.buiedNumber} раз\n**В магазине:** ${roleDoc.isActive ? 'Да' : 'Нет'}\n\nДля обновления иконки используйте </update:1456999861215039549>`
            : `**Цена:** ${roleDoc.price} монет`,
          customType: 'custom',
        });

        const buttons = await createRoleSettingsButtons(roleShopId, roleDoc, interaction.guild, interaction.user.id, isOwner);

        await interaction.webhook.editMessage(interaction.message!.id, {
          embeds: [embed],
          components: buttons,
        });
        
        await interaction.editReply({
          embeds: [
            constructEmbed({
              description: '✅ Роль успешно возвращена!',
              customType: 'success',
            }),
          ],
        });
      }
    }
  }
}

class ExtendRole implements IFeature<ButtonInteraction> {
  name = 'extend-role';

  async run({ interaction }: RunFeatureParams<ButtonInteraction>) {
    await interaction.deferReply({ ephemeral: true });
    
    const roleShopId = interaction.customId.split('_')[1];

    const roleDoc = await RolesShopModel.findById(roleShopId);
    if (!roleDoc || roleDoc.owner !== interaction.user.id) {
      await interaction.editReply({
        embeds: [
          constructEmbed({
            description: 'Роль не найдена или вы не являетесь владельцем!',
            customType: 'error',
          }),
        ],
      });
      return;
    }

    // Проверяем баланс
    let user = await UserModel.findOne({ discordID: interaction.user.id });
    if (!user) {
      user = await UserModel.create({
        discordID: interaction.user.id,
        level: 1,
      });
      await user.save();
    }

    if (user.coins < 5000) {
      await interaction.editReply({
        embeds: [
          constructEmbed({
            description: `Недостаточно средств! Для продления роли нужно 5000 монет. У вас: ${user.coins}`,
            customType: 'error',
          }),
        ],
      });
      return;
    }

    // Списываем 5000 монет
    user.coins -= 5000;
    await user.save();

    // Добавляем 30 дней к дате продления
    const extensionDate = new Date(roleDoc.extensionDate);
    extensionDate.setDate(extensionDate.getDate() + 30);
    roleDoc.extensionDate = extensionDate;
    await roleDoc.save();

    // Обновляем embed
    if (interaction.guild) {
      const role = await interaction.guild.roles.fetch(roleDoc.roleId);
      const embed = constructEmbed({
        title: `Настройки роли ${role?.name || 'Неизвестно'}`,
        description: `**ID роли:** ${roleDoc.roleId}\n**Цена:** ${roleDoc.price} монет\n**Куплено:** ${roleDoc.buiedNumber} раз\n**В магазине:** ${roleDoc.isActive ? 'Да' : 'Нет'}\n**Продление:** <t:${Math.floor(new Date(roleDoc.extensionDate).getTime() / 1000)}:R>\n**Стоимость продления:** 5000 монет (+30 дней)\n\nДля обновления иконки используйте </update:1456999861215039549>`,
        customType: 'custom',
      });

      const buttons = await createRoleSettingsButtons(roleShopId, roleDoc, interaction.guild, interaction.user.id, true);

      await interaction.webhook.editMessage(interaction.message!.id, {
        embeds: [embed],
        components: buttons,
      });
    }

    await interaction.editReply({
      embeds: [
        constructEmbed({
          description: '✅ Роль успешно продлена на 30 дней!',
          customType: 'success',
        }),
      ],
    });
  }
}

class SubmitChangeName implements IFeature<ModalSubmitInteraction> {
  name = 'submit-change-name';

  async run({ interaction }: RunFeatureParams<ModalSubmitInteraction>) {
    await interaction.deferReply({ ephemeral: true });
    
    const roleShopId = interaction.customId.split('_')[1];
    const newName = interaction.fields.getTextInputValue('name');

    const roleDoc = await RolesShopModel.findById(roleShopId);
    if (!roleDoc || roleDoc.owner !== interaction.user.id) {
      await interaction.reply({
        embeds: [
          constructEmbed({
            description: 'Роль не найдена или вы не являетесь владельцем!',
            customType: 'error',
          }),
        ],
        ephemeral: true,
      });
      return;
    }

    try {
      const role = await interaction.guild?.roles.fetch(roleDoc.roleId);
      if (role) {
        await role.setName(newName);
      }

      // Обновляем embed через webhook
      if (interaction.guild) {
        const updatedRole = await interaction.guild.roles.fetch(roleDoc.roleId);
        const embed = constructEmbed({
          title: `Настройки роли ${updatedRole?.name || 'Неизвестно'}`,
          description: `**ID роли:** ${roleDoc.roleId}\n**Цена:** ${roleDoc.price} монет\n**Куплено:** ${roleDoc.buiedNumber} раз\n**В магазине:** ${roleDoc.isActive ? 'Да' : 'Нет'}\n\nДля обновления иконки используйте </update:1456999861215039549>`,
          customType: 'custom',
        });

        const buttons = await createRoleSettingsButtons(roleShopId, roleDoc, interaction.guild, interaction.user.id, true);

        await interaction.webhook.editMessage(interaction.message!.id, {
          embeds: [embed],
          components: buttons,
        });
      }

      await interaction.editReply({
        embeds: [
          constructEmbed({
            description: `✅ Название роли успешно изменено на **${newName}**!`,
            customType: 'success',
          }),
        ],
      });
    } catch (error) {
      console.error('Error changing role name:', error);
      await interaction.editReply({
        embeds: [
          constructEmbed({
            description: 'Произошла ошибка при изменении названия роли.',
            customType: 'error',
          }),
        ],
      });
    }
  }
}

class SubmitChangePrice implements IFeature<ModalSubmitInteraction> {
  name = 'submit-change-price';

  async run({ interaction }: RunFeatureParams<ModalSubmitInteraction>) {
    await interaction.deferReply({ ephemeral: true });
    
    const roleShopId = interaction.customId.split('_')[1];
    const priceStr = interaction.fields.getTextInputValue('price');
    const price = parseInt(priceStr);

    if (isNaN(price) || price < 1) {
      await interaction.editReply({
        embeds: [
          constructEmbed({
            description: 'Укажите корректную цену (положительное число)!',
            customType: 'error',
          }),
        ],
      });
      return;
    }

    const roleDoc = await RolesShopModel.findById(roleShopId);
    if (!roleDoc || roleDoc.owner !== interaction.user.id) {
      await interaction.editReply({
        embeds: [
          constructEmbed({
            description: 'Роль не найдена или вы не являетесь владельцем!',
            customType: 'error',
          }),
        ],
      });
      return;
    }

    roleDoc.price = price;
    await roleDoc.save();

    // Обновляем embed через webhook
    if (interaction.guild) {
      const role = await interaction.guild.roles.fetch(roleDoc.roleId);
      const embed = constructEmbed({
        title: `Настройки роли ${role?.name || 'Неизвестно'}`,
        description: `**ID роли:** ${roleDoc.roleId}\n**Цена:** ${roleDoc.price} монет\n**Куплено:** ${roleDoc.buiedNumber} раз\n**В магазине:** ${roleDoc.isActive ? 'Да' : 'Нет'}\n\nДля обновления иконки используйте </update:1456999861215039549>`,
        customType: 'custom',
      });

      const buttons = await createRoleSettingsButtons(roleShopId, roleDoc, interaction.guild, interaction.user.id, true);

      await interaction.webhook.editMessage(interaction.message!.id, {
        embeds: [embed],
        components: buttons,
      });
    }

    await interaction.editReply({
      embeds: [
        constructEmbed({
          description: `Цена роли изменена на **${price}** монет!`,
          customType: 'success',
        }),
      ],
    });
  }
}
