import { useState } from 'react';
import { Search } from 'lucide-react';

export const HelpSearch = ({ onSearch }: { onSearch: (q: string) => void }) => {
  const [query, setQuery] = useState('');

  return (
    <div className="relative">
      <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
      <input
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          onSearch(event.target.value);
        }}
        placeholder="Que quieres aprender o resolver?"
        className="w-full rounded-2xl border border-gray-200 bg-white/60 py-3 pl-12 pr-4 text-gray-900 backdrop-blur placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800/60 dark:text-white"
      />
    </div>
  );
};
