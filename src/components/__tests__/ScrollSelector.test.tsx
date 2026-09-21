import { render, screen, userEvent } from '@testing-library/react-native';

import { ScrollSelector } from '../ScrollSelector';

const OPTIONS = [
  { value: 'a', label: 'Mon', sublabel: 'Sep 21' },
  { value: 'b', label: 'Tue', sublabel: 'Sep 22' },
  { value: 'c', label: 'Wed', sublabel: 'Sep 23' },
];

describe('ScrollSelector', () => {
  it('steps to the next and previous option with the arrows', async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    const { rerender } = await render(
      <ScrollSelector label="Date" options={OPTIONS} value="b" onChange={onChange} />,
    );

    await user.press(screen.getByLabelText('Next Date'));
    expect(onChange).toHaveBeenCalledWith('c');

    rerender(<ScrollSelector label="Date" options={OPTIONS} value="b" onChange={onChange} />);
    await user.press(screen.getByLabelText('Previous Date'));
    expect(onChange).toHaveBeenCalledWith('a');
  });

  it('disables the previous arrow on the first option', async () => {
    await render(<ScrollSelector label="Date" options={OPTIONS} value="a" onChange={jest.fn()} />);
    expect(screen.getByLabelText('Previous Date')).toBeDisabled();
  });
});
