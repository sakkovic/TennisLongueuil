import { render, screen } from '@testing-library/react-native';

import { LevelBadge } from '../Badges';
import { CapacityIndicator } from '../CapacityIndicator';

describe('CapacityIndicator', () => {
  it('shows the count and one spot remaining', async () => {
    await render(<CapacityIndicator registered={3} capacity={4} />);
    expect(screen.getByText('3 / 4')).toBeTruthy();
    expect(screen.getByText('1 spot remaining')).toBeTruthy();
    expect(screen.getByLabelText('3 of 4 players registered. 1 spot remaining.')).toBeTruthy();
  });

  it('uses the plural for several spots', async () => {
    await render(<CapacityIndicator registered={1} capacity={8} />);
    expect(screen.getByText('7 spots remaining')).toBeTruthy();
  });

  it('shows FULL at capacity', async () => {
    await render(<CapacityIndicator registered={4} capacity={4} />);
    expect(screen.getByText('4 / 4')).toBeTruthy();
    expect(screen.getByText('Full')).toBeTruthy();
    expect(screen.queryByText(/remaining/)).toBeNull();
  });
});

describe('LevelBadge', () => {
  it('shows the level name, or a neutral label when none is assigned', async () => {
    await render(<LevelBadge name="Intermediate" rank={20} />);
    expect(screen.getByText('Intermediate')).toBeTruthy();

    await render(<LevelBadge name={null} />);
    expect(screen.getByText('Level not set')).toBeTruthy();
  });
});
