import { describe, expect, it } from 'vitest';
import { shouldShowEditor } from '../components/CustomFieldsSettings';

describe('Custom fields settings editor visibility', () => {
  it('opens an empty create form after Add is selected', () => {
    expect(shouldShowEditor(null, true)).toBe(true);
  });

  it('opens the form while editing an existing item', () => {
    expect(shouldShowEditor('existing-id', false)).toBe(true);
  });

  it('keeps the form closed before create or edit is selected', () => {
    expect(shouldShowEditor(null, false)).toBe(false);
  });
});
