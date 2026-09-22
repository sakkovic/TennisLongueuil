import { setDateLocale } from '../date';
import { firstName, formatNameList } from '../names';

describe('names', () => {
  beforeEach(() => setDateLocale('en'));

  it('extracts a first name', () => {
    expect(firstName('Mohamed Anis Sakka')).toBe('Mohamed');
    expect(firstName('  Maëlys  ')).toBe('Maëlys');
  });

  it('formats participant lists compactly', () => {
    expect(formatNameList([])).toBe('');
    expect(formatNameList(['Mohamed'])).toBe('Mohamed');
    expect(formatNameList(['Mohamed', 'Alice'])).toBe('Mohamed and Alice');
    expect(formatNameList(['Mohamed', 'Alice', 'Zdenek'])).toBe('Mohamed, Alice and Zdenek');
    expect(formatNameList(['Mohamed', 'Alice', 'Zdenek', 'Maëlys'])).toBe(
      'Mohamed, Alice and 2 others',
    );
  });

  it('uses French conjunctions', () => {
    setDateLocale('fr');
    expect(formatNameList(['Mohamed', 'Alice'])).toBe('Mohamed et Alice');
    expect(formatNameList(['Mohamed', 'Alice', 'Zdenek', 'Maëlys'])).toBe(
      'Mohamed, Alice et 2 autres',
    );
  });
});
