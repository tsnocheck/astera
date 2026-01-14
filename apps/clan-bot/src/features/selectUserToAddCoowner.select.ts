import {
  IFeature,
  RunFeatureParams,
  ClanModel,
} from '@lolz-bots/shared';
import { UserSelectMenuInteraction } from 'discord.js';

export default class SelectUserToAddCoownerFeature implements IFeature<UserSelectMenuInteraction> {
  name = 'selectUserToAddCoowner';

  async run({ interaction }: RunFeatureParams<UserSelectMenuInteraction>) {
    const selectedUserId = interaction.values[0];
    const clan = await ClanModel.findOne({ owner: interaction.user.id });

    if (!clan) {
      return interaction.update({
        content: 'Клан не найден или вы не являетесь овнером',
        components: [],
      });
    }

    // Проверяем, что пользователь в клане
    const member = clan.users.find((u: any) => u.userID === selectedUserId);
    if (!member) {
      return interaction.update({
        content: `<@${selectedUserId}> не состоит в клане **${clan.name}**`,
        components: [],
      });
    }

    // Проверяем, что пользователь не овнер
    if (selectedUserId === clan.owner) {
      return interaction.update({
        content: 'Овнер уже имеет полные права',
        components: [],
      });
    }

    // Если пользователь уже со-овнер - снимаем его
    if (clan.coOwners.includes(selectedUserId)) {
      await ClanModel.updateOne(
        { _id: clan._id },
        {
          $pull: { coOwners: selectedUserId },
          $set: { 'users.$[elem].role': 'member' },
        },
        {
          arrayFilters: [{ 'elem.userID': selectedUserId }],
        }
      );

      return interaction.update({
        content: `✅ <@${selectedUserId}> снят с должности со-овнера клана **${clan.name}**`,
        components: [],
      });
    }

    // Проверяем лимит со-овнеров (максимум 3)
    if (clan.coOwners.length >= 3) {
      return interaction.update({
        content: `❌ Достигнут лимит со-овнеров (максимум 3). Сначала снимите кого-то с должности.`,
        components: [],
      });
    }

    // Назначаем со-овнером
    await ClanModel.updateOne(
      { _id: clan._id },
      {
        $addToSet: { coOwners: selectedUserId },
        $set: { 'users.$[elem].role': 'co-owner' },
      },
      {
        arrayFilters: [{ 'elem.userID': selectedUserId }],
      }
    );

    return interaction.update({
      content: `✅ <@${selectedUserId}> назначен со-овнером клана **${clan.name}**`,
      components: [],
    });
  }
}
