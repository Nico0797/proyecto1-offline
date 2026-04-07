import api from './api';
import { Customer, CustomerHistoryResponse } from '../types';

export const customerDetailService = {
  async getCustomerDetail(businessId: number, customerId: number): Promise<Customer> {
    const response = await api.get(`/businesses/${businessId}/customers/${customerId}`);
    return response.data.customer;
  },

  async getCustomerHistory(
    businessId: number,
    customerId: number,
    params?: { page?: number; per_page?: number }
  ): Promise<CustomerHistoryResponse> {
    const response = await api.get(`/businesses/${businessId}/customers/${customerId}/history`, {
      params,
    });
    return response.data;
  },
};
