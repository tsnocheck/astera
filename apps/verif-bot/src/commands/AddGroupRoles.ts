import {
  ICommand,
  logger,
  RunCommandParams,
  VerifRolesModel,
} from '@lolz-bots/shared';
import {
  ApplicationCommandOptionData,
} from 'discord.js';
import {
  ApplicationCommandOptionType,
} from 'discord-api-types/v10';

export default class CreateRooms implements ICommand {
  name = 'addgrouproles';
  description = 'Add group roles';
  preconditions = ['admins-only'];
  options: ApplicationCommandOptionData[] = [
    {
      name: 'role',
      description: 'Role for group',
      type: ApplicationCommandOptionType.Role,
      required: true,
    },
    {
      name: 'group_id',
      description: 'Group id',
      type: ApplicationCommandOptionType.String,
      required: true
    }
  ];

  async run({ interaction }: RunCommandParams) {
    const role = interaction.options.getRole('role')
    const groupId = interaction.options.getString('group_id')

    try {
      const verifRole = await VerifRolesModel.findOne({ roleId: role?.id }) || await VerifRolesModel.create({ roleId: role?.id, groupId: groupId})
      
      await interaction.reply({content: 'Группа для роли была успешна создана', ephemeral:true })
    } catch (err) {
      logger.error('Произошла ошибка при создании группы ролей верификации:' + err)
      return interaction.reply({ content: 'Произошла ошибка при создании группы ролей верификации', ephemeral:true })
    }
  }
}
