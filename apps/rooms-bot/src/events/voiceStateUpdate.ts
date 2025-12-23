import {
  BotClient,
  IEvent,
  logger,
  PrivateModel,
  RoomModel,
  RoomUserModel,
} from '@lolz-bots/shared';
import { VoiceState, VoiceChannel, ChannelType, PermissionFlagsBits } from 'discord.js';

const voiceMemory = new Map<string, number>();

export default class VoiceStateUpdateEvent implements IEvent {
  name = 'voiceStateUpdate';

  async run(client: BotClient, oldState: VoiceState, newState: VoiceState) {
    const parentRoomId = process.env.PARENT_ROOM_ID;
    const parentPrivateId = process.env.PARENT_PRIVATE_ID;
    const createPrivateRooms = process.env.CREATE_PRIVATE_CHANNEL_ID

    if (newState.channelId === createPrivateRooms) {
      try {
        const guild = newState.guild;
        const member = newState.member;
        
        if (!member || !guild) return;

        let privateModel = await PrivateModel.findOne({ ownerId: member.id }) || await PrivateModel.create({ ownerId: member.id })
        const channel = guild.channels.cache.get(privateModel.roomId!);

        if(!channel){ 
          const privateChannel = await guild.channels.create({
            name: privateModel.name || `${member.user.username}'s room`,
            type: ChannelType.GuildVoice,
            parent: parentPrivateId,
            permissionOverwrites: [
              {
                id: member.id,
                allow: [
                  PermissionFlagsBits.ManageChannels,
                  PermissionFlagsBits.MoveMembers,
                  PermissionFlagsBits.MuteMembers,
                ],
              },
              {
                id: guild.id,
                allow: [PermissionFlagsBits.Connect, PermissionFlagsBits.ViewChannel],
              },
            ],
          });

          await member.voice.setChannel(privateChannel.id);
          privateModel.roomId = privateChannel.id;
          await privateModel.save();
        }
        if (channel && channel.type === ChannelType.GuildVoice) {
          await member.voice.setChannel(channel.id);
          return;
        }
      } catch (error) {
        logger.error('Error creating private room:', error);
      }
    }

    if (oldState.channel && (oldState.channel.parentId === parentRoomId || oldState.channel.parentId === parentPrivateId)) {
      const channel = oldState.guild.channels.cache.get(
        oldState.channel.id,
      ) as VoiceChannel;
      if (channel && channel.members && channel.members.size === 0) {
        await channel
          .delete()
          .catch((err) => logger.error('Failed to delete empty room:', err));
      }
    }

    const init = async () => {
      const joinedAt = new Date().getTime();
      const room = await RoomModel.findOne({ roomId: newState.channel!.id });
      if (!room) return;
      voiceMemory.set(newState.member!.id, joinedAt);
    };

    const save = async () => {
      try {
        const joinedAt = voiceMemory.get(newState.member!.id);
        if (!joinedAt) return;

        const room = await RoomModel.findOne({ roomId: oldState.channel!.id });
        if (!room) return;

        const roomUser = await RoomUserModel.findOne({
          userId: oldState.member!.id,
          _id: { $in: room.users },
        });

        if (!roomUser) return;

        const time = Math.round(Date.now() - joinedAt);

        roomUser.online = (roomUser.online || 0) + time;
        await roomUser.save();
      } catch (error) {
        logger.error('Error saving user data:', error);
      }
    };

    const clear = () => {
      voiceMemory.delete(newState.member!.id);
    };

    if (newState.channel?.parentId === parentRoomId) {
      if (oldState.channel && !newState.channel) {
        await save();
        clear();
      } else if (!oldState.channel && newState.channel) {
        await init();
      } else if (!oldState.selfDeaf && newState.selfDeaf) {
        await save();
        clear();
      } else if (oldState.selfDeaf && !newState.selfDeaf) {
        await init();
      } else if (!oldState.selfMute && newState.selfMute) {
        await save();
        await init();
      } else if (oldState.selfMute && !newState.selfMute) {
        await save();
        await init();
      } else if (
        oldState.channel &&
        newState.channel &&
        oldState.channel.id !== newState.channel.id
      ) {
        await save();
        await init();
      }
    } else {
      if (oldState.channel?.parentId === parentRoomId) {
        await save();
        clear();
      }
    }
  }
}
