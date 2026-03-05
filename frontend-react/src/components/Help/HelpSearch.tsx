import { useState } from 'react';
import { Search } from 'lucide-react';

export const HelpSearch = ({ onSearch }: { onSearch: (q: string) => void }) => {
  const [q, setQ] = useState('');
  return (
    <div className="relative">
      <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
      <input
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          onSearch(e.target.value);
        }}
        placeholder="¿Qué quieres hacer?"
        className="w-full pl-12 pr-4 py-3 rounded-2xl bg-white/60 dark:bg-gray-800/60 backdrop-blur border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  );
};
