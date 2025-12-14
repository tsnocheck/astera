import {
  BotClient,
  IFeature,
  logger,
  UserModel,
  VerifRolesModel,
} from '@lolz-bots/shared';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  EmbedBuilder,
  MessageFlags,
  ModalActionRowComponentBuilder,
  ModalBuilder,
  ModalSubmitInteraction,
  TextChannel,
  TextInputBuilder,
  TextInputStyle,
} from 'discord.js';
import { Response } from '../buttons/VerifyButton';

const codes: Map<string, number> = new Map();
const profiles: Map<string, number> = new Map();

let _interaction: ModalSubmitInteraction;
export default class ConfirmModal implements IFeature<ModalSubmitInteraction> {
  name = 'VerifyModal';
  subfeatures = [new EnterCode(), new EnterCodeModal()];

  async run({
    interaction,
    client,
  }: {
    interaction: ModalSubmitInteraction;
    client: BotClient;
  }) {
    const nickname = interaction.fields.getTextInputValue('nickname');

    try {
      const findUrl = client.api.buildUrl('users/find', [
        {
          key: 'username',
          value: nickname,
        },
        {
          key: 'custom_fields[discord]',
          value: interaction.user.username,
        },
      ]);
      const findResponse = await client.api.sendRequest<Response>(findUrl);
      if (findResponse === null || findResponse?.users.length === 0) {
        return interaction.reply({
          components: [],
          embeds: [],
          content:
            'Не обнаружил пользователя с таким никнеймом или у вас не привязан дискорд.',
          ephemeral: true,
        });
      }
      const user = findResponse.users.find(
        (i: {
          fields?: Array<{ id: string; value: string }>;
          custom_fields?: { discord: string };
        }) =>
          i.fields?.find(
            (f: { id: string; value: string }) => f.id === 'discord',
          )?.value === interaction.user.username ||
          i.custom_fields?.discord === interaction.user.username,
      );


      if (!user) {
        return interaction.reply({
          components: [],
          embeds: [],
          content:
            'Не обнаружил пользователя с таким никнеймом или у вас не привязан дискорд.',
          ephemeral: true,
        });
      }

      await interaction.deferReply({
        ephemeral: true,
      });

      const code = Math.round(1000 + Math.random() * 9000);

      const createConversationUrl = client.api.buildUrl('conversations', [
        { key: 'recipient_id', value: user.user_id },
        { key: 'is_group', value: false },
      ]);

      await client.api.sendRequest(createConversationUrl, {
        body: JSON.stringify({
          message_body: `Ваш код для верификации: ${code}`,
        }),
        method: 'POST',
      });

      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setLabel('Ввести код')
          .setStyle(ButtonStyle.Success)
          .setCustomId('EnterCode'),
      );

      await interaction.editReply({
        components: [row],
        embeds: [],
        content: 'Отправил код в лс',
      });

      _interaction = interaction;
      codes.set(interaction.user.id, code);
      profiles.set(interaction.user.id, findResponse.users[0]?.user_id);
    } catch (e: unknown) {
      logger.error(JSON.stringify(e));
      return interaction.editReply({
        components: [],
        embeds: [],
        content: 'Ошибка API',
      });
    }
  }
}

class EnterCode implements IFeature<ButtonInteraction> {
  name = 'EnterCode';

  async run({ interaction }: { interaction: ButtonInteraction }) {
    const modal = new ModalBuilder()
      .setTitle('Enter Code')
      .setCustomId('EnterCodeModal')
      .setComponents(
        new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(
          new TextInputBuilder()
            .setLabel('Код для верификации')
            .setPlaceholder('1234')
            .setMinLength(4)
            .setMaxLength(4)
            .setStyle(TextInputStyle.Short)
            .setCustomId('code')
            .setRequired(true),
        ),
      );

    await interaction.showModal(modal);
  }
}

class EnterCodeModal implements IFeature<ModalSubmitInteraction> {
  name = 'EnterCodeModal';

