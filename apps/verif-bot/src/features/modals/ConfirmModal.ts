import { IFeature } from '@lolz-bots/shared';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  EmbedBuilder,
  ModalActionRowComponentBuilder,
  ModalBuilder,
  ModalSubmitInteraction,
  TextChannel,
  TextInputBuilder,
  TextInputStyle,
} from 'discord.js';
import { BotClient } from '@lolz-bots/shared';
import { logger } from '@lolz-bots/shared';
import { Response } from '../buttons/VerifyButton';
import { UserModel, VerifRolesModel } from '@lolz-bots/shared';
import axios from 'axios';

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
      const findResponse = await axios.get<Response>('https://prod-api.lolz.live/users/find', {
        params: {
          username: nickname,
          'custom_fields[discord]': interaction.user.username,
        },
      });

      if (!findResponse.data || findResponse.data.users.length === 0) {
        return interaction.reply({
          components: [],
          embeds: [],
          content:
            'Не обнаружил пользователя с таким никнеймом или у вас не привязан дискорд.',
          ephemeral: true,
        });
      }

      const user = findResponse.data.users.find(
        (i: { fields?: Array<{ id: string; value: string }>; custom_fields?: { discord: string } }) =>
          i.fields?.find((f: { id: string; value: string }) => f.id === 'discord')?.value ===
            interaction.user.username ||
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

      const code = Math.round(1000 + Math.random() * 9000);

      await axios.post(
        'https://prod-api.lolz.live/conversations',
        {
          message_body: `Ваш код для верификации: ${code}`,
        },
        {
          params: {
            recipient_id: user.user_id,
            is_group: false,
          },
        }
      );

      await interaction.deferReply({
        ephemeral: true,
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
      profiles.set(interaction.user.id, findResponse.data.users[0]?.user_id);
    } catch (e) {
      logger.error(e);
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
    if (isNaN(code)) {
      error.setDescription('Вводите только цифры.');
      await _interaction.editReply({
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
      await _interaction.editReply({
        content: '',
        components: [],
        embeds: [error],
      });
    }
    const logs = (await client.channels.fetch(
      process.env.LOGS_CHANNEL_ID!,
    )) as TextChannel;

    const userLolz = await axios.get(
      'https://prod-api.lolz.live/users/' + profiles.get(interaction.user.id)
    );

    const userGroups = userLolz.data.user.user_groups;

    const member = await interaction.guild!.members.fetch(
      interaction.user.id,
    );

    let roles: string[] = []

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
          logger.error(
            `Ошибка при выдаче роли ${verifRole.roleId}:`,
            e,
          );
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
      }
    ]);

    await logs.send({
      embeds: [log],
    });
    await UserModel.create({
      discordId: interaction.user.id,
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
    const verifiedEmbed = new EmbedBuilder()
      .setTitle('Успешная верификация')
      .setDescription('Вы успешно прошли верификацию.')
      .setColor('Green');
    await interaction.deferUpdate();
    await _interaction.editReply({
      embeds: [verifiedEmbed],
      components: [],
      content: '',
    });
  }
}
