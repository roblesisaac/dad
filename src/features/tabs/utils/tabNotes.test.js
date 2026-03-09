import { describe, expect, test } from 'vitest';
import {
  buildTabViewNoteScopeKey,
  normalizeTabNotesByView,
  normalizeTabViewNoteTemplate,
  resolveTabViewNoteTemplate
} from './tabNotes.js';

describe('tabNotes', () => {
  test('builds a stable scope key from group and drill path', () => {
    expect(buildTabViewNoteScopeKey({
      groupId: 'group-1',
      drillPath: ['Money Out', 'Dining']
    })).toBe('group:group-1|path:money out>dining');
  });

  test('returns empty scope key when group id is missing', () => {
    expect(buildTabViewNoteScopeKey({ drillPath: ['money out'] })).toBe('');
  });

  test('normalizes note templates and drops invalid entries', () => {
    const normalized = normalizeTabNotesByView({
      'group:1|path:root': {
        template: 'You spent {{ money-out }}',
        updatedAt: '2026-03-09T00:00:00.000Z'
      },
      'group:1|path:empty': {
        template: '   '
      },
      invalid: 123,
      '': {
        template: 'No key'
      }
    });

    expect(normalized).toEqual({
      'group:1|path:root': {
        template: 'You spent {{ money-out }}',
        updatedAt: '2026-03-09T00:00:00.000Z'
      }
    });
  });

  test('resolves the current scope note template from a tab', () => {
    const tab = {
      tabNotesByView: {
        'group:group-1|path:root': {
          template: 'Root note'
        },
        'group:group-1|path:money out': {
          template: 'Money out note'
        }
      }
    };

    expect(resolveTabViewNoteTemplate(tab, 'group:group-1|path:money out')).toBe('Money out note');
    expect(resolveTabViewNoteTemplate(tab, 'group:group-1|path:missing')).toBe('');
  });

  test('normalizes template to empty when it only has whitespace', () => {
    expect(normalizeTabViewNoteTemplate('   \n\t  ')).toBe('');
    expect(normalizeTabViewNoteTemplate('Note text')).toBe('Note text');
  });
});
