import {
  ICommand,
  IFeature,
  RunCommandParams,
  RunFeatureParams,
} from '@lolz-bots/shared';
import {
  ApplicationCommandOptionData,
  ApplicationCommandOptionType,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ButtonInteraction,
  GuildMember,
  TextChannel,
  VoiceChannel,
  UserSelectMenuBuilder,
  UserSelectMenuInteraction,
} from 'discord.js';
import { reportsConfig } from '../config';

// Хранилище активных голосований
interface VoteData {
  targetUserId: string;
  channelId: string;
  votes: Set<string>;
  messageId: string;
  timeout: NodeJS.Timeout;
}

interface VoteCooldown {
  [userId: string]: number;
}

const activeVotes = new Map<string, VoteData>();
const voteCooldowns = new Map<string, VoteCooldown>();

export default class ReportCommand implements ICommand {
  name = 'report';
  description = 'Жалоба на участника голосового канала';
  options: ApplicationCommandOptionData[] = [];

  features = [
    new SelectUserForVoteFeature(),
    new SelectUserForModeratorFeature(),
    new StartVoteFeature(),
    new CallModeratorFeature(),
    new VoteKickFeature(),
    new AcceptModeratorCallFeature(),
  ];

  async run({ interaction }: RunCommandParams) {

    const embed = new EmbedBuilder()
      .setTitle('/report - жалоба')
      .setColor('#FF0000')
      .setDescription(
        `Если вашему общению мешает какой-то из участников голосового канала,\n` +
        `руководствуйтесь кнопками ниже или напишите жалобу на пользователя следующей командой:\n` +
        `\`/report <пользователь>\``
      )
      .addFields({
        name: '⚠️ Предупреждение',
        value: 'Вызов модерации без причины понесёт за собой наказание',
      })
      .setTimestamp();

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId('startVote')
        .setLabel('Начать голосование')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('callModerator')
        .setLabel('Позвать модерацию')
        .setStyle(ButtonStyle.Danger)
    );

    await interaction.reply({
      embeds: [embed],
      components: [row],
    });
  }
}

// Feature для выбора пользователя для голосования
export class SelectUserForVoteFeature implements IFeature<ButtonInteraction> {
  name = 'startVote';

  async run({ interaction }: RunFeatureParams<ButtonInteraction>) {
    if (!interaction.isButton()) return;

    const buttonInteraction = interaction as ButtonInteraction;
    const member = buttonInteraction.member as GuildMember;

    if (!member.voice.channel) {
      return buttonInteraction.reply({
        content: 'Вы должны находиться в голосовом канале',
        ephemeral: true,
      });
    }

    const selectMenu = new UserSelectMenuBuilder()
      .setCustomId('selectUserVote')
      .setPlaceholder('Выберите пользователя для голосования')
      .setMinValues(1)
      .setMaxValues(1);

    const row = new ActionRowBuilder<UserSelectMenuBuilder>().addComponents(selectMenu);

    await buttonInteraction.reply({
      content: 'Выберите пользователя, на которого хотите начать голосование:',
      components: [row],
      ephemeral: true,
    });
  }
}

// Feature для выбора пользователя для вызова модерации
export class SelectUserForModeratorFeature implements IFeature<ButtonInteraction> {
  name = 'callModerator';

  async run({ interaction }: RunFeatureParams<ButtonInteraction>) {
    if (!interaction.isButton()) return;

    const buttonInteraction = interaction as ButtonInteraction;
    const member = buttonInteraction.member as GuildMember;

    if (!member.voice.channel) {
      return buttonInteraction.reply({
        content: 'Вы должны находиться в голосовом канале',
        ephemeral: true,
      });
    }

    const selectMenu = new UserSelectMenuBuilder()
      .setCustomId('selectUserModerator')
      .setPlaceholder('Выберите пользователя для жалобы')
      .setMinValues(1)
      .setMaxValues(1);

    const row = new ActionRowBuilder<UserSelectMenuBuilder>().addComponents(selectMenu);

    await buttonInteraction.reply({
      content: 'Выберите пользователя, на которого хотите пожаловаться:',
      components: [row],
      ephemeral: true,
    });
  }
}

// Feature для начала голосования
export class StartVoteFeature implements IFeature<UserSelectMenuInteraction> {
  name = 'selectUserVote';

