import {
  constructEmbed,
  ICommand,
  RunCommandParams,
  RolesShopModel,
} from '@lolz-bots/shared';
import {
  ApplicationCommandOptionData,
} from 'discord.js';
import { ApplicationCommandOptionType } from 'discord-api-types/v10';

export default class Update implements ICommand {
  name = 'update';
  description = 'Обновить иконку личной роли';
  options: ApplicationCommandOptionData[] = [
    {
      name: 'role',
      description: 'Роль для обновления иконки',
      type: ApplicationCommandOptionType.Role,
      required: true,
    },
    {
      name: 'icon',
      description: 'Файл иконки для роли',
      type: ApplicationCommandOptionType.Attachment,
      required: true,
    },
  ];

  async run({ interaction }: RunCommandParams) {
    await interaction.deferReply({ ephemeral: true });

    const role = interaction.options.getRole('role');
    const attachment = interaction.options.getAttachment('icon');

    if (!role || !attachment) {
      await interaction.editReply({
        embeds: [
          constructEmbed({
            description: 'Необходимо указать роль и файл иконки!',
            customType: 'error',
          }),
        ],
      });
      return;
    }

    // Проверяем, что файл является изображением
    const validImageTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'];
    if (!attachment.contentType || !validImageTypes.includes(attachment.contentType)) {
      await interaction.editReply({
        embeds: [
          constructEmbed({
            description: 'Файл должен быть изображением (PNG, JPEG, GIF, WEBP)!',
            customType: 'error',
          }),
        ],
      });
      return;
    }

    // Проверяем размер файла (максимум 256KB для иконок ролей)
    if (attachment.size > 256 * 1024) {
      await interaction.editReply({
        embeds: [
          constructEmbed({
            description: 'Размер файла не должен превышать 256 КБ!',
            customType: 'error',
          }),
        ],
      });
      return;
    }

    // Проверяем, является ли пользователь владельцем роли в БД
    const roleDoc = await RolesShopModel.findOne({ roleId: role.id });

    if (!roleDoc) {
      await interaction.editReply({
        embeds: [
          constructEmbed({
            description: 'Эта роль не найдена в магазине ролей!',
            customType: 'error',
          }),
        ],
      });
      return;
    }

    if (roleDoc.owner !== interaction.user.id) {
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

    try {
      // Получаем роль из гильдии
      const guildRole = await interaction.guild?.roles.fetch(role.id);
      
      if (!guildRole) {
        await interaction.editReply({
          embeds: [
            constructEmbed({
              description: 'Роль не найдена на сервере!',
              customType: 'error',
            }),
          ],
        });
        return;
      }

      // Обновляем иконку роли
      await guildRole.setIcon(attachment.url);

      await interaction.editReply({
        embeds: [
          constructEmbed({
            description: `✅ Иконка роли ${guildRole.name} успешно обновлена!`,
            customType: 'success',
          }),
        ],
      });
    } catch (error) {
      console.error('Error updating role icon:', error);
      await interaction.editReply({
        embeds: [
          constructEmbed({
            description: 'Произошла ошибка при обновлении иконки роли. Убедитесь, что файл соответствует требованиям Discord.',
            customType: 'error',
          }),
        ],
      });
    }
  }
}