  async run({
    interaction,
    client,
  }: {
    interaction: ModalSubmitInteraction;
    client: BotClient;
  }) {
    const code = parseInt(interaction.fields.getTextInputValue('code'));
    const error = new EmbedBuilder().setTitle('Ошибка').setColor('Red');
    await interaction.deferReply({
      flags: [MessageFlags.Ephemeral],
    });
    if (isNaN(code)) {
      error.setDescription('Вводите только цифры.');
      await interaction.editReply({
        components: [],
        content: '',
        embeds: [error],
      });
    }
    const actualCode = codes.get(interaction.user.id);
    if (!actualCode) {
      error.setDescription(
        'Что-то пошло не так и похоже ваш код затерялся. Попробуйте еще раз.',
      );
      await interaction.editReply({
        content: '',
        components: [],
        embeds: [error],
      });
    }
    const logs = (await client.channels.fetch(
      process.env.LOGS_CHANNEL_ID!,
    )) as TextChannel;

    const createUsersUrl = client.api.buildUrl(
      'users' + '/' + profiles.get(interaction.user.id),
      [],
    );


    const userLolz = await client.api.sendRequest<ResponseUser>(
      createUsersUrl,
      {
        method: 'GET',
      },
    );

    const userGroups = userLolz?.user.user_groups;

    const member = await interaction.guild!.members.fetch(interaction.user.id);

    let roles: string[] = [];

    if (!userGroups) {
      error.setDescription(
        'Не удалось получить группы пользователя. Пожалуйста, свяжитесь с поддержкой.',
      );
      await interaction.editReply({
        content: '',
        components: [],
        embeds: [error],
      });
      return;
    }

    for (const group of userGroups) {
      const verifRole = await VerifRolesModel.findOne({
        groupId: group.user_group_id,
      });

      if (verifRole) {
        try {
          await member.roles.add(verifRole.roleId);
          roles.push(verifRole.roleId);
          logger.info(
            `Выдана роль ${verifRole.roleId} для группы ${group.user_group_id} пользователю ${interaction.user.id}`,
          );
        } catch (e) {
          logger.error(`Ошибка при выдаче роли ${verifRole.roleId}:`, e);
        }
      }
    }

    const log = new EmbedBuilder().setTitle('Успешная верификация').setFields([
      {
        name: 'Discord',
        value: interaction.user.username,
      },
      {
        name: 'Профиль',
        value: `https://lolz.live/members/${profiles.get(interaction.user.id)}`,
      },
      {
        name: 'Discord ID',
        value: interaction.user.id,
      },
      {
        name: 'Выданы роли',
        value: roles.map((role) => `<@&${role}>`).join(', ') || 'Нет групп',
      },
    ]);

    await logs.send({
      embeds: [log],
    });
    await UserModel.create({
      discordID: interaction.user.id,
      lolzId: profiles.get(interaction.user.id),
      verified: true,
    });

    const role = await interaction.guild!.roles.fetch(
      process.env.VERIFIED_ROLE_ID!,
    );
    if (role) {
      try {
        const member = await interaction.guild!.members.fetch(
          interaction.user.id,
        );
        await member.roles.add(role.id);
      } catch (e) {
        logger.error(e);
      }
    }

    const unVerifiedRole = await interaction.guild!.roles.fetch(
      process.env.UNVERIFIED_ROLE_ID!,
    );
    if (unVerifiedRole) {
      try {
        const member = await interaction.guild!.members.fetch(
          interaction.user.id,
        );
        await member.roles.remove(unVerifiedRole.id);
      } catch (e) {
        logger.error(e);
      }
    }

    const verifiedEmbed = new EmbedBuilder()
      .setTitle('Успешная верификация')
      .setDescription('Вы успешно прошли верификацию.')
      .setColor('Green');
    await interaction.editReply({
      embeds: [verifiedEmbed],
      components: [],
      content: '',
    });
  }
}

export interface ResponseUser {
  user: {
    user_id: number;
    user_groups: Array<{ user_group_id: number }>;
  }
}
