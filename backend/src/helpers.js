import fs from 'fs-extra';
import { AccessError } from './error';

export function readDatabase(databasePath) {
  try {
    const data = fs.readFileSync(databasePath, 'utf8');
    return JSON.parse(data);
  } catch {
    throw new AccessError('Cannot access database');
  }
}

export function writeDatabase(databasePath, data) {
  try {
    fs.writeFileSync(databasePath, JSON.stringify(data, null, 2));
  } catch {
    throw new AccessError('Cannot write to database');
  }
}