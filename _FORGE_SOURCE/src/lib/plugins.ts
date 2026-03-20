/**
 * FORGE Plugin Platform
 *
 * Developer drops a plugin into plugins/, enables in Settings,
 * sees new commands/panels/dock actions immediately. No app rebuild.
 *
 * Architecture:
 * - Plugin manifest: JSON with id, name, version, entry, permissions, contributes
 * - Capability-based API: plugins request explicit permissions
 * - Command + panel + dock contributions
 * - Enable/disable with localStorage persistence
 */

// ─── Types ───────────────────────────────────────────────────

export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  description?: string;
  author?: string;
  forgeApiVersion: string;
  entry: string;
  permissions: PluginPermission[];
  contributes: PluginContributions;
}

export type PluginPermission =
  | 'notes.read'
  | 'notes.write'
  | 'vault.search'
  | 'ai.chat'
  | 'ai.context.read'
  | 'ui.panel.register'
  | 'ui.command.register'
  | 'launcher.open'
  | 'files.open_path'
  | 'network.http';

export interface PluginCommand {
  id: string;
  title: string;
  keybinding?: string;
}

export interface PluginPanel {
  id: string;
  title: string;
  icon?: string;
}

export interface PluginDockItem {
  id: string;
  title: string;
  icon?: string;
}

export interface PluginContributions {
  commands?: PluginCommand[];
  panels?: PluginPanel[];
  dock?: PluginDockItem[];
}

export interface PluginInstance {
  manifest: PluginManifest;
  enabled: boolean;
  loaded: boolean;
  error?: string;
}

// ─── Storage ─────────────────────────────────────────────────

const PLUGINS_KEY = 'forge_plugins';
const ENABLED_KEY = 'forge_plugins_enabled';

export function getRegisteredPlugins(): PluginInstance[] {
  try {
    return JSON.parse(localStorage.getItem(PLUGINS_KEY) || '[]');
  } catch { return []; }
}

export function saveRegisteredPlugins(plugins: PluginInstance[]): void {
  localStorage.setItem(PLUGINS_KEY, JSON.stringify(plugins));
}

export function getEnabledPluginIds(): string[] {
  try {
    return JSON.parse(localStorage.getItem(ENABLED_KEY) || '[]');
  } catch { return []; }
}

export function setPluginEnabled(pluginId: string, enabled: boolean): void {
  const list = getEnabledPluginIds();
  const updated = enabled
    ? [...new Set([...list, pluginId])]
    : list.filter(id => id !== pluginId);
  localStorage.setItem(ENABLED_KEY, JSON.stringify(updated));

  // Also update the plugin instance
  const plugins = getRegisteredPlugins();
  saveRegisteredPlugins(plugins.map(p =>
    p.manifest.id === pluginId ? { ...p, enabled } : p
  ));
}

// ─── Manifest Validation ─────────────────────────────────────

export function validateManifest(json: unknown): { valid: boolean; manifest?: PluginManifest; error?: string } {
  if (!json || typeof json !== 'object') {
    return { valid: false, error: 'Manifest must be a JSON object' };
  }

  const obj = json as Record<string, unknown>;

  if (typeof obj.id !== 'string' || !obj.id.trim()) {
    return { valid: false, error: 'Missing required field: id' };
  }
  if (typeof obj.name !== 'string' || !obj.name.trim()) {
    return { valid: false, error: 'Missing required field: name' };
  }
  if (typeof obj.version !== 'string') {
    return { valid: false, error: 'Missing required field: version' };
  }
  if (typeof obj.forgeApiVersion !== 'string') {
    return { valid: false, error: 'Missing required field: forgeApiVersion' };
  }
  if (typeof obj.entry !== 'string') {
    return { valid: false, error: 'Missing required field: entry' };
  }

  const validPermissions: PluginPermission[] = [
    'notes.read', 'notes.write', 'vault.search',
    'ai.chat', 'ai.context.read',
    'ui.panel.register', 'ui.command.register',
    'launcher.open', 'files.open_path', 'network.http',
  ];

  const permissions = Array.isArray(obj.permissions)
    ? (obj.permissions as string[]).filter(p => validPermissions.includes(p as PluginPermission)) as PluginPermission[]
    : [];

  const contributes: PluginContributions = {};
  if (obj.contributes && typeof obj.contributes === 'object') {
    const c = obj.contributes as Record<string, unknown>;
    if (Array.isArray(c.commands)) {
      contributes.commands = c.commands
        .filter((cmd: any) => cmd && typeof cmd.id === 'string' && typeof cmd.title === 'string')
        .map((cmd: any) => ({ id: cmd.id, title: cmd.title, keybinding: cmd.keybinding }));
    }
    if (Array.isArray(c.panels)) {
      contributes.panels = c.panels
        .filter((p: any) => p && typeof p.id === 'string' && typeof p.title === 'string')
        .map((p: any) => ({ id: p.id, title: p.title, icon: p.icon }));
    }
    if (Array.isArray(c.dock)) {
      contributes.dock = c.dock
        .filter((d: any) => d && typeof d.id === 'string' && typeof d.title === 'string')
        .map((d: any) => ({ id: d.id, title: d.title, icon: d.icon }));
    }
  }

  const manifest: PluginManifest = {
    id: obj.id as string,
    name: obj.name as string,
    version: obj.version as string,
    description: typeof obj.description === 'string' ? obj.description : undefined,
    author: typeof obj.author === 'string' ? obj.author : undefined,
    forgeApiVersion: obj.forgeApiVersion as string,
    entry: obj.entry as string,
    permissions,
    contributes,
  };

  return { valid: true, manifest };
}

