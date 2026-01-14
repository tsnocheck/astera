export interface Question {
  customId: string;
  question: string;
  style: 'short' | 'paragraph';
  placeholder: string;
}

export interface ApplicationConfig {
  name: string;
  customId: string;
  emojy: string;
  channelId: string;
  questions: Question[];
}

export interface StaffConfig {
  staffRole: Record<string, string>;
  acceptStaffRole: Record<string, string>;
  logsChannel: string;
  rolesAddBanList: string[];
  interviewChannelsId: string[];
  allowedUsers: string[];
}

export const staffConfig: StaffConfig = {
  staffRole: {
    moderator:'1450182869098959052',
    control: '1455651088861495458',
    support: '1450182870126690395',
    eventmod:'1450182878007787613',
    closemod: '1450182872551002113',
    creativ: '1450182876829192263',
    tribunemod: '1450182880125779968',
    contentmaker: '1450182875642073118',
    helper: '1458164916677509322',
    clanmod: '1458165032817791029',
    staff: '1450182884349448346'
  },
  acceptStaffRole: {
    moderator: '1450182843832598631',
    control: '1458167264410075436',
    support: '1450182847779311749',
    eventmod: '1450182846504370467',
    closemod: '1450182848916095219',
    creativ: '1450182850237304943',
    tribunemod: '1450182845329838151',
    contentmaker: '1450182851675947048',
    helper: '1458165795279474748',
    clanmod: '1458165982064414935',
  },
  logsChannel: '1194679128805355520',
  rolesAddBanList: [
    '1450182823725236275',
    '1450182829739610184',
    '1450182833737039884'
  ],
  interviewChannelsId: [
    '1450183511087649049',
    '1450183515026100345',
    '1450183519190913064',
    '1450183522219327631'
  ],
  allowedUsers: ['232476435451740160'],
};

