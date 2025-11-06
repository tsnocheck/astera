import {
  BotClient,
  constructEmbed,
  ICommand,
  IFeature,
  PunishmentModel,
  PunishmentType,
} from '@lolz-bots/shared';
import { ApplicationCommandOptionType } from 'discord-api-types/v10';
import {
  ActionRowBuilder,
  ApplicationCommandOptionData,
  ChatInputCommandInteraction,
  GuildMember,
  MessageFlags,
  StringSelectMenuBuilder,
  StringSelectMenuInteraction,
} from 'discord.js';
import { sendLog } from '../services/send-log';

export default class Unwarn implements ICommand {
  name = 'unwarn';
  description = 'Снять предупреждение с пользователя';
  preconditions = ['moderator-only'];
  features = [new UnwarnSelect()];
  options: ApplicationCommandOptionData[] = [
    {
      name: 'пользователь',
      description: 'Пользователь, с которого вы хотите снять предупреждение',
      type: ApplicationCommandOptionType.User,
      required: true,
    },
  ];

  async run({ interaction }: { interaction: ChatInputCommandInteraction }) {
    const member = interaction.options.getMember('пользователь') as GuildMember;

    if (member.user.bot) {
      await interaction.reply({
        embeds: [
          constructEmbed({
            title: 'Нельзя снимать предупреждения ботам',
            description: 'Вы не можете снять предупреждение с ботов.',
            customType: 'error',
          }),
        ],
        flags: [MessageFlags.Ephemeral],
      });
      return;
    }

    const warns = await PunishmentModel.find({
      userID: member.user.id,
      type: PunishmentType.WARN,
    });
    if (warns.length === 0) {
      await interaction.reply({
        embeds: [
          constructEmbed({
            title: 'Нет предупреждений',
            description: 'У этого пользователя нет предупреждений.',
            customType: 'error',
          }),
        ],
        flags: [MessageFlags.Ephemeral],
      });
      return;
    }
    const embed = constructEmbed({
      title: 'Список предупреждений',
      description: warns
        .map((warn, index) => `${index + 1}. ${warn.reason}`)
        .join('\n'),
      customType: 'info',
    });
    const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('unwarn_select')
        .setPlaceholder('Выберите предупреждение для снятия')
        .addOptions(
          warns.map((warn, index) => ({
            label: `Предупреждение #${index + 1}`,
            value: warn._id.toString(),
          })),
        )
        .setMaxValues(1)
        .setMinValues(1),
    );
    await interaction.reply({
      embeds: [embed],
      components: [row],
      flags: [MessageFlags.Ephemeral],
    });
  }
}

class UnwarnSelect implements IFeature<StringSelectMenuInteraction> {
  name = 'unwarn_select';

  async run({
    interaction,
    client,
  }: {
    interaction: StringSelectMenuInteraction;
    client: BotClient;
  }) {
    const warnId = interaction.values[0];
    const warn = await PunishmentModel.findById(warnId);
    if (!warn) {
      await interaction.reply({
        embeds: [
          constructEmbed({
            title: 'Ошибка',
            description: 'Предупреждение не найдено.',
            customType: 'error',
          }),
        ],
        flags: [MessageFlags.Ephemeral],
      });
      return;
    }

    await PunishmentModel.deleteOne({ _id: warnId });

    await interaction.reply({
      embeds: [
        constructEmbed({
          title: 'Предупреждение снято',
          description: `Предупреждение "${warn.reason}" успешно снято с пользователя ${interaction.user}.`,
          customType: 'success',
        }),
      ],
      flags: [MessageFlags.Ephemeral],
    });

    await sendLog(client, {
      embeds: [
        constructEmbed({
          title: 'Предупреждение снято',
          description: `Предупреждение "${warn.reason}" было снято с пользователя ${interaction.user.tag} (${interaction.user.id}).`,
          customType: 'success',
        }),
      ],
    });
  }
}
