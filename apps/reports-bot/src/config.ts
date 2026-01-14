export interface ReportsConfig {
  guildId: string;
  roles: {
    moderator: string[];
  };
  channels: {
    reports: string; // Канал где будут создаваться ветки
    moderation: string; // Канал для модераторов с принять/отклонить
  };
}

export const reportsConfig: ReportsConfig = {
  guildId: process.env.GUILD_ID || '',
  roles: {
    moderator: process.env.MODERATOR_ROLES?.split(',') || [],
  },
  channels: {
    reports: process.env.REPORTS_CHANNEL || '',
    moderation: process.env.MODERATION_CHANNEL || '',
  },
};
