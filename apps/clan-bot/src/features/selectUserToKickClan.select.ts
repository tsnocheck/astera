import {
  IFeature,
  RunFeatureParams,
  ClanModel,
} from '@lolz-bots/shared';
import { UserSelectMenuInteraction } from 'discord.js';

export default class SelectUserToKickClanFeature implements IFeature<UserSelectMenuInteraction> {
  name = 'selectUserToKickClan';

  async run({ interaction }: RunFeatureParams<UserSelectMenuInteraction>) {
    const selectedUserId = interaction.values[0];
    const clan = await ClanModel.findOne({ 'users.userID': interaction.user.id });

    if (!clan) {
      return interaction.update({
        content: 'Клан не найден',
        components: [],
      });
    }

    const isOwner = clan.owner === interaction.user.id;
    const isCoOwner = clan.coOwners.includes(interaction.user.id);

    // Проверяем, что пользователь в клане
    const member = clan.users.find((u: any) => u.userID === selectedUserId);
    if (!member) {
      return interaction.update({
        content: `<@${selectedUserId}> не состоит в клане **${clan.name}**`,
        components: [],
      });
    }

    // Нельзя исключить овнера
    if (selectedUserId === clan.owner) {
      return interaction.update({
        content: 'Нельзя исключить овнера клана',
        components: [],
      });
    }

    // Со-овнер не может исключить другого со-овнера
    if (isCoOwner && !isOwner && clan.coOwners.includes(selectedUserId)) {
      return interaction.update({
        content: 'Со-овнер не может исключить другого со-овнера',
        components: [],
      });
    }

    // Исключаем пользователя
    await ClanModel.updateOne(
      { _id: clan._id },
      {
        $pull: {
          users: { userID: selectedUserId },
          coOwners: selectedUserId,
        },
      }
    );

    return interaction.update({
      content: `✅ <@${selectedUserId}> был исключен из клана **${clan.name}**`,
      components: [],
    });
  }
}