  async run({ interaction, client }: RunFeatureParams<UserSelectMenuInteraction>) {
    if (!interaction.isUserSelectMenu()) return;

    const selectInteraction = interaction as UserSelectMenuInteraction;
    const targetUserId = selectInteraction.values[0];
    const member = selectInteraction.member as GuildMember;

    if (!member.voice.channel) {
      return selectInteraction.update({
        content: 'Вы должны находиться в голосовом канале',
        components: [],
      });
    }

    const voiceChannel = member.voice.channel;
    const channelMembers = voiceChannel.members.filter(m => !m.user.bot);

    // Проверка, находится ли цель в том же голосовом канале
    const targetMember = await selectInteraction.guild!.members.fetch(targetUserId).catch(() => null);
    if (!targetMember) {
      return selectInteraction.update({
        content: 'Пользователь не найден',
        components: [],
      });
    }

    if (!targetMember.voice.channel || targetMember.voice.channel.id !== voiceChannel.id) {
      return selectInteraction.update({
        content: 'Указанный пользователь должен находиться в вашем голосовом канале',
        components: [],
      });
    }

    // Проверка минимального количества участников
    if (channelMembers.size < 3) {
      return selectInteraction.update({
        content: 'Для голосования необходимо минимум 3 участника в канале',
        components: [],
      });
    }

    // Проверка кулдауна для конкретного пользователя
    const cooldownKey = voiceChannel.id;
    const userCooldowns = voteCooldowns.get(cooldownKey) || {};
    const now = Date.now();
    const cooldownTime = 60 * 60 * 1000; // 1 час

    if (userCooldowns[targetUserId] && now - userCooldowns[targetUserId] < cooldownTime) {
      const timeLeft = Math.ceil((cooldownTime - (now - userCooldowns[targetUserId])) / 60000);
      return selectInteraction.update({
        content: `Голосование по этому пользователю можно провести через ${timeLeft} минут`,
        components: [],
      });
    }

    // Проверка активного голосования
    if (activeVotes.has(voiceChannel.id)) {
      return selectInteraction.update({
        content: 'В этом канале уже идет голосование',
        components: [],
      });
    }

    const voteEmbed = new EmbedBuilder()
      .setTitle('🗳️ Голосование за кик')
      .setDescription(
        `Голосование за кик пользователя ${targetMember}\n\n` +
        `Нажмите кнопку ниже, чтобы проголосовать.\n` +
        `Голосование завершится через 1 минуту.`
      )
      .setColor('#FFA500')
      .addFields(
        { name: 'Голосов', value: '0', inline: true },
        { name: 'Необходимо', value: `${Math.ceil(channelMembers.size / 2)}`, inline: true }
      )
      .setTimestamp();

    const voteRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`voteKick_${targetUserId}`)
        .setLabel('Проголосовать за кик')
        .setStyle(ButtonStyle.Danger)
    );

    const voteMessage = await (selectInteraction.channel as TextChannel).send({
      embeds: [voteEmbed],
      components: [voteRow],
    });

    await selectInteraction.update({
      content: 'Голосование начато!',
      components: [],
    });

    // Создание данных голосования
    const voteData: VoteData = {
      targetUserId,
      channelId: voiceChannel.id,
      votes: new Set<string>(),
      messageId: voteMessage.id,
      timeout: setTimeout(async () => {
        await this.endVote(selectInteraction, targetUserId, false);
      }, 60000), // 1 минута
    };

    activeVotes.set(voiceChannel.id, voteData);
  }

  async endVote(interaction: UserSelectMenuInteraction | ButtonInteraction, targetUserId: string, success: boolean) {
    const member = interaction.member as GuildMember;
    if (!member.voice.channel) return;

    const voteData = activeVotes.get(member.voice.channel.id);
    if (!voteData) return;

    activeVotes.delete(member.voice.channel.id);
    clearTimeout(voteData.timeout);

    const targetMember = await interaction.guild!.members.fetch(targetUserId).catch(() => null);

    // Получаем сообщение голосования
    const message = await interaction.channel!.messages.fetch(voteData.messageId).catch(() => null);

    if (success && targetMember && targetMember.voice.channel) {
      // Кик из голосового канала
      await targetMember.voice.disconnect('Kicked by vote');

      if (message) {
        await message.delete();
      }

      await (interaction.channel as TextChannel).send({
        content: `✅ Пользователь ${targetMember} был исключен из голосового канала по результатам голосования.`,
      });
    } else {
      if (message) {
        await message.delete();
      }
    }

    // Установка кулдауна
    const cooldownKey = member.voice.channel.id;
    const userCooldowns = voteCooldowns.get(cooldownKey) || {};
    userCooldowns[targetUserId] = Date.now();
    voteCooldowns.set(cooldownKey, userCooldowns);
  }
}

// Feature для голосования
export class VoteKickFeature implements IFeature<ButtonInteraction> {
  name = 'voteKick';

