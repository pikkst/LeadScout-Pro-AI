import { describe, expect, it } from 'vitest';
import { appendComplianceFooter } from '../server/services/email.service';

describe('outreach compliance footer', () => {
  it('adds one-click unsubscribe to HTML and plain text', () => {
    const result = appendComplianceFooter('<html><body><p>Hello</p></body></html>', 'Hello', 'https://sales.example/unsubscribe/token');
    expect(result.html).toContain('Unsubscribe from future outreach');
    expect(result.html.indexOf('Unsubscribe')).toBeLessThan(result.html.indexOf('</body>'));
    expect(result.text).toContain('https://sales.example/unsubscribe/token');
  });

  it('escapes an unsubscribe capability before inserting it into HTML', () => {
    const result = appendComplianceFooter('<p>Hello</p>', 'Hello', 'https://example.test/unsubscribe/a&b="c"');
    expect(result.html).toContain('a&amp;b=&quot;c&quot;');
    expect(result.html).not.toContain('a&b="c"');
  });

  it('leaves non-outreach system messages unchanged without a capability', () => {
    expect(appendComplianceFooter('<p>System</p>', 'System')).toEqual({ html: '<p>System</p>', text: 'System' });
  });
});
