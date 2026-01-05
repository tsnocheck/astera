import { Guild, ChannelType, PermissionsBitField, Client } from 'discord.js';
import { BackupLogModel, BackupMappingModel, IBackupConfig, constructEmbed, logger } from '@lolz-bots/shared';

export class BackupService {
  constructor(private client: Client) {}

  async createBackup(sourceGuild: Guild, targetGuild: Guild, config: IBackupConfig) {
    const startTime = Date.now();
    
    // Создаем запись в логах
    const backupLog = await BackupLogModel.create({
      guildId: sourceGuild.id,
      targetGuildId: targetGuild.id,
      status: 'in-progress',
      startedAt: new Date(),
    });

    try {
      logger.info(`[Backup] Starting full backup from ${sourceGuild.name} to ${targetGuild.name}`);

      // Шаг 0: Очищаем целевой сервер перед переносом
      logger.info(`[Backup] 🗑️ Cleaning target server before backup...`);
      await this.clearTargetServer(targetGuild);
      logger.info(`[Backup] ✅ Target server cleaned successfully`);

      // Шаг 1: Синхронизируем роли (создаем/обновляем) - каждая роль сразу записывается в БД
      const { roleMap, created: rolesCreated, updated: rolesUpdated, deleted: rolesDeleted } = await this.syncRoles(sourceGuild, targetGuild);
      backupLog.rolesCreated = rolesCreated;
      logger.info(`[Backup] Roles synced: ${rolesCreated} created, ${rolesUpdated} updated, ${rolesDeleted} deleted`);
      logger.info(`[Backup] All role mappings already saved to database during sync`);

      // Шаг 2: Синхронизируем категории и каналы
      const { categoriesCreated, channelsCreated, categoriesUpdated, channelsUpdated, categoriesDeleted, channelsDeleted } = await this.syncChannels(
        sourceGuild,
        targetGuild,
        roleMap
      );
      backupLog.categoriesCreated = categoriesCreated;
      backupLog.channelsCreated = channelsCreated;
      logger.info(`[Backup] Channels synced: ${channelsCreated} created, ${channelsUpdated} updated, ${channelsDeleted} deleted`);
      logger.info(`[Backup] Categories synced: ${categoriesCreated} created, ${categoriesUpdated} updated, ${categoriesDeleted} deleted`);

      // Шаг 3: Обновляем настройки сервера (если нужно)
      await this.syncGuildSettings(sourceGuild, targetGuild);

      // Завершаем успешно
      const endTime = Date.now();
      const duration = Math.floor((endTime - startTime) / 1000);

      backupLog.status = 'success';
      backupLog.completedAt = new Date();
      backupLog.duration = duration;
      await backupLog.save();

      // Обновляем конфигурацию
      config.lastBackup = new Date();
      const nextBackup = new Date();
      nextBackup.setHours(nextBackup.getHours() + config.frequencyHours);
      config.nextBackup = nextBackup;
      await config.save();

      // Отправляем лог
      await this.sendSuccessLog(sourceGuild, config, backupLog);

      logger.info(`[Backup] Completed successfully in ${duration}s`);
    } catch (error: any) {
      logger.error('[Backup] Error:', error);

      backupLog.status = 'failed';
      backupLog.error = error.message;
      backupLog.completedAt = new Date();
      await backupLog.save();

      await this.sendErrorLog(sourceGuild, config, error);
      throw error;
    }
  }

