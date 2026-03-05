interface DebtTerm {
    termDays: number;
    dueDate?: string; // Optional specific date override
}

interface DebtTermsState {
    terms: Record<number, DebtTerm>; // saleId -> Term
}

const STORAGE_KEY = 'debt_terms_store';

export const debtTermsStore = {
    getTerm: (saleId: number): DebtTerm => {
        const stored = localStorage.getItem(STORAGE_KEY);
        const data: DebtTermsState = stored ? JSON.parse(stored) : { terms: {} };
        return data.terms[saleId] || { termDays: 15 }; // Default 15 days
    },

    setTerm: (saleId: number, termDays: number) => {
        const stored = localStorage.getItem(STORAGE_KEY);
        const data: DebtTermsState = stored ? JSON.parse(stored) : { terms: {} };
        
        data.terms[saleId] = {
            ...data.terms[saleId],
            termDays
        };
        
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    },

    setDueDate: (saleId: number, dueDate: string) => {
        const stored = localStorage.getItem(STORAGE_KEY);
        const data: DebtTermsState = stored ? JSON.parse(stored) : { terms: {} };
        
        data.terms[saleId] = {
            ...data.terms[saleId],
            dueDate
        };

        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    },
    
    calculateDueDate: (saleDate: string, saleId: number): Date => {
        const term = debtTermsStore.getTerm(saleId);
        if (term.dueDate) return new Date(term.dueDate);
        
        const date = new Date(saleDate);
        date.setDate(date.getDate() + term.termDays);
        return date;
    }
};