// ─── Plugin Registration ─────────────────────────────────────

export function registerPlugin(manifest: PluginManifest): PluginInstance {
  const plugins = getRegisteredPlugins();

  // Check for duplicate ID
  const existing = plugins.findIndex(p => p.manifest.id === manifest.id);
  const instance: PluginInstance = {
    manifest,
    enabled: false,
    loaded: false,
  };

  if (existing >= 0) {
    plugins[existing] = { ...instance, enabled: plugins[existing].enabled };
  } else {
    plugins.push(instance);
  }

  saveRegisteredPlugins(plugins);
  return instance;
}

export function unregisterPlugin(pluginId: string): void {
  saveRegisteredPlugins(getRegisteredPlugins().filter(p => p.manifest.id !== pluginId));
  setPluginEnabled(pluginId, false);
}

// ─── Get All Contributed Commands ────────────────────────────

export function getAllPluginCommands(): (PluginCommand & { pluginId: string; pluginName: string })[] {
  const commands: (PluginCommand & { pluginId: string; pluginName: string })[] = [];
  for (const plugin of getRegisteredPlugins()) {
    if (!plugin.enabled) continue;
    if (!plugin.manifest.contributes.commands) continue;
    for (const cmd of plugin.manifest.contributes.commands) {
      commands.push({
        ...cmd,
        pluginId: plugin.manifest.id,
        pluginName: plugin.manifest.name,
      });
    }
  }
  return commands;
}

export function getAllPluginPanels(): (PluginPanel & { pluginId: string; pluginName: string })[] {
  const panels: (PluginPanel & { pluginId: string; pluginName: string })[] = [];
  for (const plugin of getRegisteredPlugins()) {
    if (!plugin.enabled) continue;
    if (!plugin.manifest.contributes.panels) continue;
    for (const panel of plugin.manifest.contributes.panels) {
      panels.push({
        ...panel,
        pluginId: plugin.manifest.id,
        pluginName: plugin.manifest.name,
      });
    }
  }
  return panels;
}

export function getAllPluginDockItems(): (PluginDockItem & { pluginId: string; pluginName: string })[] {
  const items: (PluginDockItem & { pluginId: string; pluginName: string })[] = [];
  for (const plugin of getRegisteredPlugins()) {
    if (!plugin.enabled) continue;
    if (!plugin.manifest.contributes.dock) continue;
    for (const dock of plugin.manifest.contributes.dock) {
      items.push({
        ...dock,
        pluginId: plugin.manifest.id,
        pluginName: plugin.manifest.name,
      });
    }
  }
  return items;
}

// ─── Example Built-in Plugins ────────────────────────────────
// Seed with example plugins so the system isn't empty

export function seedExamplePlugins(): void {
  const plugins = getRegisteredPlugins();
  if (plugins.length > 0) return;

  const examples: PluginManifest[] = [
    {
      id: 'forge.word-count',
      name: 'Word Count',
      version: '1.0.0',
      description: 'Shows word and character count for the current document',
      author: 'FORGE',
      forgeApiVersion: '1.x',
      entry: 'word-count.js',
      permissions: ['notes.read', 'ui.command.register'],
      contributes: {
        commands: [
          { id: 'word-count.show', title: 'Show Word Count' },
        ],
      },
    },
    {
      id: 'forge.quick-template',
      name: 'Quick Templates',
      version: '1.0.0',
      description: 'Insert common document templates with one command',
      author: 'FORGE',
      forgeApiVersion: '1.x',
      entry: 'templates.js',
      permissions: ['notes.read', 'notes.write', 'ui.command.register'],
      contributes: {
        commands: [
          { id: 'template.meeting', title: 'Insert Meeting Template' },
          { id: 'template.journal', title: 'Insert Journal Template' },
          { id: 'template.research', title: 'Insert Research Template' },
        ],
      },
    },
    {
      id: 'forge.ai-summarizer',
      name: 'AI Summarizer',
      version: '1.0.0',
      description: 'Summarize documents or selections using AI',
      author: 'FORGE',
      forgeApiVersion: '1.x',
      entry: 'summarizer.js',
      permissions: ['notes.read', 'ai.chat', 'ui.command.register', 'ui.panel.register'],
      contributes: {
        commands: [
          { id: 'summarizer.summarize', title: 'Summarize Document' },
          { id: 'summarizer.tldr', title: 'TL;DR Selection' },
        ],
        panels: [
          { id: 'summarizer.panel', title: 'Summaries', icon: 'FileText' },
        ],
      },
    },
  ];

  for (const manifest of examples) {
    registerPlugin(manifest);
  }
}

// ─── Permission Labels ───────────────────────────────────────

export const PERMISSION_LABELS: Record<PluginPermission, string> = {
  'notes.read': 'Read notes and files',
  'notes.write': 'Write and modify notes',
  'vault.search': 'Search across vault',
  'ai.chat': 'Use AI chat capabilities',
  'ai.context.read': 'Read AI context',
  'ui.panel.register': 'Register custom panels',
  'ui.command.register': 'Register commands',
  'launcher.open': 'Open external resources',
  'files.open_path': 'Access file system paths',
  'network.http': 'Make HTTP requests',
};

export const PERMISSION_RISK: Record<PluginPermission, 'low' | 'medium' | 'high'> = {
  'notes.read': 'low',
  'notes.write': 'medium',
  'vault.search': 'low',
  'ai.chat': 'low',
  'ai.context.read': 'low',
  'ui.panel.register': 'low',
  'ui.command.register': 'low',
  'launcher.open': 'medium',
  'files.open_path': 'high',
  'network.http': 'high',
};
