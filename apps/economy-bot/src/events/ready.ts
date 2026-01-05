import {BotClient, IEvent, logger, RolesShopModel, MarryModel, UserModel} from "@lolz-bots/shared";

export default class ReadyEvent implements IEvent {
  name = 'ready';

  async run(client: BotClient) {
    logger.info('Started bot...');

    // Cron job для проверки дат продления каждые 5 минут
    setInterval(async () => {
      try {
        console.log('🔄 Проверка дат продления...');
        
        const currentDate = new Date();
        const sevenDaysFromNow = new Date(currentDate);
        sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
        const sevenDaysWindow = new Date(currentDate);
        sevenDaysWindow.setHours(sevenDaysWindow.getHours() - 1); // Окно 1 час для предупреждения

        // ===== ПРОВЕРКА РОЛЕЙ =====
        
        // Уведомления за 7 дней
        const rolesSoonExpiring = await RolesShopModel.find({
          extensionDate: { 
            $gte: sevenDaysWindow,
            $lte: sevenDaysFromNow 
          },
          notificationSent: { $ne: true }
        });

        for (const roleDoc of rolesSoonExpiring) {
          try {
            const daysLeft = Math.ceil((new Date(roleDoc.extensionDate).getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));
            
            if (daysLeft <= 7 && daysLeft > 0) {
              const owner = await client.users.fetch(roleDoc.owner);
              await owner.send(`⚠️ До окончания срока действия вашей роли <@&${roleDoc.roleId}> осталось ${daysLeft} дней!\nДля автоматического продления убедитесь, что на вашем балансе есть 5000 монет.\nИли используйте команду /settings для ручного продления.`);
              
              roleDoc.notificationSent = true;
              await roleDoc.save();
              console.log(`📧 Отправлено уведомление владельцу роли ${roleDoc.roleId}`);
            }
          } catch (e) {
            console.log(`Не удалось отправить предупреждение владельцу роли ${roleDoc.roleId}`);
          }
        }

        // Проверка истекших ролей
        const expiredRoles = await RolesShopModel.find({
          extensionDate: { $lte: currentDate }
        });

        for (const roleDoc of expiredRoles) {
          try {
            const owner = await UserModel.findOne({ discordID: roleDoc.owner });
            
            if (owner && owner.coins >= 5000) {
              // Автоматическое продление
              owner.coins -= 5000;
              await owner.save();

              const newExtensionDate = new Date(roleDoc.extensionDate);
              newExtensionDate.setDate(newExtensionDate.getDate() + 30);
              roleDoc.extensionDate = newExtensionDate;
              roleDoc.notificationSent = false; // Сбрасываем флаг для следующего уведомления
              await roleDoc.save();

              console.log(`✅ Роль ${roleDoc.roleId} автоматически продлена на 30 дней`);
              
              try {
                const user = await client.users.fetch(roleDoc.owner);
                await user.send(`✅ Ваша роль <@&${roleDoc.roleId}> была автоматически продлена на 30 дней. Списано 5000 монет.`);
              } catch (e) {
                console.log(`Не удалось отправить уведомление пользователю ${roleDoc.owner}`);
              }
            } else {
              // Недостаточно средств - удаляем роль
              console.log(`❌ Роль ${roleDoc.roleId} удалена из-за недостатка средств`);

              // Удаляем роль с сервера
              for (const guild of client.guilds.cache.values()) {
                try {
                  const role = await guild.roles.fetch(roleDoc.roleId);
                  if (role) {
                    await role.delete('Не продлена - недостаточно средств');
                  }
                } catch (e) {
                  console.log(`Не удалось удалить роль ${roleDoc.roleId} с сервера ${guild.id}`);
                }
              }

              // Удаляем из массива roles у всех пользователей
              await UserModel.updateMany(
                { roles: roleDoc._id },
                { $pull: { roles: roleDoc._id } }
              );

              // Удаляем документ
              await RolesShopModel.findByIdAndDelete(roleDoc._id);

              // Уведомляем владельца
              try {
                const user = await client.users.fetch(roleDoc.owner);
                await user.send(`❌ Ваша роль <@&${roleDoc.roleId}> была удалена из-за недостатка средств для продления. Требовалось 5000 монет.`);
              } catch (e) {
                console.log(`Не удалось отправить уведомление пользователю ${roleDoc.owner}`);
              }
            }
          } catch (error) {
            console.error(`Ошибка при обработке роли ${roleDoc.roleId}:`, error);
          }
        }

        // ===== ПРОВЕРКА БРАКОВ =====
        
        // Уведомления за 7 дней
        const marriagesSoonExpiring = await MarryModel.find({
          paymentDate: { 
            $gte: sevenDaysWindow,
            $lte: sevenDaysFromNow 
          },
          notificationSent: { $ne: true }
        });

        for (const marriage of marriagesSoonExpiring) {
          try {
            const daysLeft = Math.ceil((new Date(marriage.paymentDate).getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));
            
            if (daysLeft <= 7 && daysLeft > 0) {
              const user1 = await client.users.fetch(marriage.user1);
              const user2 = await client.users.fetch(marriage.user2);
              
              const message = `⚠️ До окончания срока оплаты вашего брака осталось ${daysLeft} дней!\nТекущий баланс брака: ${marriage.balance} монет\nДля автоматического продления необходимо 5000 монет на семейном балансе.\nПополните баланс через команду /mprofile`;
              
              await user1.send(message);
              await user2.send(message);
              
              marriage.notificationSent = true;
              await marriage.save();
              console.log(`📧 Отправлены уведомления паре ${marriage.user1} и ${marriage.user2}`);
            }
          } catch (e) {
            console.log(`Не удалось отправить предупреждения паре ${marriage.user1} и ${marriage.user2}`);
          }
        }

        // Проверка истекших браков
        const expiredMarriages = await MarryModel.find({
          paymentDate: { $lte: currentDate }
        });

        for (const marriage of expiredMarriages) {
          try {
            if (marriage.balance >= 5000) {
              // Списываем с баланса брака
              marriage.balance -= 5000;
              
              const newPaymentDate = new Date(marriage.paymentDate);
              newPaymentDate.setDate(newPaymentDate.getDate() + 30);
              marriage.paymentDate = newPaymentDate;
              marriage.notificationSent = false; // Сбрасываем флаг для следующего уведомления
              await marriage.save();

              console.log(`✅ Брак ${marriage.user1} и ${marriage.user2} автоматически продлен на 30 дней`);

              try {
                const user1 = await client.users.fetch(marriage.user1);
                const user2 = await client.users.fetch(marriage.user2);
                
                await user1.send(`✅ Ваш брак с <@${marriage.user2}> был автоматически продлен на 30 дней. Списано 5000 монет с семейного баланса.`);
                await user2.send(`✅ Ваш брак с <@${marriage.user1}> был автоматически продлен на 30 дней. Списано 5000 монет с семейного баланса.`);
              } catch (e) {
                console.log(`Не удалось отправить уведомления паре ${marriage.user1} и ${marriage.user2}`);
              }
            } else {
              // Недостаточно средств - расторгаем брак
              console.log(`❌ Брак ${marriage.user1} и ${marriage.user2} расторгнут из-за недостатка средств`);

              // Убираем роли у обоих
              const MARRY_ROLE_ID = process.env.MARRY_ROLE_ID;
              for (const guild of client.guilds.cache.values()) {
                try {
                  const member1 = await guild.members.fetch(marriage.user1);
                  const member2 = await guild.members.fetch(marriage.user2);

                  if (MARRY_ROLE_ID) {
                    if (member1.roles.cache.has(MARRY_ROLE_ID)) {
                      await member1.roles.remove(MARRY_ROLE_ID);
                    }
                    if (member2.roles.cache.has(MARRY_ROLE_ID)) {
                      await member2.roles.remove(MARRY_ROLE_ID);
                    }
                  }
                } catch (e) {
                  console.log(`Не удалось убрать роли с сервера ${guild.id}`);
                }
              }

              // Удаляем брак
              await MarryModel.findByIdAndDelete(marriage._id);

              try {
                const user1 = await client.users.fetch(marriage.user1);
                const user2 = await client.users.fetch(marriage.user2);
                
                await user1.send(`💔 Ваш брак с <@${marriage.user2}> был расторгнут из-за недостатка средств на семейном балансе. Требовалось 5000 монет.`);
                await user2.send(`💔 Ваш брак с <@${marriage.user1}> был расторгнут из-за недостатка средств на семейном балансе. Требовалось 5000 монет.`);
              } catch (e) {
                console.log(`Не удалось отправить уведомления паре ${marriage.user1} и ${marriage.user2}`);
              }
            }
          } catch (error) {
            console.error(`Ошибка при обработке брака ${marriage._id}:`, error);
          }
        }

        console.log('✅ Проверка завершена');
      } catch (error) {
        console.error('Ошибка в cron job:', error);
      }
    }, 5 * 60 * 1000); // 5 минут
  }
}
