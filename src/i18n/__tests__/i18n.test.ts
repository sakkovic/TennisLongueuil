import { translate } from '..';

describe('i18n', () => {
  it('returns English copy by default for known keys', () => {
    expect(translate('en', 'joinLesson')).toBe('Join lesson');
    expect(translate('en', 'pendingOther', { count: 3 })).toBe(
      '3 people are waiting for your approval.',
    );
  });

  it('returns French copy for the same keys', () => {
    expect(translate('fr', 'joinLesson')).toBe('S’inscrire');
    expect(translate('fr', 'pendingOther', { count: 3 })).toBe(
      '3 personnes attendent votre approbation.',
    );
  });
});
