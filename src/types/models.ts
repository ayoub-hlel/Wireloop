/**
 * Data model types for Wireloop
 * These replace the Firebase model types and are used throughout the application
 */

export interface Settings {
  autoSave: boolean;
  codeFont: string;
  tutorialCompleted: boolean;
  boardType: 'ARDUINO_UNO' | 'ARDUINO_NANO' | 'ARDUINO_MEGA';
  theme?: 'light' | 'dark' | 'auto';
  language?: string;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  workspace: string; // Blockly XML workspace
  boardType: 'ARDUINO_UNO' | 'ARDUINO_NANO' | 'ARDUINO_MEGA';
  userId: string;
  created: number;
  updated: number;
  isPublic: boolean;
  tags?: string[];
}

export interface UserProfile {
  userId: string;
  username: string;
  displayName: string;
  bio?: string;
  avatar?: string;
  website?: string;
  isPublic: boolean;
  created: number;
  updated: number;
}

// Default settings
export const defaultSetting: Settings = {
  autoSave: false,
  codeFont: 'Consolas, "Courier New", monospace',
  tutorialCompleted: false,
  boardType: 'ARDUINO_UNO',
  theme: 'light',
  language: 'en'
};

