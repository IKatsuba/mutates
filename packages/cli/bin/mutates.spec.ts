import { renderUsage } from 'citty';

import { main } from './mutates';

describe('mutates bin', () => {
  it('renders usage that mentions the binary name', async () => {
    const usage = await renderUsage(main);
    expect(usage).toContain('mutates');
  });
});
