export interface BusinessExpensesQueryParams {
  start_date?: string;
  end_date?: string;
  from?: string;
  to?: string;
  category?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export const getBusinessExpensesPath = (businessId: number) => `/businesses/${businessId}/expenses`;

export const buildBusinessExpensesQueryParams = (
  params?: BusinessExpensesQueryParams
): Record<string, string | number | undefined> => {
  const startDate = params?.start_date || params?.from;
  const endDate = params?.end_date || params?.to;

  return {
    start_date: startDate,
    end_date: endDate,
    from: startDate,
    to: endDate,
    category: params?.category || undefined,
    search: params?.search || undefined,
    page: params?.page,
    limit: params?.limit,
  };
};
