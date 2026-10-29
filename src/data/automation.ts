export type Platform = 'whatsapp' | 'telegram' | 'discord';

// Describe each integration as official API, third-party library or experimental once confirmed.
export const PLATFORMS: { id: Platform; label: string; color: string; angle: number; detail: string }[] = [
  { id: 'whatsapp', label: 'WhatsApp', color: '#25D366', angle: 150, detail: 'Messaging workflows and automated communication, connected to other application workflows.' },
  { id: 'telegram', label: 'Telegram', color: '#2AABEE', angle: 30, detail: 'Bots with command handling and automated replies, backed by backend services and AI where implemented.' },
  { id: 'discord', label: 'Discord', color: '#5865F2', angle: 270, detail: 'Discord.js bots whose commands and interactions trigger workflows and external services.' },
];

/** Seconds: inbound packet, processing at the hub, outbound reply. Shared by DOM and GL. */
export const SIM_TIMELINE = { inbound: 1, process: 1.1, outbound: 1, total: 3.3 };

export const TRIGGERS: { label: string; firstStep: string }[] = [
  { label: 'Incoming message', firstStep: 'Webhook received' },
  { label: 'Command', firstStep: 'Command event received' },
  { label: 'Scheduled job', firstStep: 'Scheduler fires' },
];
