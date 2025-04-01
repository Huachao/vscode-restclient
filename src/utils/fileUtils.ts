import fs from 'fs/promises';
import { Variables } from '../types';

export async function readFile(filePath: string): Promise<string> {
  try {
    return await fs.readFile(filePath, 'utf-8');
  } catch (error) {
    throw new Error(`Failed to read file ${filePath}: ${error}`);
  }
}

export async function loadVariables(filePath: string): Promise<Variables> {
  try {
    const content = await readFile(filePath);
    return JSON.parse(content);
  } catch (error) {
    throw new Error(`Failed to load variables from ${filePath}: ${error}`);
  }
}

export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}