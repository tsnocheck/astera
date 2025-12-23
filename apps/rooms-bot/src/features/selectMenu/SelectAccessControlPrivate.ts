import { IFeature, logger, PrivateModel, RunFeatureParams } from '@lolz-bots/shared';
import { ChannelType, SelectMenuInteraction, PermissionFlagsBits, GuildMember } from 'discord.js';

export class SelectAccessControlPrivate implements IFeature<SelectMenuInteraction> {
  name = 'selectAccessControlPrivate';

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

    const channel = interaction.guild?.channels.cache.get(room.roomId!);

    if (!channel || channel.type !== ChannelType.GuildVoice) {
      await interaction.reply({ content: 'Приватная комната не найдена.', ephemeral: true });
      return;
    }

    for (const user of interaction.values) {
      try {
        const member = await interaction.guild?.members.fetch(user);

        if (!member) continue;

        const currentPermission = channel.permissionOverwrites.cache.get(member.id);
        const canSpeak = currentPermission?.allow.has(PermissionFlagsBits.Speak) ?? true;

        await channel.permissionOverwrites.edit(member.id, {
          Connect: !canSpeak,
        });
      } catch (error) {
        logger.error('Error updating access control for user:', error);
        return;
      }
    }

    return interaction.reply({
      content: 'Настройки доступа успешно обновлены.',
      ephemeral: true,
    });
  }
}

export default SelectAccessControlPrivate;
