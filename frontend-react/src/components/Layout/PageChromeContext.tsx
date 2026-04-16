import React, { createContext, useContext, useState, useCallback } from 'react';

export type PageChromeHeader = {
  title: string;
  description?: string;
  action?: React.ReactNode;
};

type PageChromeContextType = {
  header: PageChromeHeader | null;
  setHeader: (header: PageChromeHeader | null) => void;
};

const PageChromeContext = createContext<PageChromeContextType | null>(null);

export const PageChromeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [header, setHeaderState] = useState<PageChromeHeader | null>(null);

  const setHeader = useCallback((newHeader: PageChromeHeader | null) => {
    setHeaderState(newHeader);
  }, []);

  return (
    <PageChromeContext.Provider value={{ header, setHeader }}>
      {children}
    </PageChromeContext.Provider>
  );
};

export const usePageChrome = () => {
  const context = useContext(PageChromeContext);
  if (!context) {
    throw new Error('usePageChrome must be used within PageChromeProvider');
  }
  return context;
};
