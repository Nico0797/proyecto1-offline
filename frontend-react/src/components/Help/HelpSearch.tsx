import { useState } from 'react';
import { Search } from 'lucide-react';

export const HelpSearch = ({ onSearch }: { onSearch: (q: string) => void }) => {
  const [query, setQuery] = useState('');

  return (
    <div className="relative">
      <Search className="absolute left-4 top-1/2 -translate-y-1/2 app-text-muted" />
      <input
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          onSearch(event.target.value);
        }}
        placeholder="Que quieres aprender o resolver?"
        className="app-field-surface w-full rounded-2xl py-3 pl-12 pr-4 backdrop-blur focus:outline-none"
      />
    </div>
  );
};