export const applicationConfigs: ApplicationConfig[] = [
  {
    name: 'Moderator',
    customId: 'moderator',
    emojy: '<:Dot:1234095596802015283>',
    channelId: '1459353772403720192',
    questions: [
      {
        customId: 'question1',
        question: 'Ваше имя, возраст и часовой пояс?',
        style: 'short',
        placeholder: 'Например: Андрей, 18, +1 от МСК'
      },
      {
        customId: 'question2',
        question: 'Пик активности в сутках ?',
        style: 'short',
        placeholder: 'Например: 16 часов'
      },
      {
        customId: 'question3',
        question: 'Был ли опыт на этой должности и какой ?',
        style: 'short',
        placeholder: 'Например: Стоял на серверах...'
      },
      {
        customId: 'question4',
        question: 'Знание правил платформы (1-10)',
        style: 'short',
        placeholder: 'Например: 5/10'
      },
      {
        customId: 'question5',
        question: 'Какой у вас прайм тайм',
        style: 'paragraph',
        placeholder: 'Например: c 10-16'
      }
    ]
  },
  {
    name: 'Control',
    customId: 'control',
    emojy: '<:Dot:1234095596802015283>',
    channelId: '1459353720641949901',
    questions: [
      {
        customId: 'question1',
        question: 'Ваше имя, возраст и часовой пояс?',
        style: 'short',
        placeholder: 'Например: Андрей, 18, +1 от МСК'
      },
      {
        customId: 'question2',
        question: 'Пик активности в сутках ?',
        style: 'short',
        placeholder: 'Например: 16 часов'
      },
      {
        customId: 'question3',
        question: 'Был ли опыт на этой должности и какой ?',
        style: 'short',
        placeholder: 'Например: Стоял на серверах...'
      },
      {
        customId: 'question4',
        question: 'Знание правил платформы (1-10)',
        style: 'short',
        placeholder: 'Например: 5/10'
      },
      {
        customId: 'question5',
        question: 'Какой у вас прайм тайм',
        style: 'paragraph',
        placeholder: 'Например: c 10-16'
      }
    ]
  },
  {
    name: 'Support',
    customId: 'support',
    emojy: '<:Dot:1234095596802015283>',
    channelId: '1459353606472990794',
    questions: [
      {
        customId: 'question1',
        question: 'Ваше имя, возраст и часовой пояс?',
        style: 'short',
        placeholder: 'Например: Андрей, 18, +1 от МСК'
      },
      {
        customId: 'question2',
        question: 'Пик активности в сутках ?',
        style: 'short',
        placeholder: 'Например: 16 часов'
      },
      {
        customId: 'question3',
        question: 'Был ли опыт на этой должности и какой ?',
        style: 'short',
        placeholder: 'Например: Стоял на серверах...'
      },
      {
        customId: 'question4',
        question: 'Знание правил платформы (1-10)',
        style: 'short',
        placeholder: 'Например: 5/10'
      },
      {
        customId: 'question5',
        question: 'Какой у вас прайм тайм',
        style: 'paragraph',
        placeholder: 'Например: c 10-16'
      }
    ]
  },
  {
    name: 'Eventmod',
    customId: 'eventmod',
    emojy: '<:Dot:1234095596802015283>',
    channelId: '1459353429804716307',
    questions: [
      {
        customId: 'question1',
        question: 'Ваше имя, возраст и часовой пояс?',
        style: 'short',
        placeholder: 'Например: Андрей, 18, +1 от МСК'
      },
      {
        customId: 'question2',
        question: 'Пик активности в сутках ?',
        style: 'short',
        placeholder: 'Например: 16 часов'
      },
      {
        customId: 'question3',
        question: 'Был ли опыт на этой должности и какой ?',
        style: 'short',
        placeholder: 'Например: Стоял на серверах...'
      },
      {
        customId: 'question4',
        question: 'Знание правил платформы (1-10)',
        style: 'short',
        placeholder: 'Например: 5/10'
      },
      {
        customId: 'question5',
        question: 'Какой у вас прайм тайм',
        style: 'paragraph',
        placeholder: 'Например: c 10-16'
      }
    ]
  },
  {
    name: 'Closemod',
    customId: 'closemod',
    emojy: '<:Dot:1234095596802015283>',
    channelId: '1459353254109646990',
    questions: [
      {
        customId: 'question1',
        question: 'Ваше имя, возраст и часовой пояс?',
        style: 'short',
        placeholder: 'Например: Андрей, 18, +1 от МСК'
      },
      {
        customId: 'question2',
        question: 'Пик активности в сутках ?',
        style: 'short',
        placeholder: 'Например: 16 часов'
      },
      {
        customId: 'question3',
        question: 'Был ли опыт на этой должности и какой ?',
        style: 'short',
        placeholder: 'Например: Стоял на серверах...'
      },
      {
        customId: 'question4',
        question: 'По какой игре(ам) будете проводить клозы?',
        style: 'short',
        placeholder: 'Например: Valorant, Dota 2'
      },
      {
        customId: 'question5',
        question: 'Какой у вас прайм тайм',
        style: 'paragraph',
        placeholder: 'Например: c 10-16'
      }
    ]
  },
  {
    name: 'Creative',
    customId: 'creativ',
    emojy: '<:Dot:1234095596802015283>',
    channelId: '1459353159418777600',
    questions: [
      {
        customId: 'question1',
        question: 'Ваше имя, возраст и часовой пояс?',
        style: 'short',
        placeholder: 'Например: Андрей, 18, +1 от МСК'
      },
      {
        customId: 'question2',
        question: 'Пик активности в сутках ?',
        style: 'short',
        placeholder: 'Например: 16 часов'
      },
      {
        customId: 'question3',
        question: 'Был ли опыт на этой должности и какой ?',
        style: 'short',
        placeholder: 'Например: Стоял на серверах...'
      },
      {
        customId: 'question4',
        question: 'Знание правил платформы (1-10)',
        style: 'short',
        placeholder: 'Например: 5/10'
      },
      {
        customId: 'question5',
        question: 'Какой у вас прайм тайм',
        style: 'paragraph',
        placeholder: 'Например: c 10-16'
      }
    ]
  },
  {
    name: 'Tribunemod',
    customId: 'tribunemod',
    emojy: '<:Dot:1234095596802015283>',
    channelId: '1459353025771606188',
    questions: [
      {
        customId: 'question1',
        question: 'Ваше имя, возраст и часовой пояс?',
        style: 'short',
        placeholder: 'Например: Андрей, 18, +1 от МСК'
      },
      {
        customId: 'question2',
        question: 'Пик активности в сутках ?',
        style: 'short',
        placeholder: 'Например: 16 часов'
      },
      {
        customId: 'question3',
        question: 'Был ли опыт на этой должности и какой ?',
        style: 'short',
        placeholder: 'Например: Стоял на серверах...'
      },
      {
        customId: 'question4',
        question: 'Знание правил платформы (1-10)',
        style: 'short',
        placeholder: 'Например: 5/10'
      },
      {
        customId: 'question5',
        question: 'Какой у вас прайм тайм',
        style: 'paragraph',
        placeholder: 'Например: c 10-16'
      }
    ]
  },
  {
    name: 'Contentmaker',
    customId: 'contentmaker',
    emojy: '<:Dot:1234095596802015283>',
    channelId: '1459352907353817228',
    questions: [
      {
        customId: 'question1',
        question: 'Ваше имя, возраст и часовой пояс?',
        style: 'short',
        placeholder: 'Например: Андрей, 18, +1 от МСК'
      },
      {
        customId: 'question2',
        question: 'Пик активности в сутках ?',
        style: 'short',
        placeholder: 'Например: 16 часов'
      },
      {
        customId: 'question3',
        question: 'Был ли опыт на этой должности и какой ?',
        style: 'short',
        placeholder: 'Например: Стоял на серверах...'
      },
      {
        customId: 'question4',
        question: 'Знание правил платформы (1-10)',
        style: 'short',
        placeholder: 'Например: 5/10'
      },
      {
        customId: 'question5',
        question: 'Какой у вас прайм тайм',
        style: 'paragraph',
        placeholder: 'Например: c 10-16'
      }
    ]
  },
  {
    name: 'Helper',
    customId: 'helper',
    emojy: '<:Dot:1234095596802015283>',
    channelId: '1459352305655611443',
    questions: [
      {
        customId: 'question1',
        question: 'Ваше имя, возраст и часовой пояс?',
        style: 'short',
        placeholder: 'Например: Андрей, 18, +1 от МСК'
      },
      {
        customId: 'question2',
        question: 'Пик активности в сутках ?',
        style: 'short',
        placeholder: 'Например: 16 часов'
      },
      {
        customId: 'question3',
        question: 'Был ли опыт на этой должности и какой ?',
        style: 'short',
        placeholder: 'Например: Стоял на серверах...'
      },
      {
        customId: 'question4',
        question: 'Знание правил платформы (1-10)',
        style: 'short',
        placeholder: 'Например: 5/10'
      },
      {
        customId: 'question5',
        question: 'Какой у вас прайм тайм',
        style: 'paragraph',
        placeholder: 'Например: c 10-16'
      }
    ]
  },
  {
    name: 'Clanmod',
    customId: 'clanmod',
    emojy: '<:Dot:1234095596802015283>',
    channelId: '1459352253398782043',
    questions: [
      {
        customId: 'question1',
        question: 'Ваше имя, возраст и часовой пояс?',
        style: 'short',
        placeholder: 'Например: Андрей, 18, +1 от МСК'
      },
      {
        customId: 'question2',
        question: 'Пик активности в сутках ?',
        style: 'short',
        placeholder: 'Например: 16 часов'
      },
      {
        customId: 'question3',
        question: 'Был ли опыт на этой должности и какой ?',
        style: 'short',
        placeholder: 'Например: Стоял на серверах...'
      },
      {
        customId: 'question4',
        question: 'Знание правил платформы (1-10)',
        style: 'short',
        placeholder: 'Например: 5/10'
      },
      {
        customId: 'question5',
        question: 'Какой у вас прайм тайм',
        style: 'paragraph',
        placeholder: 'Например: c 10-16'
      }
    ]
  }
];
