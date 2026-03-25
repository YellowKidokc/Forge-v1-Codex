/**
 * Test cases validating production bug fixes.
 * Each test maps to a specific fix applied in this patch.
 */

// ─── Fix 1: XSS in markdown block ID escaping ─────────────────

import { markdownToHtml } from '../lib/markdown';

describe('markdownToHtml block ID escaping', () => {
  test('normal block ID passes through escaped', () => {
    const md = 'Hello world ^abc123';
    const html = markdownToHtml(md);
    expect(html).toContain('data-block-id="abc123"');
    expect(html).toContain('Hello world');
  });

  test('heading with block ID is escaped', () => {
    const md = '## My Heading ^block_1';
    const html = markdownToHtml(md);
    expect(html).toContain('data-block-id="block_1"');
    expect(html).toContain('<h2>');
  });

  test('block ID regex only allows safe characters', () => {
    // The PROMOTED_BLOCK_RE only matches [a-zA-Z0-9_-], so injection chars won't match
    const md = 'Content ^safe-id_123';
    const html = markdownToHtml(md);
    expect(html).toContain('data-block-id="safe-id_123"');
  });
});

// ─── Fix 2: getAiMaxTokens includes 2048 ──────────────────────

import { getAiMaxTokens, clearAiSettingsCache } from '../lib/ai';
import { SETTINGS_STORAGE_KEY } from '../lib/settings';

describe('getAiMaxTokens', () => {
  beforeEach(() => {
    clearAiSettingsCache();
    localStorage.clear();
  });

  test('returns default 2048 when no settings stored', () => {
    expect(getAiMaxTokens()).toBe(2048);
  });

  test('returns 2048 when aiMaxTokens is 2048', () => {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify({ aiMaxTokens: 2048 }));
    expect(getAiMaxTokens()).toBe(2048);
  });

  test('returns 1024 when aiMaxTokens is 1024', () => {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify({ aiMaxTokens: 1024 }));
    expect(getAiMaxTokens()).toBe(1024);
  });

  test('returns 4096 when aiMaxTokens is 4096', () => {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify({ aiMaxTokens: 4096 }));
    expect(getAiMaxTokens()).toBe(4096);
  });

  test('returns 8192 when aiMaxTokens is 8192', () => {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify({ aiMaxTokens: 8192 }));
    expect(getAiMaxTokens()).toBe(8192);
  });

  test('returns default for invalid value', () => {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify({ aiMaxTokens: 999 }));
    expect(getAiMaxTokens()).toBe(2048);
  });

  test('returns default for corrupted JSON', () => {
    localStorage.setItem(SETTINGS_STORAGE_KEY, 'not-json');
    expect(getAiMaxTokens()).toBe(2048);
  });
});

// ─── Fix 3: Settings parsing respects aiUseWorkspaceContext ────

import { parseSettings } from '../lib/settings';

describe('parseSettings aiUseWorkspaceContext', () => {
  test('respects false value', () => {
    const settings = parseSettings(JSON.stringify({ aiUseWorkspaceContext: false }));
    expect(settings.aiUseWorkspaceContext).toBe(false);
  });

  test('respects true value', () => {
    const settings = parseSettings(JSON.stringify({ aiUseWorkspaceContext: true }));
    expect(settings.aiUseWorkspaceContext).toBe(true);
  });

  test('defaults to true when missing', () => {
    const settings = parseSettings(JSON.stringify({}));
    expect(settings.aiUseWorkspaceContext).toBe(true);
  });

  test('defaults to true for non-boolean', () => {
    const settings = parseSettings(JSON.stringify({ aiUseWorkspaceContext: 'yes' }));
    expect(settings.aiUseWorkspaceContext).toBe(true);
  });
});

// ─── Fix 4: Annotation store bounds ───────────────────────────

import { addCanonicalAnchor, addDisplayRule, addExpansionMacro, getAnnotations } from '../lib/annotations';

describe('annotation store size limits', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test('anchors are capped at 500', () => {
    for (let i = 0; i < 510; i++) {
      addCanonicalAnchor({
        label: `anchor-${i}`,
        text: 'test',
        grain: 'selection',
        scope: 'local',
        locked: false,
      });
    }
    const state = getAnnotations();
    expect(state.anchors.length).toBeLessThanOrEqual(500);
  });

  test('display rules are capped at 200', () => {
    for (let i = 0; i < 210; i++) {
      addDisplayRule({
        trigger: `trigger-${i}`,
        color: '#fff',
        shape: 'underline',
        opacity: 1,
        scope: 'local',
      });
    }
    const state = getAnnotations();
    expect(state.displayRules.length).toBeLessThanOrEqual(200);
  });

  test('macros are capped at 200', () => {
    for (let i = 0; i < 210; i++) {
      addExpansionMacro({
        abbreviation: `macro-${i}`,
        expansion: 'test',
        scope: 'local',
      });
    }
    const state = getAnnotations();
    expect(state.macros.length).toBeLessThanOrEqual(200);
  });
});

// ─── Fix 5: Markdown HTML escaping ───────────────────────────

describe('markdownToHtml escaping', () => {
  test('escapes HTML entities in inline text', () => {
    const md = 'This has <script>alert("xss")</script> in it';
    const html = markdownToHtml(md);
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });

  test('escapes code block language attribute', () => {
    const md = '```javascript" onload="alert(1)\ncode\n```';
    const html = markdownToHtml(md);
    // Quotes in the lang are escaped via escapeAttribute, preventing attribute breakout
    expect(html).toContain('&quot;');
    expect(html).not.toContain('class="language-javascript"');
    // The attribute value is safely quoted — no unescaped double quotes
    expect(html).toMatch(/class="language-javascript&quot;[^"]*"/);
  });
});
