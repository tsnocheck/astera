import { EmbedBuilder, EmbedData } from 'discord.js';

interface ConstructEmbedOptions extends EmbedData {
  customType: 'info' | 'error' | 'success';
}

const map = {
  info: 0xff9304,
  error: 0x884444,
  success: 0x2bad72,
};

export function constructEmbed(data: ConstructEmbedOptions) {
  return new EmbedBuilder({ ...data, color: map[data.customType] });
}
