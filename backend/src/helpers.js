import fs from 'fs-extra';
import { AccessError } from './error';

const databasePath = './database.json';

export function readDatabase() {
  try {
    const data = fs.readFileSync(databasePath, 'utf8');
    return JSON.parse(data);
  } catch {
    throw new AccessError('Cannot access database');
  }
}

export function writeDatabase(data) {
  try {
    fs.writeFileSync(databasePath, JSON.stringify(data, null, 2));
  } catch {
    throw new AccessError('Cannot write to database');
  }
}