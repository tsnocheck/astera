import {
  IFeature,
  RunFeatureParams,
  constructEmbed,
  ClanModel,
} from '@lolz-bots/shared';
import { 
  UserSelectMenuInteraction,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
} from 'discord.js';

export default class SelectUserToInviteClanFeature implements IFeature<UserSelectMenuInteraction> {
  name = 'selectUserToInviteClan';

  async run({ interaction, client }: RunFeatureParams<UserSelectMenuInteraction>) {
    const selectedUserId = interaction.values[0];
    const clan = await ClanModel.findOne({ 'users.userID': interaction.user.id });

    if (!clan) {
      return interaction.update({
        content: 'Клан не найден',
        components: [],
      });
    }

    // Проверяем, что пользователь не в этом клане
    const existingMember = clan.users.find((u: any) => u.userID === selectedUserId);
    if (existingMember) {
      return interaction.update({
        content: `<@${selectedUserId}> уже состоит в клане **${clan.name}**`,
        components: [],
      });
    }

    // Проверяем, что пользователь вообще не состоит в каком-либо клане
    const userClan = await ClanModel.findOne({ 'users.userID': selectedUserId });
    if (userClan) {
      return interaction.update({
        content: `<@${selectedUserId}> уже состоит в клане **${userClan.name}**`,
        components: [],
      });
    }

    // Получаем пользователя
    const targetUser = await client.users.fetch(selectedUserId);
    
    if (!targetUser) {
      return interaction.update({
        content: 'Не удалось найти пользователя',
        components: [],
      });
    }

    // Создаем эмбед с приглашением
    const inviteEmbed = constructEmbed({
      title: '📨 Приглашение в клан',
      description: `**${interaction.user.username}** приглашает вас в клан **${clan.name}**`,
      customType: 'custom',
    });

    const expiresAt = Math.floor(Date.now() / 1000) + 900; // 15 минут
    inviteEmbed.setFooter({ text: `Приглашение истекает` });
    inviteEmbed.setTimestamp(new Date(expiresAt * 1000));

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`acceptClanInvite_${clan._id}`)
        .setLabel('✅ Принять')
        .setStyle(ButtonStyle.Success)
    );

    // Отправляем приглашение в ЛС
    try {
      const dmMessage = await targetUser.send({
        embeds: [inviteEmbed],
        components: [row],
      });

      // Создаем коллектор на 15 минут
      const collector = dmMessage.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 15 * 60 * 1000, // 15 минут
      });

      collector.on('collect', async (i) => {
        // Проверяем, что это правильный пользователь
        if (i.user.id !== selectedUserId) {
          return i.reply({ content: 'Это приглашение не для вас', ephemeral: true });
        }

        // Проверяем, что пользователь еще не в клане
        const freshUserClan = await ClanModel.findOne({ 'users.userID': selectedUserId });
        if (freshUserClan) {
          await i.update({
            embeds: [
              constructEmbed({
                title: '❌ Приглашение недействительно',
                description: `Вы уже состоите в клане **${freshUserClan.name}**`,
                customType: 'error',
              }),
            ],
            components: [],
          });
          collector.stop();
          return;
        }

        // Добавляем пользователя в клан
        await ClanModel.updateOne(
          { _id: clan._id },
          {
            $push: {
              users: {
                userID: selectedUserId,
                role: 'member',
                online: 0,
              },
            },
          }
        );

        await i.update({
          embeds: [
            constructEmbed({
              title: '✅ Приглашение принято',
              description: `Вы вступили в клан **${clan.name}**!`,
              customType: 'success',
            }),
          ],
          components: [],
        });

        collector.stop();
      });

      collector.on('end', async (collected, reason) => {
        if (reason === 'time') {
          // Время истекло
          await dmMessage.edit({
            embeds: [
              constructEmbed({
                title: '⏰ Приглашение истекло',
                description: 'Время на принятие приглашения истекло',
                customType: 'error',
              }),
            ],
            components: [],
          });
        }
      });

      return interaction.update({
        content: `✅ Приглашение отправлено <@${selectedUserId}> в личные сообщения`,
        components: [],
      });

    } catch (error) {
      return interaction.update({
        content: `❌ Не удалось отправить приглашение <@${selectedUserId}>. Возможно, у пользователя закрыты ЛС`,
        components: [],
      });
    }
  }
}