  private async syncRoles(sourceGuild: Guild, targetGuild: Guild): Promise<{ roleMap: Map<string, string>; created: number; updated: number; deleted: number }> {
    logger.info('[Backup] Syncing roles...');
    const roleMap = new Map<string, string>();
    let created = 0, updated = 0, deleted = 0;

    // ВАЖНО: Маппим роль @everyone (её ID = ID сервера)
    roleMap.set(sourceGuild.id, targetGuild.id);
    logger.info(`  [Special] @everyone: ${sourceGuild.id} -> ${targetGuild.id}`);
    
    // Сразу записываем @everyone в БД
    await BackupMappingModel.findOneAndUpdate(
      { sourceGuildId: sourceGuild.id, targetGuildId: targetGuild.id },
      { 
        sourceGuildId: sourceGuild.id,
        targetGuildId: targetGuild.id,
        $addToSet: { 
          roles: {
            sourceRoleId: sourceGuild.id,
            targetRoleId: targetGuild.id,
            roleName: '@everyone',
          }
        }
      },
      { upsert: true }
    );
    logger.info(`[Backup] 💾 Saved @everyone mapping to DB`);

    // Определяем позицию бота на целевом сервере
    const botMember = targetGuild.members.cache.get(targetGuild.client.user!.id);
    const botHighestPosition = botMember?.roles.highest.position || 0;
    
    // Считаем количество ролей, которые бот не может трогать (выше его роли)
    const untouchableRolesCount = targetGuild.roles.cache.filter(
      (role) => role.position > botHighestPosition && role.id !== targetGuild.id
    ).size;

    logger.info(`[Backup] Bot highest position: ${botHighestPosition}, untouchable roles: ${untouchableRolesCount}`);

    // Создаем мапу существующих ролей на целевом сервере по имени
    const targetRolesByName = new Map<string, any>();
    targetGuild.roles.cache
      .filter((role) => role.id !== targetGuild.id && !role.managed)
      .forEach((role) => targetRolesByName.set(role.name, role));

    // Получаем роли источника, отсортированные по позиции (снизу вверх для правильного создания)
    const sourceRoles = sourceGuild.roles.cache
      .filter((role) => role.id !== sourceGuild.id && !role.managed)
      .sort((a, b) => b.position - a.position); // От меньшей позиции к большей

    // Создаем список ролей для позиционирования
    const rolesToPosition: Array<{ sourceRole: any; targetRole: any }> = [];

    // Синхронизируем роли
    for (const [, sourceRole] of sourceRoles) {
      try {
        const existingRole = targetRolesByName.get(sourceRole.name);

        if (existingRole) {
          // Роль существует - обновляем её настройки
          let needsUpdate = false;
          const updateData: any = {};

          if (existingRole.color !== sourceRole.color) {
            updateData.color = sourceRole.color;
            needsUpdate = true;
          }
          if (existingRole.hoist !== sourceRole.hoist) {
            updateData.hoist = sourceRole.hoist;
            needsUpdate = true;
          }
          if (existingRole.mentionable !== sourceRole.mentionable) {
            updateData.mentionable = sourceRole.mentionable;
            needsUpdate = true;
          }
          if (!existingRole.permissions.equals(sourceRole.permissions)) {
            updateData.permissions = sourceRole.permissions;
            needsUpdate = true;
          }

          if (needsUpdate) {
            await existingRole.edit(updateData);
            updated++;
            logger.info(`[Backup] Updated role: ${sourceRole.name}`);
          }

          roleMap.set(sourceRole.id, existingRole.id);
          rolesToPosition.push({ sourceRole, targetRole: existingRole });
          
          // Сразу записываем маппинг роли в БД
          await BackupMappingModel.findOneAndUpdate(
            { sourceGuildId: sourceGuild.id, targetGuildId: targetGuild.id },
            { 
              $addToSet: { 
                roles: {
                  sourceRoleId: sourceRole.id,
                  targetRoleId: existingRole.id,
                  roleName: sourceRole.name,
                }
              }
            },
            { upsert: true }
          );
          logger.info(`[Backup] 💾 Saved role mapping to DB: ${sourceRole.name}`);
          
          targetRolesByName.delete(sourceRole.name);
        } else {
          // Роли нет - создаем новую
          logger.info(`[Backup] Creating role: ${sourceRole.name}...`);
          const newRole = await targetGuild.roles.create({
            name: sourceRole.name,
            color: sourceRole.color,
            hoist: sourceRole.hoist,
            permissions: sourceRole.permissions,
            mentionable: sourceRole.mentionable,
          });

          created++;
          roleMap.set(sourceRole.id, newRole.id);
          rolesToPosition.push({ sourceRole, targetRole: newRole });
          logger.info(`[Backup] Created role: ${sourceRole.name}`);

          // Сразу записываем маппинг новой роли в БД
          await BackupMappingModel.findOneAndUpdate(
            { sourceGuildId: sourceGuild.id, targetGuildId: targetGuild.id },
            { 
              $addToSet: { 
                roles: {
                  sourceRoleId: sourceRole.id,
                  targetRoleId: newRole.id,
                  roleName: sourceRole.name,
                }
              }
            },
            { upsert: true }
          );
          logger.info(`[Backup] 💾 Saved new role mapping to DB: ${sourceRole.name}`);
        }

        // Задержка между операциями для избежания rate limit
        await new Promise(resolve => setTimeout(resolve, 300));
      } catch (error) {
        logger.error(`[Backup] Failed to sync role ${sourceRole.name}:`, error);
      }
    }

    // Устанавливаем позиции всех ролей (от нижних к верхним)
    logger.info(`[Backup] Setting positions for ${rolesToPosition.length} roles...`);
    for (const { sourceRole, targetRole } of rolesToPosition) {
      try {
        // Вычисляем целевую позицию с учетом ролей выше бота
        const targetPosition = sourceRole.position + untouchableRolesCount;
        const maxPosition = botHighestPosition - 1;
        const finalPosition = Math.min(targetPosition, maxPosition);
        
        if (finalPosition > 0 && targetRole.position !== finalPosition) {
          await targetRole.setPosition(finalPosition);
          logger.info(`[Backup] Set position for ${sourceRole.name}: ${sourceRole.position} -> ${finalPosition} (shift: +${untouchableRolesCount}, max: ${maxPosition})`);
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      } catch (posError) {
        logger.error(`[Backup] Failed to set position for role ${sourceRole.name}:`, posError);
      }
    }

    // Удаляем роли, которых нет на исходном сервере
    for (const [roleName, targetRole] of targetRolesByName) {
      try {
        if (targetRole.position < botHighestPosition) {
          await targetRole.delete();
          deleted++;
          logger.info(`[Backup] Deleted obsolete role: ${roleName}`);
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      } catch (error) {
        logger.error(`[Backup] Failed to delete role ${roleName}:`, error);
      }
    }

    return { roleMap, created, updated, deleted };
  }

  private async syncChannels(
    sourceGuild: Guild,
    targetGuild: Guild,
    roleMap: Map<string, string>
  ): Promise<{ categoriesCreated: number; channelsCreated: number; categoriesUpdated: number; channelsUpdated: number; categoriesDeleted: number; channelsDeleted: number }> {
    logger.info('[Backup] Syncing channels...');
    
    let categoriesCreated = 0, categoriesUpdated = 0, categoriesDeleted = 0;
    let channelsCreated = 0, channelsUpdated = 0, channelsDeleted = 0;
    const categoryMap = new Map<string, string>();
    const channelMappings: any[] = [];

    // Создаем мапы существующих каналов по имени
    const targetCategoriesByName = new Map<string, any>();
    const targetChannelsByName = new Map<string, any>();
    
    targetGuild.channels.cache.forEach((ch) => {
      if (ch.type === ChannelType.GuildCategory) {
        targetCategoriesByName.set(ch.name, ch);
      } else if (!ch.isThread()) {
        targetChannelsByName.set(ch.name, ch);
      }
    });

    // Синхронизируем категории
    const sourceCategories = sourceGuild.channels.cache
      .filter((ch) => ch.type === ChannelType.GuildCategory)
      .sort((a, b) => a.position - b.position);

    for (const [, category] of sourceCategories) {
      try {
        // Сохраняем оригинальные permissions с ID ролей исходного сервера
        const originalPermissions = category.permissionOverwrites.cache.map((p: any) => ({
          id: p.id,
          type: p.type,
          allow: p.allow.bitfield.toString(),
          deny: p.deny.bitfield.toString(),
        }));

        // Применяем маппинг для целевого сервера
        const permissionOverwrites = this.mapPermissionOverwrites(category, roleMap, targetGuild);
        const existingCategory = targetCategoriesByName.get(category.name);

        if (existingCategory) {
          // Категория существует - обновляем
          let needsUpdate = false;
          const updateData: any = {};

          if (existingCategory.position !== category.position) {
            updateData.position = category.position;
            needsUpdate = true;
          }

          // Проверяем permissions
          const currentPerms = JSON.stringify(existingCategory.permissionOverwrites.cache.map((p: any) => ({ id: p.id, allow: p.allow.bitfield, deny: p.deny.bitfield })));
          const newPerms = JSON.stringify(permissionOverwrites.map((p: any) => ({ id: p.id, allow: p.allow.bitfield, deny: p.deny.bitfield })));
          
          if (currentPerms !== newPerms) {
            updateData.permissionOverwrites = permissionOverwrites;
            needsUpdate = true;
          }

          if (needsUpdate) {
            await existingCategory.edit(updateData);
            categoriesUpdated++;
            logger.info(`[Backup] Updated category: ${category.name}`);
          }

          categoryMap.set(category.id, existingCategory.id);
          
          // Сохраняем маппинг категории с ОРИГИНАЛЬНЫМИ permissions
          channelMappings.push({
            sourceChannelId: category.id,
            targetChannelId: existingCategory.id,
            channelName: category.name,
            channelType: category.type,
            permissions: originalPermissions, // используем оригинальные ID ролей
          });
          
          targetCategoriesByName.delete(category.name);
        } else {
          // Категории нет - создаем
          const newCategory = await targetGuild.channels.create({
            name: category.name,
            type: ChannelType.GuildCategory,
            position: category.position,
            permissionOverwrites,
          });

          categoryMap.set(category.id, newCategory.id);
          
          // Сохраняем маппинг новой категории с ОРИГИНАЛЬНЫМИ permissions
          channelMappings.push({
            sourceChannelId: category.id,
            targetChannelId: newCategory.id,
            channelName: category.name,
            channelType: category.type,
            permissions: originalPermissions, // используем оригинальные ID ролей
          });
          
          categoriesCreated++;
          logger.info(`[Backup] Created category: ${category.name}`);
        }

        await new Promise(resolve => setTimeout(resolve, 300));
      } catch (error) {
        logger.error(`[Backup] Failed to sync category ${category.name}:`, error);
      }
    }

    // Синхронизируем каналы
    const sourceChannels = sourceGuild.channels.cache
      .filter((ch) => ch.type !== ChannelType.GuildCategory && !ch.isThread())
      .sort((a, b) => a.position - b.position);

    for (const [, channel] of sourceChannels) {
      try {
        // ШАІГ 1: Сохраняем канал в БД с оригинальными ID ролей
        const originalPermissions = channel.permissionOverwrites.cache.map((p: any) => ({
          id: p.id, // оригинальный ID роли с исходного сервера
          type: p.type,
          allow: p.allow.bitfield.toString(),
          deny: p.deny.bitfield.toString(),
        }));

        logger.info(`\n[Backup] 💾 Saving channel to DB: ${channel.name} (${channel.id})`);
        logger.info(`[Backup] Original permissions count: ${originalPermissions.length}`);

        // ШАІГ 2: Применяем маппинг ролей для переноса на целевой сервер
        const permissionOverwrites = this.mapPermissionOverwrites(channel, roleMap, targetGuild);
        const existingChannel = targetChannelsByName.get(channel.name);

        if (existingChannel) {
          // Канал существует - обновляем настройки
          let needsUpdate = false;
          const updateData: any = {};

          if (existingChannel.position !== channel.position) {
            updateData.position = channel.position;
            needsUpdate = true;
          }

          const parentId = channel.parentId ? categoryMap.get(channel.parentId) : null;
          if (existingChannel.parentId !== parentId) {
            updateData.parent = parentId;
            needsUpdate = true;
          }

          if (channel.isTextBased()) {
            if (existingChannel.topic !== (channel as any).topic) {
              updateData.topic = (channel as any).topic;
              needsUpdate = true;
            }
            if (existingChannel.nsfw !== (channel as any).nsfw) {
              updateData.nsfw = (channel as any).nsfw;
              needsUpdate = true;
            }
            if (existingChannel.rateLimitPerUser !== (channel as any).rateLimitPerUser) {
              updateData.rateLimitPerUser = (channel as any).rateLimitPerUser;
              needsUpdate = true;
            }
          }

          if (channel.type === ChannelType.GuildVoice && existingChannel.type === ChannelType.GuildVoice) {
            if ((existingChannel as any).bitrate !== (channel as any).bitrate) {
              updateData.bitrate = (channel as any).bitrate;
              needsUpdate = true;
            }
            if ((existingChannel as any).userLimit !== (channel as any).userLimit) {
              updateData.userLimit = (channel as any).userLimit;
              needsUpdate = true;
            }
          }

          // Проверяем permissions
          const currentPerms = JSON.stringify(existingChannel.permissionOverwrites.cache.map((p: any) => ({ id: p.id, allow: p.allow.bitfield, deny: p.deny.bitfield })));
          const newPerms = JSON.stringify(permissionOverwrites.map((p: any) => ({ id: p.id, allow: p.allow.bitfield, deny: p.deny.bitfield })));
          
          if (currentPerms !== newPerms) {
            updateData.permissionOverwrites = permissionOverwrites;
            needsUpdate = true;
          }

          if (needsUpdate) {
            await existingChannel.edit(updateData);
            channelsUpdated++;
            logger.info(`[Backup] Updated channel: ${channel.name}`);
          }

          // Сохраняем маппинг канала с ОРИГИНАЛЬНЫМИ permissions
          channelMappings.push({
            sourceChannelId: channel.id,
            targetChannelId: existingChannel.id,
            channelName: channel.name,
            channelType: channel.type,
            permissions: originalPermissions, // используем оригинальные ID ролей
          });

          targetChannelsByName.delete(channel.name);
        } else {
          // Канала нет - создаем
          const options: any = {
            name: channel.name,
            type: channel.type,
            position: channel.position,
            permissionOverwrites,
            parent: channel.parentId ? categoryMap.get(channel.parentId) : undefined,
          };

          if (channel.isTextBased()) {
            options.topic = (channel as any).topic;
            options.nsfw = (channel as any).nsfw;
            options.rateLimitPerUser = (channel as any).rateLimitPerUser;
          }

          if (channel.type === ChannelType.GuildVoice) {
            options.bitrate = (channel as any).bitrate;
            options.userLimit = (channel as any).userLimit;
          }

          const newChannel = await targetGuild.channels.create(options);
          
          // Сохраняем маппинг нового канала с ОРИГИНАЛЬНЫМИ permissions
          channelMappings.push({
            sourceChannelId: channel.id,
            targetChannelId: newChannel.id,
            channelName: channel.name,
            channelType: channel.type,
            permissions: originalPermissions, // используем оригинальные ID ролей
          });
          
          channelsCreated++;
          logger.info(`[Backup] Created channel: ${channel.name}`);
        }

        await new Promise(resolve => setTimeout(resolve, 300));
      } catch (error) {
        logger.error(`[Backup] Failed to sync channel ${channel.name}:`, error);
      }
    }

    // Удаляем устаревшие категории
    for (const [categoryName, category] of targetCategoriesByName) {
      try {
        await category.delete();
        categoriesDeleted++;
        logger.info(`[Backup] Deleted obsolete category: ${categoryName}`);
        await new Promise(resolve => setTimeout(resolve, 300));
      } catch (error) {
        logger.error(`[Backup] Failed to delete category ${categoryName}:`, error);
      }
    }

    // Удаляем устаревшие каналы
    for (const [channelName, channel] of targetChannelsByName) {
      try {
        await channel.delete();
        channelsDeleted++;
        logger.info(`[Backup] Deleted obsolete channel: ${channelName}`);
        await new Promise(resolve => setTimeout(resolve, 300));
      } catch (error) {
        logger.error(`[Backup] Failed to delete channel ${channelName}:`, error);
      }
    }

    // Сохраняем маппинг каналов в БД
    await BackupMappingModel.findOneAndUpdate(
      { sourceGuildId: sourceGuild.id, targetGuildId: targetGuild.id },
      { $set: { channels: channelMappings } },
      { upsert: true }
    );
    logger.info(`[Backup] 💾 Channel mappings saved to database: ${channelMappings.length} channels\n`);

    return { categoriesCreated, channelsCreated, categoriesUpdated, channelsUpdated, categoriesDeleted, channelsDeleted };
  }

  private async syncGuildSettings(sourceGuild: Guild, targetGuild: Guild) {
    logger.info('[Backup] Skipping guild settings (name, icon, banner) - keeping target guild identity');
    // Не копируем название, иконку и баннер сервера
  }

  private mapPermissionOverwrites(channel: any, roleMap: Map<string, string>, targetGuild: Guild) {
    logger.info(`\n[Backup] 📋 Processing permission overwrites for channel: ${channel.name}`);
    logger.info(`[Backup] Total overwrites found: ${channel.permissionOverwrites.cache.size}`);
    
    const result: any[] = [];
    
    for (const [, overwrite] of channel.permissionOverwrites.cache) {
      const typeStr = overwrite.type === 0 ? 'Role' : 'Member';
      const originalId = overwrite.id;
      
      logger.info(`\n  [${typeStr}] Original ID: ${originalId}`);
      
      if (overwrite.type === 0) {
        // Это роль - пытаемся найти маппинг
        const newId = roleMap.get(originalId);
        
        if (!newId) {
          logger.warn(`  ⚠️ [SKIPPED] Role ${originalId} not found in roleMap - skipping permission overwrite`);
          continue; // Пропускаем этот overwrite
        }
        
        logger.info(`  [${typeStr}] Mapped to: ${newId}`);
        logger.info(`  [${typeStr}] Allow permissions: ${overwrite.allow.bitfield.toString()}`);
        logger.info(`  [${typeStr}] Deny permissions: ${overwrite.deny.bitfield.toString()}`);
        logger.info(`  [${typeStr}] Allow readable: [${overwrite.allow.toArray().join(', ')}]`);
        logger.info(`  [${typeStr}] Deny readable: [${overwrite.deny.toArray().join(', ')}]`);
        
        result.push({
          id: newId,
          type: overwrite.type,
          allow: overwrite.allow,
          deny: overwrite.deny,
        });
      } else {
        // Это пользователь - ID не меняется
        logger.info(`  [${typeStr}] User ID (unchanged): ${originalId}`);
        logger.info(`  [${typeStr}] Allow permissions: ${overwrite.allow.bitfield.toString()}`);
        logger.info(`  [${typeStr}] Deny permissions: ${overwrite.deny.bitfield.toString()}`);
        
        result.push({
          id: originalId,
          type: overwrite.type,
          allow: overwrite.allow,
          deny: overwrite.deny,
        });
      }
    }
    
    logger.info(`\n[Backup] ✅ Will apply ${result.length} overwrites out of ${channel.permissionOverwrites.cache.size} total\n`);
    return result;
  }

  private async sendSuccessLog(sourceGuild: Guild, config: IBackupConfig, log: any) {
    try {
      const logsChannel = sourceGuild.channels.cache.get(config.logsChannelId);
      if (!logsChannel || !logsChannel.isTextBased()) {
        logger.info('[Backup] Logs channel not found or not text-based');
        return;
      }

      // Проверяем права бота на отправку сообщений
      const botMember = sourceGuild.members.cache.get(sourceGuild.client.user!.id);
      const permissions = logsChannel.permissionsFor(botMember!);
      if (!permissions?.has([PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages])) {
        logger.error(`[Backup] Bot has no permission to send messages in logs channel ${config.logsChannelId}`);
        return;
      }

      const embed = constructEmbed({
        title: '✅ Резервная копия создана',
        description: 'Сервер успешно скопирован',
        fields: [
          { name: 'Исходный сервер', value: sourceGuild.name, inline: true },
          { name: 'Время выполнения', value: `${log.duration}с`, inline: true },
          { name: 'Ролей создано', value: log.rolesCreated.toString(), inline: true },
          { name: 'Категорий создано', value: log.categoriesCreated.toString(), inline: true },
          { name: 'Каналов создано', value: log.channelsCreated.toString(), inline: true },
          {
            name: 'Следующий бекап',
            value: config.nextBackup
              ? `<t:${Math.floor(config.nextBackup.getTime() / 1000)}:R>`
              : 'Не запланирован',
            inline: true,
          },
        ],
        customType: 'success',
      });

      await logsChannel.send({ embeds: [embed] });
    } catch (error) {
      logger.error('[Backup] Failed to send success log:', error);
    }
  }

  private async sendErrorLog(sourceGuild: Guild, config: IBackupConfig, error: any) {
    try {
      const logsChannel = sourceGuild.channels.cache.get(config.logsChannelId);
      if (!logsChannel || !logsChannel.isTextBased()) {
        logger.info('[Backup] Logs channel not found or not text-based');
        return;
      }

      // Проверяем права бота на отправку сообщений
      const botMember = sourceGuild.members.cache.get(sourceGuild.client.user!.id);
      const permissions = logsChannel.permissionsFor(botMember!);
      if (!permissions?.has([PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages])) {
        logger.error(`[Backup] Bot has no permission to send messages in logs channel ${config.logsChannelId}`);
        return;
      }

      const embed = constructEmbed({
        title: '❌ Ошибка создания бекапа',
        description: `Не удалось создать резервную копию сервера`,
        fields: [
          { name: 'Исходный сервер', value: sourceGuild.name, inline: true },
          { name: 'Ошибка', value: error.message || 'Неизвестная ошибка', inline: false },
        ],
        customType: 'error',
      });

      await logsChannel.send({ embeds: [embed] });
    } catch (err) {
      logger.error('[Backup] Failed to send error log:', err);
    }
  }

  async clearTargetServer(targetGuild: Guild) {
    logger.info(`[Backup] 🗑️ Starting server cleanup: ${targetGuild.name}`);
    
    const botMember = targetGuild.members.cache.get(targetGuild.client.user!.id);
    const botHighestPosition = botMember?.roles.highest.position || 0;
    
    // Удаляем все каналы
    let channelsDeleted = 0;
    for (const [, channel] of targetGuild.channels.cache) {
      try {
        if (!channel.isThread()) {
          await channel.delete();
          channelsDeleted++;
          logger.info(`[Backup] Deleted channel: ${channel.name}`);
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      } catch (error) {
        logger.error(`[Backup] Failed to delete channel ${channel.name}:`, error);
      }
    }
    
    // Удаляем все роли (кроме @everyone, управляемых ботами и выше роли бота)
    let rolesDeleted = 0;
    for (const [, role] of targetGuild.roles.cache) {
      try {
        if (
          role.id !== targetGuild.id && // не @everyone
          !role.managed && // не управляемая ботом
          role.position < botHighestPosition // ниже роли бота
        ) {
          await role.delete();
          rolesDeleted++;
          logger.info(`[Backup] Deleted role: ${role.name}`);
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      } catch (error) {
        logger.error(`[Backup] Failed to delete role ${role.name}:`, error);
      }
    }
    
    logger.info(`[Backup] ✅ Server cleanup complete: ${channelsDeleted} channels, ${rolesDeleted} roles deleted`);
  }
}
