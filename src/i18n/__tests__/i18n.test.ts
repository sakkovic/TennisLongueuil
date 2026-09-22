import * as Localization from 'expo-localization';

import { deviceLocale, translate } from '..';
import { translateValidation } from '../validation';

jest.mock('expo-localization', () => ({ getLocales: jest.fn() }));
const getLocales = Localization.getLocales as jest.Mock;

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

  it('speaks French unless the phone is set to English', () => {
    getLocales.mockReturnValue([{ languageCode: 'en' }]);
    expect(deviceLocale()).toBe('en');
    getLocales.mockReturnValue([{ languageCode: 'fr' }]);
    expect(deviceLocale()).toBe('fr');
    getLocales.mockReturnValue([{ languageCode: 'es' }]);
    expect(deviceLocale()).toBe('fr');
    getLocales.mockImplementation(() => {
      throw new Error('unavailable');
    });
    expect(deviceLocale()).toBe('fr');
  });

  it('translates form validation messages', () => {
    expect(translateValidation('Add a number.', 'fr')).toBe('Ajoutez un chiffre.');
    expect(translateValidation('Keep the title under 80 characters.', 'fr')).toBe(
      'Le titre doit faire moins de 80 caractères.',
    );
    expect(translateValidation('Add a number.', 'en')).toBe('Add a number.');
    expect(translateValidation(undefined, 'fr')).toBeUndefined();
  });
});
