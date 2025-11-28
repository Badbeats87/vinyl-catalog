import axios from 'axios';

// Use relative paths to proxy through Next.js
const API_BASE_URL = '/api';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

// Add auth token to requests if available
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const api = {
  // Auth endpoints
  auth: {
    signup: (data: { email: string; password: string; userType: 'seller' | 'buyer' | 'admin' }) =>
      apiClient.post('/auth/login', { email: data.email, role: data.userType }),
    login: (data: { email: string; password: string; role?: 'seller' | 'buyer' | 'admin' }) =>
      apiClient.post('/auth/login', { email: data.email, role: data.role || 'buyer' }),
    getCurrentUser: () =>
      apiClient.get('/auth/me'),
  },

  // Seller endpoints
  seller: {
    getProfile: () =>
      apiClient.get('/seller/profile'),
    updateProfile: (data: any) =>
      apiClient.put('/seller/profile', data),
    createListing: (data: any) =>
      apiClient.post('/seller/listings', data),
    getListings: () =>
      apiClient.get('/seller/listings'),
    updateListing: (id: string, data: any) =>
      apiClient.put(`/seller/listings/${id}`, data),
    deleteListing: (id: string) =>
      apiClient.delete(`/seller/listings/${id}`),
    getInventory: () =>
      apiClient.get('/seller/inventory'),
  },

  // Buyer endpoints
  buyer: {
    browseCatalog: (params?: any) =>
      apiClient.get('/buyer/catalog', { params }),
    getProductDetails: (id: string) =>
      apiClient.get(`/buyer/catalog/${id}`),
    getCart: () =>
      apiClient.get('/buyer/cart'),
    addToCart: (data: any) =>
      apiClient.post('/buyer/cart/items', data),
    removeFromCart: (itemId: string) =>
      apiClient.delete(`/buyer/cart/items/${itemId}`),
    checkout: (data: any) =>
      apiClient.post('/buyer/checkout', data),
    getOrders: () =>
      apiClient.get('/buyer/orders'),
  },

  // Admin endpoints
  admin: {
    getDashboard: () =>
      apiClient.get('/admin/dashboard'),
    getSubmissions: () =>
      apiClient.get('/admin/submissions'),
    approveSubmission: (id: string) =>
      apiClient.post(`/admin/submissions/${id}/approve`),
    rejectSubmission: (id: string) =>
      apiClient.post(`/admin/submissions/${id}/reject`),
  },
};
