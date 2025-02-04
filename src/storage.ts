import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve } from 'path';

export interface Data {
  trackedStreamers: Set<string>;
  notificationChannelId: string | null;
}

const DATA_FILE = resolve('./data.json');

export function loadData(): Data {
  if (existsSync(DATA_FILE)) {
    return JSON.parse(readFileSync(DATA_FILE).toString());
  }
  return {
    trackedStreamers: new Set<string>(),
    notificationChannelId: null
  };
}

export function saveData(data: Data): void {
  writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}
