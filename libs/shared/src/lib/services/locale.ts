import * as process from 'node:process';

export function locale(
  lang: string,
  phrase: string,
  args?: { [key: string]: any },
): string {
  const language = lang.toLowerCase();
  const phrases = JSON.parse(
    require('fs').readFileSync(
      `${process.cwd()}/locale/${language}.json`,
      'utf-8',
    ),
  );
  const keys = phrase.split('.');
  let result = phrases;
  for (const key of keys) {
    result = result[key];
  }
  if (args) {
    for (const key of Object.keys(args)) {
      result = result.replace(`%${key}%`, args[key]);
    }
  }
  return result;
}
