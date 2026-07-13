// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { TransactionList } from './components';

afterEach(cleanup);

interface Row {
  id: string;
  name: string;
}

const columns = [
  { key: 'name', label: 'Name', render: (row: Row) => row.name },
];

describe('TransactionList table semantics', () => {
  it('gives each column header a scope="col" for screen-reader table navigation', () => {
    render(
      <TransactionList
        isMobile={false}
        columns={columns}
        rows={[{ id: '1', name: 'Alpha' }]}
        getKey={(row) => row.id}
      />
    );
    const header = screen.getByRole('columnheader', { name: 'Name' });
    expect(header.getAttribute('scope')).toBe('col');
  });

  it('renders stacked cards instead of a table on mobile', () => {
    render(
      <TransactionList
        isMobile={true}
        columns={columns}
        rows={[{ id: '1', name: 'Alpha' }]}
        getKey={(row) => row.id}
      />
    );
    expect(screen.queryByRole('table')).toBeNull();
    expect(screen.getByText('Alpha')).toBeTruthy();
  });
});
