import {
  ICommand,
  IFeature,
  RunCommandParams,
  RunFeatureParams,
  SupUserModel,
} from '@lolz-bots/shared';
import {
  ApplicationCommandOptionData,
  ApplicationCommandOptionType,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ButtonInteraction,
} from 'discord.js';
import { supConfig } from '../config';

export default class VerifyCommand implements ICommand {
  name = 'verify';
  description = 'Меню верификации';
  options: ApplicationCommandOptionData[] = [
    {
      name: 'member',
      description: 'Пользователь',
      type: ApplicationCommandOptionType.User,
      required: true,
    },
  ];

  features = [
    new VerifyMenuFeature(),
    new CloseMenuFeature(),
    new GirlFeature(),
    new ManFeature(),
    new BanMenuFeature(),
    new AddBanFeature(),
    new RemoveBanFeature(),
    new SwapGenderFeature(),
    new HistoryInviteFeature(),
    new RemoveUnverifyFeature(),
    new KeysManagerFeature(),
  ];

  async run({ interaction }: RunCommandParams) {
    // Get user instead of member to avoid type issues
    const selectedUser = interaction.options.getUser('member', true);
    
    // Fetch the full GuildMember object
    const fetchedMember = await interaction.guild!.members.fetch(selectedUser.id).catch(() => null);
    if (!fetchedMember) {
      return interaction.reply({
        content: 'Пользователь не найден на сервере',
        ephemeral: true,
      });
    }
    
    const member = fetchedMember; // Now TypeScript knows member is not null

    const iUser = interaction.guild!.members.cache.get(interaction.user.id);
    if (
      !iUser ||
      !iUser.roles.cache.find((role) =>
        supConfig.roles.acceptVerify.includes(role.id)
      )
    ) {
      return interaction.reply({
        content: 'Вы не имеете доступа к этой команде',
        ephemeral: true,
      });
    }

    const user =
      (await SupUserModel.findOne({
        guild: interaction.guildId!,
        userId: member.id,
      })) ||
      (await SupUserModel.create({
        guild: interaction.guildId!,
        userId: member.id,
      }));

    const emb = new EmbedBuilder()
      .setTitle(`Пользователь - ${member.user.username}`)
      .setDescription(`**Для верификации пользователя используйте кнопки ниже:**`)
      .addFields(
        { name: 'Имя:', value: `\`\`\`${member.user.username}\`\`\``, inline: true },
        { name: 'ID:', value: `\`\`\`${member.id}\`\`\``, inline: true },
        {
          name: 'Перезашел',
          value: `\`\`\`${user.reInvite} раз\`\`\``,
          inline: true,
        },
        {
          name: 'Аккаунт создан',
          value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`,
          inline: true,
        },
        {
          name: 'Присоединился',
          value: `<t:${Math.floor(member.joinedTimestamp! / 1000)}:R>`,
          inline: true,
        }
      )
      .setColor(0x2b2d31)
      .setThumbnail(member.user.displayAvatarURL({ forceStatic: false }))
      .setFooter({
        text: '*кнопка снять unverify откроется после верификации, если у юзера осталась роль.',
      });

    const button = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`verify-${member.id}`)
        .setLabel('Меню верификации')
        .setDisabled(user.sex != null)
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`ban-${member.id}`)
        .setDisabled(user.sex != null)
        .setLabel('Меню недопуска')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`swap-${member.id}`)
        .setLabel('Сменить гендерную роль')
        .setDisabled(
          !iUser.roles.cache.some((role) =>
            supConfig.roles.acceptVerify.includes(role.id)
          ) && user.sex == null
        )
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`historyInvite-${member.id}`)
        .setLabel('История перезаходов')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`close-${member.id}`)
        .setLabel('Отменить')
        .setStyle(ButtonStyle.Danger)
    );

    const button2 = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`removeUnverify-${member.id}`)
        .setLabel('Снять unverify')
        .setDisabled(
          user.sex == null
            ? true
            : false && member.roles.cache.has(supConfig.roles.unverify)
        )
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`keysManager-${member.id}`)
        .setLabel('Выдать/Снять ключик')
        .setStyle(ButtonStyle.Secondary)
    );

    await interaction.reply({ embeds: [emb], components: [button, button2] });
  }
}

class VerifyMenuFeature implements IFeature<ButtonInteraction> {
  name = 'verify';

  async run({ interaction }: RunFeatureParams<ButtonInteraction>) {
    const memberId = interaction.customId.split('-')[1];
    const member = await interaction.guild!.members.fetch(memberId);

    const emb = new EmbedBuilder()
      .setTitle(`Пользователь - ${member.user.username}`)
      .setDescription(`**Для верификации пользователя используйте кнопки ниже:**`)
      .setColor(0x2b2d31)
      .setThumbnail(member.user.displayAvatarURL({ forceStatic: false }));

    const button = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`girl-${member.id}`)
        .setLabel('Девочка')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`man-${member.id}`)
        .setLabel('Мальчик')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`close-${member.id}`)
        .setLabel('Отменить')
        .setStyle(ButtonStyle.Danger)
    );

    await interaction.update({ embeds: [emb], components: [button] });
  }
}

class CloseMenuFeature implements IFeature<ButtonInteraction> {
  name = 'close';

  async run({ interaction }: RunFeatureParams<ButtonInteraction>) {
    await interaction.update({ components: [] });
    await interaction.followUp({
      content: 'Меню закрыто',
      ephemeral: true,
    });
  }
}

class GirlFeature implements IFeature<ButtonInteraction> {
  name = 'girl';

  async run({ interaction }: RunFeatureParams<ButtonInteraction>) {
    const memberId = interaction.customId.split('-')[1];
    const member = await interaction.guild!.members.fetch(memberId);

    await member.roles.add(supConfig.roles.girl);
    await member.roles.remove(supConfig.roles.unverify);

    await SupUserModel.findOneAndUpdate(
      { guild: interaction.guildId!, userId: memberId },
      { sex: true },
      { upsert: true }
    );

    await interaction.update({ components: [] });
    await interaction.followUp({
      content: `Пользователь ${member.user.username} верифицирован как девочка`,
      ephemeral: true,
    });
  }
}

class ManFeature implements IFeature<ButtonInteraction> {
  name = 'man';

  async run({ interaction }: RunFeatureParams<ButtonInteraction>) {
    const memberId = interaction.customId.split('-')[1];
    const member = await interaction.guild!.members.fetch(memberId);

    await member.roles.add(supConfig.roles.man);
    await member.roles.remove(supConfig.roles.unverify);

    await SupUserModel.findOneAndUpdate(
      { guild: interaction.guildId!, userId: memberId },
      { sex: false },
      { upsert: true }
    );

    await interaction.update({ components: [] });
    await interaction.followUp({
      content: `Пользователь ${member.user.username} верифицирован как мальчик`,
      ephemeral: true,
    });
  }
}

class BanMenuFeature implements IFeature<ButtonInteraction> {
  name = 'ban';

  async run({ interaction }: RunFeatureParams<ButtonInteraction>) {
    const memberId = interaction.customId.split('-')[1];
    const member = await interaction.guild!.members.fetch(memberId);
    const iUser = interaction.guild!.members.cache.get(interaction.user.id);
    const user = await SupUserModel.findOne({
      guild: interaction.guildId!,
      userId: memberId,
    });

    const emb = new EmbedBuilder()
      .setTitle('Меню недопуска')
      .setDescription(`**Для выдачи/снятия недопуска нажмите кнопку ниже**`)
      .setColor(0x2b2d31)
      .setThumbnail(member.user.displayAvatarURL({ forceStatic: false }));

    const button = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`addBan-${member.id}`)
        .setLabel('Выдать недопуск')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`removeBan-${member.id}`)
        .setLabel('Снять недопуск')
        .setDisabled(
          !iUser?.roles.cache.find((role) =>
            supConfig.roles.acceptRemoveBan.includes(role.id)
          ) || user?.sex != null
        )
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`close-${member.id}`)
        .setLabel('Отменить')
        .setStyle(ButtonStyle.Danger)
    );

    await interaction.update({ embeds: [emb], components: [button] });
  }
}

class AddBanFeature implements IFeature<ButtonInteraction> {
  name = 'addBan';

  async run({ interaction }: RunFeatureParams<ButtonInteraction>) {
    const memberId = interaction.customId.split('-')[1];
    const member = await interaction.guild!.members.fetch(memberId);

    await member.roles.add(supConfig.roles.ban);
    await member.roles.remove(supConfig.roles.unverify);

    await SupUserModel.findOneAndUpdate(
      { guild: interaction.guildId!, userId: memberId },
      { ban: true },
      { upsert: true }
    );

    await interaction.update({ components: [] });
    await interaction.followUp({
      content: `Пользователь ${member.user.username} получил недопуск`,
      ephemeral: true,
    });
  }
}

class RemoveBanFeature implements IFeature<ButtonInteraction> {
  name = 'removeBan';

  async run({ interaction }: RunFeatureParams<ButtonInteraction>) {
    const memberId = interaction.customId.split('-')[1];
    const member = await interaction.guild!.members.fetch(memberId);

    await member.roles.remove(supConfig.roles.ban);

    await SupUserModel.findOneAndUpdate(
      { guild: interaction.guildId!, userId: memberId },
      { ban: false },
      { upsert: true }
    );

    await interaction.update({ components: [] });
    await interaction.followUp({
      content: `С пользователя ${member.user.username} снят недопуск`,
      ephemeral: true,
    });
  }
}

class SwapGenderFeature implements IFeature<ButtonInteraction> {
  name = 'swap';

  async run({ interaction }: RunFeatureParams<ButtonInteraction>) {
    const memberId = interaction.customId.split('-')[1];
    const member = await interaction.guild!.members.fetch(memberId);
    const iUser = interaction.guild!.members.cache.get(interaction.user.id);

    const user = await SupUserModel.findOne({
      guild: interaction.guildId!,
      userId: memberId,
    });

    if (!user || user.sex === null) {
      return interaction.update({
        content: 'Пользователь не верифицирован',
        components: [],
      });
    }

    const emb = new EmbedBuilder()
      .setTitle(`Пользователь - ${member.user.username}`)
      .setDescription(`**Пользователю была сменена гендерная роль**`)
      .addFields(
        {
          name: 'Пользователь:',
          value: `ID: ${member.id}\nUsername: ${member.user.username}\nPing: <@${member.id}>`,
          inline: true,
        },
        {
          name: 'Саппорт:',
          value: `ID: ${iUser?.id}\nUsername: ${iUser?.user.username}\nPing: <@${iUser?.id}>`,
          inline: true,
        }
      )
      .setColor(0x2b2d31)
      .setThumbnail(member.user.displayAvatarURL({ forceStatic: false }));

    if (user.sex === false) {
      // Был мужчина, стал девочка
      emb.addFields(
        { name: 'Старый гендер', value: '```Мужской```' },
        { name: 'Новый гендер', value: '```Женский```', inline: true }
      );
      await member.roles.add(supConfig.roles.girl);
      await member.roles.remove(supConfig.roles.man);
      user.sex = true;
    } else {
      // Была девочка, стал мужчина
      emb.addFields(
        { name: 'Старый гендер', value: '```Женский```' },
        { name: 'Новый гендер', value: '```Мужской```', inline: true }
      );
      await member.roles.add(supConfig.roles.man);
      await member.roles.remove(supConfig.roles.girl);
      user.sex = false;
    }

    await user.save();
    await interaction.update({ embeds: [emb], components: [] });
  }
}

class HistoryInviteFeature implements IFeature<ButtonInteraction> {
  name = 'historyInvite';

  async run({ interaction }: RunFeatureParams<ButtonInteraction>) {
    const memberId = interaction.customId.split('-')[1];
    const member = await interaction.guild!.members.fetch(memberId);

    const user = await SupUserModel.findOne({
      guild: interaction.guildId!,
      userId: memberId,
    });

    if (!user || user.historyReInvite.length === 0) {
      const embed = new EmbedBuilder()
        .setTitle(`История перезаходов`)
        .setColor(0x2b2d31)
        .setDescription('История перезаходов пустая.');
      return interaction.update({ embeds: [embed], components: [] });
    }

    let currentPage = 0;
    const itemsPerPage = 5;

    const createEmbed = (page: number) => {
      const totalPages = Math.ceil(user.historyReInvite.length / itemsPerPage);
      const startIndex = page * itemsPerPage;
      const endIndex = Math.min(startIndex + itemsPerPage, user.historyReInvite.length);

      const embed = new EmbedBuilder()
        .setTitle(`История перезаходов`)
        .setColor(0x2b2d31)
        .setFooter({ text: `Страница ${page + 1}/${totalPages}` });

      for (let i = startIndex; i < endIndex; i++) {
        const entry = user.historyReInvite[i];
        embed.addFields({
          name: `Запись ${i + 1}`,
          value: `Дата: <t:${Math.floor(entry.date.getTime() / 1000)}:R>\nПричина: ${entry.reason}`,
        });
      }

      return embed;
    };

    const createButtonRow = (page: number) => {
      const totalPages = Math.ceil(user.historyReInvite.length / itemsPerPage);
      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId('prev')
          .setLabel('⬅️ Назад')
          .setStyle(ButtonStyle.Primary)
          .setDisabled(page === 0),
        new ButtonBuilder()
          .setCustomId('next')
          .setLabel('Вперед ➡️')
          .setStyle(ButtonStyle.Primary)
          .setDisabled(page >= totalPages - 1)
      );

      return row;
    };

    const embed = createEmbed(currentPage);
    const row = createButtonRow(currentPage);

    const message = await interaction.update({
      embeds: [embed],
      components: [row],
    });

    const filter = (i: any) =>
      i.isButton() &&
      (i.customId === 'prev' || i.customId === 'next') &&
      i.user.id === interaction.user.id;
    const collector = message.createMessageComponentCollector({
      filter,
      time: 60000,
    });

    collector.on('collect', async (i: ButtonInteraction) => {
      if (i.customId === 'prev') {
        currentPage = Math.max(0, currentPage - 1);
      } else if (i.customId === 'next') {
        const totalPages = Math.ceil(user.historyReInvite.length / itemsPerPage);
        currentPage = Math.min(totalPages - 1, currentPage + 1);
      }

      const newEmbed = createEmbed(currentPage);
      const newRow = createButtonRow(currentPage);

      await i.update({
        embeds: [newEmbed],
        components: [newRow],
      });
    });

    collector.on('end', async () => {
      await message.edit({ components: [] });
    });
  }
}

class RemoveUnverifyFeature implements IFeature<ButtonInteraction> {
  name = 'removeUnverify';

  async run({ interaction }: RunFeatureParams<ButtonInteraction>) {
    const memberId = interaction.customId.split('-')[1];
    const member = await interaction.guild!.members.fetch(memberId);

    if (!member.roles.cache.has(supConfig.roles.unverify)) {
      return interaction.update({
        content: 'У пользователя нет роли unverify',
        components: [],
      });
    }

    await member.roles.remove(supConfig.roles.unverify);

    await interaction.update({ components: [] });
    await interaction.followUp({
      content: `С пользователя ${member.user.username} снята роль unverify`,
      ephemeral: true,
    });
  }
}

class KeysManagerFeature implements IFeature<ButtonInteraction> {
  name = 'keysManager';

  async run({ interaction }: RunFeatureParams<ButtonInteraction>) {
    const memberId = interaction.customId.split('-')[1];
    const member = await interaction.guild!.members.fetch(memberId);

    const hasKey = member.roles.cache.has(supConfig.roles.key);

    if (hasKey) {
      await member.roles.remove(supConfig.roles.key);
      await interaction.update({ components: [] });
      await interaction.followUp({
        content: `У пользователя ${member.user.username} снят ключик`,
        ephemeral: true,
      });
    } else {
      await member.roles.add(supConfig.roles.key);
      await interaction.update({ components: [] });
      await interaction.followUp({
        content: `Пользователю ${member.user.username} выдан ключик`,
        ephemeral: true,
      });
    }
  }
}
