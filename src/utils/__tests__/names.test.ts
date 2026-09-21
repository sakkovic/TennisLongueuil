import { firstName, formatNameList } from '../names';

describe('names', () => {
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
});
