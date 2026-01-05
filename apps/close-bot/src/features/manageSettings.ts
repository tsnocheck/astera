import {
  IFeature,
  RunFeatureParams,
  constructEmbed,
  CloseGameModel,
  GameType,
} from '@lolz-bots/shared';
import {
  ButtonInteraction,
  ActionRowBuilder,
  ButtonBuilder,
  StringSelectMenuBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ChannelType,
  GuildMember,
  MessageComponentInteraction,
} from 'discord.js';
import { ButtonStyle } from 'discord-api-types/v10';

export default class ManageCloseSettings implements IFeature<MessageComponentInteraction> {
  name = 'close-settings';

  async run({ interaction }: RunFeatureParams<MessageComponentInteraction>) {
    if (!interaction.isButton() && !interaction.isStringSelectMenu()) return;

    const [, action, gameId] = interaction.customId.split('_');

    // Пытаемся найти по categoryId (новый формат) или по _id (старый формат для обратной совместимости)
    let gameData = await CloseGameModel.findOne({ categoryId: gameId, isActive: true });
    if (!gameData) {
      gameData = await CloseGameModel.findOne({ _id: gameId, isActive: true });
    }
    
    if (!gameData) {
      return interaction.reply({
        content: '❌ Клоз не найден',
        ephemeral: true,
      });
    }

    // Проверяем, что это ведущий
    if (interaction.user.id !== gameData.hostId) {
      return interaction.reply({
        content: '❌ Только ведущий может управлять клозом',
        ephemeral: true,
      });
    }

    switch (action) {
      case 'kick':
        await this.handleKick(interaction, gameData);
        break;
      case 'start':
        await this.handleStart(interaction, gameData);
        break;
      case 'delete':
        await this.handleDelete(interaction, gameData);
        break;
      case 'close':
        await this.handleCloseGame(interaction, gameData);
        break;
    }
  }

  private async handleKick(interaction: any, gameData: any) {
    // Откладываем ответ, чтобы не истёк токен при получении участников
    await interaction.deferReply({ ephemeral: true });

    const allPlayers = [...gameData.teamA, ...gameData.teamB];

    if (allPlayers.length === 0) {
      return interaction.editReply({
        content: '❌ Нет игроков для исключения',
      });
    }

    const guild = interaction.guild!;
    const options = await Promise.all(
      allPlayers.map(async (playerId: string) => {
        try {
          const member = await guild.members.fetch(playerId);
          return {
            label: member.user.username,
            value: playerId,
            description: `ID: ${playerId}`,
          };
        } catch {
          return {
            label: `Игрок ${playerId}`,
            value: playerId,
          };
        }
      })
    );

    const selectMenu =
      new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId(`close-kickplayer_${gameData.categoryId}`)
          .setPlaceholder('Выберите игрока для исключения')
          .addOptions(options),
      );

