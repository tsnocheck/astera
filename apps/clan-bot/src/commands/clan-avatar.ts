import {
  ICommand,
  RunCommandParams,
  constructEmbed,
  ClanModel,
} from '@lolz-bots/shared';
import { ApplicationCommandOptionData, ApplicationCommandOptionType } from 'discord.js';

export default class ClanAvatarCommand implements ICommand {
  name = 'clan-avatar';
  description = 'Изменить аватарку клана';
  options: ApplicationCommandOptionData[] = [
    {
      name: 'image',
      description: 'Загрузите изображение для аватарки клана',
      type: ApplicationCommandOptionType.Attachment,
      required: true,
    },
  ];

  async run({ interaction }: RunCommandParams) {
    const attachment = interaction.options.getAttachment('image', true);

    // Находим клан, где пользователь овнер
    const clan = await ClanModel.findOne({ owner: interaction.user.id });

    if (!clan) {
      return interaction.reply({
        embeds: [
          constructEmbed({
            title: '❌ Ошибка',
            description: 'Вы не являетесь овнером клана',
            customType: 'error',
          }),
        ],
        ephemeral: true,
      });
    }

    // Проверяем, что это изображение
    const validImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!attachment.contentType || !validImageTypes.includes(attachment.contentType)) {
      return interaction.reply({
        embeds: [
          constructEmbed({
            title: '❌ Ошибка',
            description: 'Файл должен быть изображением (jpg, jpeg, png, gif, webp)',
            customType: 'error',
          }),
        ],
        ephemeral: true,
      });
    }

    // Проверяем размер файла (макс 8МБ)
    if (attachment.size > 8 * 1024 * 1024) {
      return interaction.reply({
        embeds: [
          constructEmbed({
            title: '❌ Ошибка',
            description: 'Размер файла не должен превышать 8 МБ',
            customType: 'error',
          }),
        ],
        ephemeral: true,
      });
    }

    // Обновляем аватарку используя URL из attachment
    await ClanModel.updateOne(
      { _id: clan._id },
      { $set: { avatarURL: attachment.url } }
    );

    const embed = constructEmbed({
      title: '✅ Успешно',
      description: `Аватарка клана **${clan.name}** обновлена`,
      customType: 'success',
      thumbnail: { url: attachment.url },
    });

    return interaction.reply({
      embeds: [embed],
      ephemeral: true,
    });
  }
}
