export interface SupConfig {
  guildId: string;
  roles: {
    acceptVerify: string[];
    acceptSwapGender: string[];
    acceptRemoveBan: string[];
    acceptRolePtGet: string;
    acceptPrimeTime: string[];
    girl: string;
    man: string;
    unverify: string;
    ban: string;
    key: string;
    support: string;
    supportAdmin: string;
    supportSecurity: string;
    supportCurator: string;
    supportMaster: string;
    acceptSupport: string;
  };
  channels: {
    feedback: string;
    logsInvite: string;
    punishment: string;
    verifyCall: string;
    primeTimeNotify: string;
  };
}

export const supConfig: SupConfig = {
  guildId: '1318821970372198471',
  roles: {
    acceptVerify: ['1450182870126690395'],
    acceptSwapGender: ['1450182870126690395', '1450182869098959052'],
    acceptRemoveBan: ['1450182847779311749'],
    acceptPrimeTime: ['1450182847779311749'],
    acceptRolePtGet: '1450182847779311749',
    girl: '1457542563438264402',
    man: '1457542507671060542',
    unverify: '1450194913667973312',
    ban: '1450182938099581160',
    key: '1459351180592550062',
    support: '1450182847779311749',
    supportAdmin: '1450182823725236275',
    supportSecurity: '1450182829739610184',
    supportCurator: '1450182833737039884',
    supportMaster: '1450182835435475117',
    acceptSupport: '1450182870126690395',
  },
  channels: {
    feedback: '1459347573067354134',
    logsInvite: '1459348164078211144',
    punishment: '1457542857777746082',
    verifyCall: '1450183228009742549',
    primeTimeNotify: '1450183317843345458',
  },
};