  async run({ interaction }: RunFeatureParams<ButtonInteraction>) {
    if (!interaction.isButton()) return;

    const buttonInteraction = interaction as ButtonInteraction;
    const targetUserId = buttonInteraction.customId.split('_')[1];
    const member = buttonInteraction.member as GuildMember;

    if (!member.voice.channel) {
      return buttonInteraction.reply({
        content: 'Вы должны находиться в голосовом канале',
        ephemeral: true,
      });
    }

    const voteData = activeVotes.get(member.voice.channel.id);
    if (!voteData || voteData.targetUserId !== targetUserId) {
      return buttonInteraction.reply({
        content: 'Это голосование больше не активно',
        ephemeral: true,
      });
    }

    // Проверка, что голосующий не является целью
    if (member.id === targetUserId) {
      return buttonInteraction.reply({
        content: 'Вы не можете голосовать за кик самого себя',
        ephemeral: true,
      });
    }

    // Проверка, не голосовал ли уже
    if (voteData.votes.has(member.id)) {
      return buttonInteraction.reply({
        content: 'Вы уже проголосовали',
        ephemeral: true,
      });
    }

    // Добавление голоса
    voteData.votes.add(member.id);

    const voiceChannel = member.voice.channel;
    const channelMembers = voiceChannel.members.filter(m => !m.user.bot);
    const requiredVotes = Math.ceil(channelMembers.size / 2);

    const targetMember = await buttonInteraction.guild!.members.fetch(targetUserId).catch(() => null);

    // Обновление embed
    const updatedEmbed = new EmbedBuilder()
      .setTitle('🗳️ Голосование за кик')
      .setDescription(
        `Голосование за кик пользователя ${targetMember}\n\n` +
        `Нажмите кнопку ниже, чтобы проголосовать.\n` +
        `Голосование завершится через 1 минуту.`
      )
      .setColor('#FFA500')
      .addFields(
        { name: 'Голосов', value: `${voteData.votes.size}`, inline: true },
        { name: 'Необходимо', value: `${requiredVotes}`, inline: true }
      )
      .setTimestamp();

    await buttonInteraction.update({
      embeds: [updatedEmbed],
    });

    // Проверка, достаточно ли голосов
    if (voteData.votes.size >= requiredVotes) {
      const startVoteFeature = new StartVoteFeature();
      await startVoteFeature.endVote(buttonInteraction, targetUserId, true);
    } else {
      await buttonInteraction.followUp({
        content: 'Ваш голос учтён',
        ephemeral: true,
      });
    }
  }
}

// Feature для вызова модерации
export class CallModeratorFeature implements IFeature<UserSelectMenuInteraction> {
  name = 'selectUserModerator';

  async run({ interaction }: RunFeatureParams<UserSelectMenuInteraction>) {
    if (!interaction.isUserSelectMenu()) return;

    const selectInteraction = interaction as UserSelectMenuInteraction;
    const targetUserId = selectInteraction.values[0];
    const member = selectInteraction.member as GuildMember;

    if (!member.voice.channel) {
      return selectInteraction.update({
        content: 'Вы должны находиться в голосовом канале',
        components: [],
      });
    }

    const targetMember = await selectInteraction.guild!.members.fetch(targetUserId).catch(() => null);
    if (!targetMember) {
      return selectInteraction.update({
        content: 'Пользователь не найден',
        components: [],
      });
    }

    // Получение канала для модераторов из конфига
    const moderatorChannelId = reportsConfig.channels.moderation;
    if (!moderatorChannelId) {
      return selectInteraction.update({
        content: 'Канал для модераторов не настроен',
        components: [],
      });
    }

    const moderatorChannel = await selectInteraction.guild!.channels.fetch(moderatorChannelId).catch(() => null) as TextChannel;
    if (!moderatorChannel) {
      return selectInteraction.update({
        content: 'Канал для модераторов не найден',
        components: [],
      });
    }

    const moderatorRoles = reportsConfig.roles.moderator;
    if (!moderatorRoles || moderatorRoles.length === 0) {
      return selectInteraction.update({
        content: 'Роли модераторов не настроены',
        components: [],
      });
    }

    const moderatorEmbed = new EmbedBuilder()
      .setTitle('🚨 Вызов модерации')
      .setDescription(
        `**Жалоба от:** ${member}\n` +
        `**На пользователя:** ${targetMember}\n` +
        `**Голосовой канал:** ${member.voice.channel.name}`
      )
      .setColor('#FF0000')
      .setTimestamp();

    const acceptRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`acceptModCall_${targetUserId}_${member.id}`)
        .setLabel('Принять')
        .setStyle(ButtonStyle.Success)
    );

    const mentions = moderatorRoles.map(roleId => `<@&${roleId}>`).join(' ');

    await moderatorChannel.send({
      content: mentions,
      embeds: [moderatorEmbed],
      components: [acceptRow],
    });

    await selectInteraction.update({
      content: 'Модерация вызвана. Ожидайте ответа.',
      components: [],
    });
  }
}

// Feature для принятия вызова модератора
export class AcceptModeratorCallFeature implements IFeature<ButtonInteraction> {
  name = 'acceptModCall';

  async run({ interaction }: RunFeatureParams<ButtonInteraction>) {
    if (!interaction.isButton()) return;

    const buttonInteraction = interaction as ButtonInteraction;
    const parts = buttonInteraction.customId.split('_');
    const targetUserId = parts[1];
    const reporterId = parts[2];
    const member = buttonInteraction.member as GuildMember;

    // Проверка прав модератора
    const moderatorRoles = reportsConfig.roles.moderator;
    const isModerator = moderatorRoles.some(roleId => member.roles.cache.has(roleId));
    
    if (!isModerator) {
      return buttonInteraction.reply({
        content: 'У вас нет прав для принятия этого вызова',
        ephemeral: true,
      });
    }

    const acceptedEmbed = EmbedBuilder.from(buttonInteraction.message.embeds[0])
      .setFooter({ text: `Принято модератором: ${member.user.tag}` })
      .setColor('#00FF00');

    await buttonInteraction.update({
      embeds: [acceptedEmbed],
      components: [],
    });
  }
}
