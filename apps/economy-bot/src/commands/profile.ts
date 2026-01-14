import {
  ICommand,
  RunCommandParams,
  UserModel,
  MarryModel,
  ClanModel,
  logger,
} from '@lolz-bots/shared';
import {
  ApplicationCommandOptionData,
  AttachmentBuilder,
} from 'discord.js';
import {
  ApplicationCommandOptionType,
} from 'discord-api-types/v10';
import { createCanvas, loadImage, GlobalFonts } from '@napi-rs/canvas';
import { readFile } from 'fs/promises';
import { join } from 'path';

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

  async run({ interaction }: RunCommandParams) {
    await interaction.deferReply();
    
    const user = interaction.options.getUser('user') || interaction.user;

    let userProfile = await UserModel.findOne({ discordID: user.id });
    if (!userProfile) {
      userProfile = await UserModel.create({
        discordID: user.id,
        level: 1,
      });
      await userProfile.save();
    }

    const avatarURL = user.displayAvatarURL({ extension: 'png', size: 512 });
    const guildName = interaction.guild?.name;
    
    // Проверяем наличие брака
    const marriage = await MarryModel.findOne({
      $or: [{ user1: user.id }, { user2: user.id }],
    });
    
    let partnerUser = null;
    if (marriage) {
      const partnerId = marriage.user1 === user.id ? marriage.user2 : marriage.user1;
      try {
        partnerUser = await interaction.client.users.fetch(partnerId);
      } catch (error) {
        console.error('Failed to fetch partner user:', error);
      }
    }

    // Проверяем наличие клана
    const clan = await ClanModel.findOne({ 'users.userID': user.id });
    
    try {
      // Получаем топ по онлайну
      const allUsers = await UserModel.find({}).sort({ online: -1 }).exec();
      const topPosition = allUsers.findIndex((u) => u.discordID === user.id) + 1;

      // Canvas dimensions (half of original for faster rendering)
      const width = 960;
      const height = 472;

      // Регистрируем шрифт
      GlobalFonts.registerFromPath(join(__dirname, '../etc/arial.ttf'), 'Arial');

      const canvas = createCanvas(width, height);
      const ctx = canvas.getContext('2d');

      // Загружаем фон
      try {
        const background = await readFile(join(__dirname, '../etc/profile.png'));
        const backgroundImage = await loadImage(background);
        ctx.drawImage(backgroundImage, 0, 0, width, height);
      } catch (bgError) {
        console.error('Background load error:', bgError);
        // Черный фон если фон не загрузился
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, width, height);
      }

      try {
        const avatar = await loadImage(avatarURL);
        const avatarSize = 130;
        const avatarX = 480;
        const avatarY = 78;
        
        // Создаем круглую маску для аватарки
        ctx.save();
        ctx.beginPath();
        ctx.arc(avatarX, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2, true);
        ctx.closePath();
        ctx.clip();
        
        ctx.drawImage(avatar, avatarX - avatarSize / 2, avatarY, avatarSize, avatarSize);
        ctx.restore();
      } catch (avatarError) {
        console.error('Avatar load error:', avatarError);
      }

      // Рисуем аватарку партнёра или текст "не в отношениях"
      if (partnerUser) {
        try {
          const partnerAvatarURL = partnerUser.displayAvatarURL({ extension: 'png', size: 256 });
          const partnerAvatar = await loadImage(partnerAvatarURL);
          const partnerAvatarSize = 80;
          const partnerAvatarX = 152;
          const partnerAvatarY = 103;
          
          // Создаем круглую маску для аватарки партнёра
          ctx.save();
          ctx.beginPath();
          ctx.arc(partnerAvatarX, partnerAvatarY + partnerAvatarSize / 2, partnerAvatarSize / 2, 0, Math.PI * 2, true);
          ctx.closePath();
          ctx.clip();
          
          ctx.drawImage(partnerAvatar, partnerAvatarX - partnerAvatarSize / 2, partnerAvatarY, partnerAvatarSize, partnerAvatarSize);
          ctx.restore();

          ctx.fillStyle = '#ffffff';
          ctx.font = '20px Arial';
          ctx.textAlign = 'left';
          const displayName = partnerUser.username.length > 10 
            ? partnerUser.username.substring(0, 9) + '...' 
            : partnerUser.username;
          ctx.fillText(displayName, 215, 140);
        } catch (partnerAvatarError) {
          logger.error('Partner avatar load error:', partnerAvatarError);
        }
      } else {
        ctx.fillStyle = '#ffffff';
        ctx.font = '20px Arial';
        ctx.textAlign = 'left';
        ctx.fillText('Пары нет', 215, 140);
      }

      // Клан
      if (clan) {
        // Рисуем аватарку клана если есть
        if (clan.avatarURL) {
          try {
            const clanAvatar = await loadImage(clan.avatarURL);
            const clanAvatarSize = 80;
            const clanAvatarX = 678;
            const clanAvatarY = 103;
            
            // Создаем круглую маску для аватарки клана
            ctx.save();
            ctx.beginPath();
            ctx.arc(clanAvatarX, clanAvatarY + clanAvatarSize / 2, clanAvatarSize / 2, 0, Math.PI * 2, true);
            ctx.closePath();
            ctx.clip();
            
            ctx.drawImage(clanAvatar, clanAvatarX - clanAvatarSize / 2, clanAvatarY, clanAvatarSize, clanAvatarSize);
            ctx.restore();
          } catch (clanAvatarError) {
            logger.error('Clan avatar load error:', clanAvatarError);
          }
        }

        ctx.fillStyle = '#ffffff';
        ctx.font = '20px Arial';
        ctx.textAlign = 'left';
        const displayClanName = clan.name.length > 10 
          ? clan.name.substring(0, 9) + '...' 
          : clan.name;
        ctx.fillText(displayClanName, 735, 140);
      } else {
        ctx.fillStyle = '#ffffff';
        ctx.font = '20px Arial';
        ctx.textAlign = 'left';
        ctx.fillText('Клана нет', 740, 140);
      }

      // Уровень
      ctx.font = 'bold 28px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(`${userProfile.level}`, 275, 340);
      
      // Топ
      ctx.font = 'bold 26px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(`${topPosition}`, 685, 340);

      // Юзернейм
      ctx.font = 'bold 32px Arial';
      ctx.textAlign = 'center';
      const displayUsername = user.username.length > 12 
        ? user.username.substring(0, 12) + '...' 
        : user.username;
      ctx.fillText(displayUsername, 485, 250);

      ctx.fillStyle = '#7b78ff';

      // Баланс
      ctx.font = 'bold 20px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(`${userProfile.coins}`, 480, 326);

      // Сообщений
      ctx.font = 'bold 20px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(`${userProfile.message}`, 480, 368);

      // Онлайн
      const hours = Math.floor(userProfile.online / (60 * 60 * 1000));
      const minutes = Math.floor((userProfile.online % (60 * 60 * 1000)) / (60 * 1000));
      
      ctx.font = 'bold 20px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(`${hours}ч ${minutes}м`, 480, 406);

      const canvasBuffer = await canvas.encode('png');
      
      const attachment = new AttachmentBuilder(canvasBuffer, {
        name: 'profile.png',
      });

      await interaction.editReply({
        files: [attachment],
      });
    } catch (error) {
      console.error('Error generating profile canvas:', error);
      await interaction.editReply({
        content: 'Произошла ошибка при генерации профиля.',
      });
    }
  }
}