    await interaction.editReply({
      content: 'Выберите игрока для исключения:',
      components: [selectMenu],
    });
  }

  private async handleStart(interaction: any, gameData: any) {
    const totalPlayers = gameData.teamA.length + gameData.teamB.length;

    // Временно отключена проверка на полную запись для тестирования
    // if (totalPlayers < 10) {
    //   return interaction.reply({
    //     content: `❌ Недостаточно игроков! Записано: ${totalPlayers}/10`,
    //     ephemeral: true,
    //   });
    // }

    // Проверяем присутствие игроков в войсе ожидания
    const guild = interaction.guild!;
    const waitingVoice = guild.channels.cache.get(gameData.waitingVoiceChannelId);

    if (!waitingVoice || waitingVoice.type !== ChannelType.GuildVoice) {
      return interaction.reply({
        content: '❌ Голосовой канал ожидания не найден',
        ephemeral: true,
      });
    }

    const allPlayers = [...gameData.teamA, ...gameData.teamB];
    const membersInVoice = waitingVoice.members.map((m: any) => m.id);
    const missingPlayers = allPlayers.filter(
      (playerId: string) => !membersInVoice.includes(playerId)
    );

    if (missingPlayers.length > 0) {
      // Откладываем ответ т.к. будем долго ждать
      await interaction.deferReply({ ephemeral: true });

      // Отправляем сообщение с пингами отсутствующих игроков
      const registrationChannel = guild.channels.cache.get(
        gameData.registrationChannelId
      );

      if (registrationChannel && registrationChannel.isTextBased()) {
        let currentMissingPlayers = [...missingPlayers];
        const pings = currentMissingPlayers.map((id: string) => `<@${id}>`).join(' ');
        const warningMessage = await registrationChannel.send({
          content: `⚠️ **Внимание!** Следующие игроки должны зайти в голосовой канал <#${waitingVoice.id}> в течение 1 минуты:\n${pings}\n\n⏱️ Осталось: **60** секунд`,
        });

        await interaction.editReply({
          content: '⏳ Ожидание подключения игроков к голосовому каналу...',
        });

        // Проверяем каждые 5 секунд (12 итераций = 60 секунд)
        const checkInterval = 5000; // 5 секунд
        const totalChecks = 12;
        let checksCompleted = 0;

        for (let i = 0; i < totalChecks; i++) {
          await new Promise((resolve) => setTimeout(resolve, checkInterval));
          checksCompleted++;

          const updatedWaitingVoice = guild.channels.cache.get(gameData.waitingVoiceChannelId);
          if (!updatedWaitingVoice || updatedWaitingVoice.type !== ChannelType.GuildVoice) {
            await warningMessage.delete();
            return interaction.editReply({
              content: '❌ Ошибка при проверке голосового канала',
            });
          }

          const updatedMembersInVoice = updatedWaitingVoice.members.map((m: any) => m.id);
          currentMissingPlayers = allPlayers.filter(
            (playerId: string) => !updatedMembersInVoice.includes(playerId)
          );

          // Если все зашли - прерываем цикл
          if (currentMissingPlayers.length === 0) {
            await warningMessage.delete();
            await interaction.editReply({
              content: '✅ Все игроки подключились! Запуск игры...',
            });

            if (gameData.type === GameType.LOL) {
              return await this.startGame(interaction, gameData, null);
            } else {
              return interaction.followUp({
                content: '❌ После ожидания невозможно ввести данные подключения. Нажмите "Начать игру" снова.',
                ephemeral: true,
              });
            }
          }

          // Обновляем сообщение с текущим списком отсутствующих
          const remainingTime = (totalChecks - checksCompleted) * 5;
          const updatedPings = currentMissingPlayers.map((id: string) => `<@${id}>`).join(' ');
          await warningMessage.edit({
            content: `⚠️ **Внимание!** Следующие игроки должны зайти в голосовой канал <#${waitingVoice.id}> в течение 1 минуты:\n${updatedPings}\n\n⏱️ Осталось: **${remainingTime}** секунд`,
          });
        }

        // Время истекло, проверяем кто не зашел
        if (currentMissingPlayers.length > 0) {
          // Исключаем тех кто не зашел
          gameData.teamA = gameData.teamA.filter(
            (id: string) => !currentMissingPlayers.includes(id)
          );
          gameData.teamB = gameData.teamB.filter(
            (id: string) => !currentMissingPlayers.includes(id)
          );
          await gameData.save();

          // Обновляем embed записи
          await this.updateRegistrationEmbedFromStart(interaction, gameData);
          
          // Обновляем embed настроек
          await this.updateSettingsEmbedFromStart(interaction, gameData);

          const kickedPings = currentMissingPlayers.map((id: string) => `<@${id}>`).join(' ');
          await registrationChannel.send({
            content: `❌ Следующие игроки были исключены из записи (не зашли в войс): ${kickedPings}`,
          });

          await warningMessage.delete();

          return interaction.editReply({
            content: '❌ Некоторые игроки не зашли в голосовой канал и были исключены. Запуск игры отменен.',
          });
        }
      }
    } else {
      // Все на месте, сразу продолжаем
      // Для LoL не показываем модалку
      if (gameData.type === GameType.LOL) {
        await this.startGame(interaction, gameData, null);
      } else if (gameData.type === GameType.VALORANT) {
        // Для Valorant показываем модалку только с кодом команды
        const modal = new ModalBuilder()
          .setCustomId(`close-gamedata_${gameData.categoryId}`)
          .setTitle('Код команды');

        const teamCodeInput = new TextInputBuilder()
          .setCustomId('teamCode')
          .setLabel('Введите код команды')
          .setStyle(TextInputStyle.Short)
          .setRequired(true);

        const firstRow = new ActionRowBuilder<TextInputBuilder>().addComponents(
          teamCodeInput,
        );

        modal.addComponents(firstRow);
        await interaction.showModal(modal);
      } else {
        // Показываем модалку для других игр (CS2, Dota 2)
        const modal = new ModalBuilder()
          .setCustomId(`close-gamedata_${gameData.categoryId}`)
          .setTitle('Данные для подключения');

        const lobbyNameInput = new TextInputBuilder()
          .setCustomId('lobbyName')
          .setLabel('Название лобби')
          .setStyle(TextInputStyle.Short)
          .setRequired(true);

        const passwordInput = new TextInputBuilder()
          .setCustomId('password')
          .setLabel('Пароль')
          .setStyle(TextInputStyle.Short)
          .setRequired(true);

        const firstRow = new ActionRowBuilder<TextInputBuilder>().addComponents(
          lobbyNameInput,
        );
        const secondRow = new ActionRowBuilder<TextInputBuilder>().addComponents(
          passwordInput,
        );

        modal.addComponents(firstRow, secondRow);
        await interaction.showModal(modal);
      }
    }
  }

  private async handleDelete(interaction: any, gameData: any) {
    await interaction.deferReply({ ephemeral: true });

    try {
      const guild = interaction.guild!;
      const category = guild.channels.cache.get(gameData.categoryId);

      if (category) {
        // Удаляем все каналы в категории
        const channels = guild.channels.cache.filter(
          (ch: any) => ch.parentId === category.id,
        );
        for (const [, channel] of channels) {
          await channel.delete();
        }
        await category.delete();
      }

      await CloseGameModel.findByIdAndDelete(gameData._id);

      await interaction.editReply({
        content: '✅ Клоз успешно удален',
      });
    } catch (error) {
      console.error('Error deleting close:', error);
      await interaction.editReply({
        content: '❌ Ошибка при удалении клоза',
      });
    }
  }

  async startGame(interaction: any, gameData: any, connectionData: any) {
    try {
      const guild = interaction.guild!;
      const category = guild.channels.cache.get(gameData.categoryId);

      if (!category) {
        return interaction.editReply({
          content: '❌ Категория не найдена',
        });
      }

      // Создаем голосовые каналы
      const voiceA = await guild.channels.create({
        name: '🔴 Команда А',
        type: ChannelType.GuildVoice,
        parent: category.id,
        userLimit: 5,
      });

      const voiceB = await guild.channels.create({
        name: '🔵 Команда Б',
        type: ChannelType.GuildVoice,
        parent: category.id,
        userLimit: 5,
      });

      gameData.voiceAId = voiceA.id;
      gameData.voiceBId = voiceB.id;
      gameData.isActive = true;
      gameData.startedAt = new Date();
      await gameData.save();

      // Перемещаем игроков в голосовые каналы
      for (const playerId of gameData.teamA) {
        const member = guild.members.cache.get(playerId) as GuildMember;
        if (member && member.voice.channel) {
          await member.voice.setChannel(voiceA);
        }
      }

      for (const playerId of gameData.teamB) {
        const member = guild.members.cache.get(playerId) as GuildMember;
        if (member && member.voice.channel) {
          await member.voice.setChannel(voiceB);
        }
      }

      // Отправляем данные подключения в ЛС игрокам
      if (connectionData) {
        let message: string;
        
        if (gameData.type === GameType.VALORANT) {
          // Для Valorant отправляем только код команды
          message = `🎮 **Игра началась!**\n\n**Игра:** ${gameData.type}\n**Код команды:** ${connectionData.teamCode}`;
        } else {
          // Для других игр отправляем название лобби и пароль
          message = `🎮 **Игра началась!**\n\n**Игра:** ${gameData.type}\n**Лобби:** ${connectionData.lobbyName}\n**Пароль:** ${connectionData.password}`;
        }

        for (const playerId of [...gameData.teamA, ...gameData.teamB]) {
          try {
            const user = await guild.members.fetch(playerId);
            await user.send(message);
          } catch (error) {
            console.error(`Failed to send DM to ${playerId}:`, error);
          }
        }
      }

      // Обновляем embed настроек с кнопкой закрытия
      const settingsChannel = guild.channels.cache.get(
        gameData.settingsChannelId,
      );
      if (settingsChannel && settingsChannel.isTextBased()) {
        const messages = await settingsChannel.messages.fetch({ limit: 10 });
        const settingsMessage = messages.find((msg: any) =>
          msg.content.includes(`ID: ${gameData.categoryId}`),
        );

        if (settingsMessage) {
          const embed = constructEmbed({
            title: '⚙️ Управление клозом',
            description: `Игра: **${gameData.type}**\nВедущий: <@${gameData.hostId}>`,
            fields: [
              { name: 'Статус', value: '🟢 Игра идет', inline: false },
              {
                name: 'Начата',
                value: `<t:${Math.floor(gameData.startedAt.getTime() / 1000)}:R>`,
                inline: true,
              },
            ],
            customType: 'success',
          });

          const closeButton =
            new ActionRowBuilder<ButtonBuilder>().addComponents(
              new ButtonBuilder()
                .setCustomId(`close-settings_close_${gameData.categoryId}`)
                .setLabel('Закрыть игру')
                .setStyle(ButtonStyle.Danger),
            );

          await settingsMessage.edit({
            embeds: [embed],
            components: [closeButton],
          });
        }
      }

      if (interaction.isModalSubmit()) {
        await interaction.editReply({
          content: '✅ Игра началась! Игроки перемещены в голосовые каналы.',
        });
      } else {
        await interaction.editReply({
          content: '✅ Игра началась! Игроки перемещены в голосовые каналы.',
        });
      }
    } catch (error) {
      console.error('Error starting game:', error);
      await interaction.editReply({
        content: '❌ Ошибка при запуске игры',
      });
    }
  }

  private async handleCloseGame(interaction: any, gameData: any) {
    await interaction.deferReply({ ephemeral: true });

    try {
      const guild = interaction.guild!;
      const category = guild.channels.cache.get(gameData.categoryId);

      // Логируем игру
      const logsChannelId = process.env.LOGS_CHANNEL_ID;
      if (logsChannelId) {
        const logsChannel = guild.channels.cache.get(logsChannelId);
        if (logsChannel && logsChannel.isTextBased()) {
          const duration = gameData.startedAt
            ? Math.floor((Date.now() - gameData.startedAt.getTime()) / 1000)
            : 0;

          const logEmbed = constructEmbed({
            title: '📊 Клоз завершен',
            description: `Информация о завершенной игре`,
            fields: [
              { name: 'Игра', value: gameData.type, inline: true },
              {
                name: 'Ведущий',
                value: `<@${gameData.hostId}>`,
                inline: true,
              },
              {
                name: 'Создан',
                value: `<t:${Math.floor(gameData.createdAt!.getTime() / 1000)}:F>`,
                inline: false,
              },
              {
                name: 'Начат',
                value: gameData.startedAt
                  ? `<t:${Math.floor(gameData.startedAt.getTime() / 1000)}:F>`
                  : 'Не был запущен',
                inline: false,
              },
              {
                name: 'Завершен',
                value: `<t:${Math.floor(Date.now() / 1000)}:F>`,
                inline: false,
              },
              {
                name: 'Длительность',
                value: duration > 0 ? `${Math.floor(duration / 60)} минут` : 'N/A',
                inline: true,
              },
              {
                name: 'Команда А',
                value:
                  gameData.teamA.length > 0
                    ? gameData.teamA.map((id: string) => `<@${id}>`).join(', ')
                    : 'Пусто',
                inline: false,
              },
              {
                name: 'Команда Б',
                value:
                  gameData.teamB.length > 0
                    ? gameData.teamB.map((id: string) => `<@${id}>`).join(', ')
                    : 'Пусто',
                inline: false,
              },
            ],
            customType: 'custom',
          });

          await logsChannel.send({ embeds: [logEmbed] });
        }
      }

      // Удаляем все каналы
      if (category) {
        const channels = guild.channels.cache.filter(
          (ch: any) => ch.parentId === category.id,
        );
        for (const [, channel] of channels) {
          await channel.delete();
        }
        await category.delete();
      }

      // Сохраняем время завершения перед удалением
      gameData.completedAt = new Date();
      gameData.isActive = false;
      await gameData.save();

      await interaction.editReply({
        content: '✅ Клоз успешно закрыт и залогирован',
      });
    } catch (error) {
      console.error('Error closing game:', error);
      await interaction.editReply({
        content: '❌ Ошибка при закрытии игры',
      });
    }
  }

  private async updateRegistrationEmbedFromStart(
    interaction: any,
    gameData: any,
  ) {
    const guild = interaction.guild!;
    const registrationChannel = guild.channels.cache.get(
      gameData.registrationChannelId,
    );

    if (!registrationChannel || !registrationChannel.isTextBased()) return;

    const messages = await registrationChannel.messages.fetch({ limit: 10 });
    const registrationMessage = messages.find((msg: any) =>
      msg.embeds.some((e: any) => e.title?.includes(gameData.type)),
    );

    if (!registrationMessage) return;

    const teamAText =
      gameData.teamA.length > 0
        ? gameData.teamA.map((id: string) => `<@${id}>`).join('\n')
        : 'Пусто (0/5)';
    const teamBText =
      gameData.teamB.length > 0
        ? gameData.teamB.map((id: string) => `<@${id}>`).join('\n')
        : 'Пусто (0/5)';

    const updatedEmbed = constructEmbed({
      title: `Запись на ${gameData.type}`,
      description: 'Выберите команду для записи:',
      fields: [
        {
          name: `Команда А (${gameData.teamA.length}/5)`,
          value: teamAText,
          inline: true,
        },
        {
          name: `Команда Б (${gameData.teamB.length}/5)`,
          value: teamBText,
          inline: true,
        },
      ],
      customType: 'custom',
    });

    await registrationMessage.edit({
      embeds: [updatedEmbed],
    });
  }

  private async updateSettingsEmbedFromStart(
    interaction: any,
    gameData: any,
  ) {
    const guild = interaction.guild!;
    const settingsChannel = guild.channels.cache.get(
      gameData.settingsChannelId,
    );

    if (!settingsChannel || !settingsChannel.isTextBased()) return;

    const messages = await settingsChannel.messages.fetch({ limit: 10 });
    const settingsMessage = messages.find((msg: any) =>
      msg.content.includes(`ID: ${gameData.categoryId}`),
    );

    if (!settingsMessage) return;

    const totalPlayers = gameData.teamA.length + gameData.teamB.length;
    const statusText =
      totalPlayers === 10 ? '🟢 Готово к запуску' : '🟡 Ожидание записи';

    const updatedEmbed = constructEmbed({
      title: '⚙️ Управление клозом',
      description: `Игра: **${gameData.type}**\nВедущий: <@${gameData.hostId}>`,
      fields: [
        { name: 'Статус', value: statusText, inline: false },
        {
          name: 'Игроков записано',
          value: `${totalPlayers}/10`,
          inline: true,
        },
      ],
      customType: 'custom',
    });

    await settingsMessage.edit({
      embeds: [updatedEmbed],
    });
  }
}
