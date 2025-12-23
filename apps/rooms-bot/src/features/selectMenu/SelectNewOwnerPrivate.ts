import { IFeature, logger, PrivateModel, RunFeatureParams } from '@lolz-bots/shared';
import { ChannelType, SelectMenuInteraction, GuildMember } from 'discord.js';

export class SelectNewOwnerPrivate implements IFeature<SelectMenuInteraction> {
  name = 'selectNewOwnerPrivate';

  async run({ interaction }: RunFeatureParams<SelectMenuInteraction>) {
    const room = await PrivateModel.findOne({ ownerId: interaction.user.id });
    if (!room) {
      await interaction.reply({ content: 'У вас нет приватной комнаты.', ephemeral: true });
      return;
    }

    if (!(interaction.member instanceof GuildMember) || room.roomId !== interaction.member.voice.channelId) {
      await interaction.reply({ content: 'Вы не являетесь владельцем этой приватной комнаты.', ephemeral: true });
      return;
    }

    let ownedUser = await PrivateModel.findOne({ ownerId: interaction.values[0] });

    if (!ownedUser) {
      room.ownerId = interaction.values[0];
      await room.save();

      return interaction.reply({
        content: 'Владелец приватной комнаты успешно изменён.',
        ephemeral: true,
      });
    } else {
      const channel = interaction.guild?.channels.cache.get(room.roomId!);

      if(!channel) {
        room.ownerId = interaction.values[0];
        await room.save();
        await ownedUser.deleteOne();

        return interaction.reply({
          content: 'Владелец приватной комнаты успешно изменён.',
          ephemeral: true,
        });
      } else {
        return interaction.reply({ content: 'У пользователя уже есть созданная приватная комната.', ephemeral: true });
      }
    }
  }
}

export default SelectNewOwnerPrivate;
