import {
  IFeature,
  RunFeatureParams,
} from '@lolz-bots/shared';
import {
  EmbedBuilder,
  ButtonBuilder,
  ActionRowBuilder,
  ButtonStyle,
  ModalSubmitInteraction,
  TextChannel,
} from 'discord.js';
import { applicationConfigs, staffConfig } from '../config';

// Базовый класс для обработки модальных окон
class ApplicationModalFeature implements IFeature<ModalSubmitInteraction> {
  name: string;

  constructor(name: string) {
    this.name = name;
  }

  async run({ interaction }: RunFeatureParams<ModalSubmitInteraction>) {
    const questionObject = applicationConfigs.find(
      (item) => item.customId === interaction.customId
    );
    if (!questionObject) return;

    const channel = interaction.guild!.channels.cache.get(
      questionObject.channelId
    ) as TextChannel;
    if (!channel) return;

    let text = '';
    questionObject.questions.forEach((question) => {
      const answer = interaction.fields.getTextInputValue(question.customId);
      text += `**${question.question}**\n\`\`\`${answer}\`\`\`\n`;
    });

    const button = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`accept-${interaction.customId}-${interaction.user.id}`)
        .setLabel('Принять заявку')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`reject-${interaction.customId}-${interaction.user.id}`)
        .setLabel('Отклонить')
        .setStyle(ButtonStyle.Danger)
    );

    const emb = new EmbedBuilder()
      .setTitle(`Заявка от ${interaction.user.username}`)
      .setDescription(
        `**ID: ${interaction.user.id}\nUsername: ${interaction.user.username}\nPing: ${interaction.user}**\n\n${text}`
      )
      .setThumbnail(
        interaction.user.displayAvatarURL({ forceStatic: false })
      )
      .setTimestamp();

    await channel.send({
      content: `<@&${staffConfig.acceptStaffRole[interaction.customId]}>`,
      embeds: [emb],
      components: [button],
    });

    await interaction.reply({
      content: 'Вы успешно отправили заявку! В скором времени с вами свяжутся.',
      ephemeral: true,
    });
  }
}

// Экспортируем фичи для каждого типа заявки
export class ModeratorFeature extends ApplicationModalFeature {
  constructor() {
    super('moderator');
  }
}

export class ControlFeature extends ApplicationModalFeature {
  constructor() {
    super('control');
  }
}

export class SupportFeature extends ApplicationModalFeature {
  constructor() {
    super('support');
  }
}

export class EventmodFeature extends ApplicationModalFeature {
  constructor() {
    super('eventmod');
  }
}

export class ClosemodFeature extends ApplicationModalFeature {
  constructor() {
    super('closemod');
  }
}

export class CreativFeature extends ApplicationModalFeature {
  constructor() {
    super('creativ');
  }
}

export class TribunemodFeature extends ApplicationModalFeature {
  constructor() {
    super('tribunemod');
  }
}

export class ContentmakerFeature extends ApplicationModalFeature {
  constructor() {
    super('contentmaker');
  }
}

export class HelperFeature extends ApplicationModalFeature {
  constructor() {
    super('helper');
  }
}

export class ClanmodFeature extends ApplicationModalFeature {
  constructor() {
    super('clanmod');
  }
}
