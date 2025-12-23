import { IFeature, PrivateModel, RunFeatureParams } from '@lolz-bots/shared';
import {
  ChannelType,
  PermissionFlagsBits,
  SelectMenuInteraction,
  VoiceChannel,
} from 'discord.js';

export class SelectMuteOrUnMutePrivate implements IFeature<SelectMenuInteraction> {
  name = 'selectMuteOrUnMutePrivate';

  async run({ interaction }: RunFeatureParams<SelectMenuInteraction>) {
    const member = interaction.guild?.members.cache.get(interaction.user.id);

    if (!member) {
      return interaction.reply({
        content: 'Участник не найден.',
        components: [],
      });
    }

    const channel = member.voice.channel;

    if (!channel || channel.type !== ChannelType.GuildVoice) {
      return interaction.reply({
        content: 'Вы должны находиться в голосовом канале для управления мутом.',
        components: [],
      });
    }

    const room = await PrivateModel.findOne({ ownerId: interaction.user.id });

    if (!room) {
      return interaction.reply({
        content: 'Комната не найдена.',
        components: [],
      });
    }

    const voice = await interaction.guild?.channels.fetch(
      room.roomId!,
    ) as VoiceChannel;

    if (!voice) {
      return interaction.reply({
        content: 'Голосовой канал не найден.',
        components: [],
      });
    }

    const selectedUserIds = interaction.values;

    await Promise.all(
      selectedUserIds.map(async (id: string) => {
        const user = await interaction.guild?.members.fetch(id);
        if (!user) return;

        const currentPermission = voice.permissionOverwrites.cache.get(id);
        const canSpeak = currentPermission?.allow.has(PermissionFlagsBits.Speak) ?? true;

        await voice.permissionOverwrites.edit(id, {
          Speak: !canSpeak,
        });

        if (user.voice.channelId) {
          await user.voice.setChannel(channel.id);
        }
      }),
    );

    return interaction.update({
      content: `Статус мута обновлен для выбранных пользователей.`,
      components: [],
    });
  }
}

export default SelectMuteOrUnMutePrivate;
