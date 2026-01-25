import axios from 'axios';

// 1. CRÉATION DE L'INSTANCE API (Export indispensable)
export const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 40000,
});

// 2. INTERCEPTEURS (Sécurité & Nettoyage)
api.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      let token = localStorage.getItem('token');
      
      // NETTOYAGE : On enlève les guillemets parasites s'ils existent
      if (token && token.startsWith('"') && token.endsWith('"')) {
        token = token.slice(1, -1);
      }

      // SÉCURITÉ : On s'assure qu'on n'envoie pas le mot "undefined" ou "null"
      if (token && token !== 'undefined' && token !== 'null' && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Gestion intelligente de la déconnexion
    const isLogin = error.config?.url?.includes('/auth/login');
    if (error.response?.status === 401 && !isLogin) {
      if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
        // Nettoyage et redirection
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// 3. EXPORTS DES FONCTIONS MÉTIERS (CONSERVÉS INTÉGRALEMENT)
export const getContractData = async (leaseId: string) => api.get(`/owner/contract/${leaseId}`);
export const getReceiptData = async (paymentId: string) => api.get(`/owner/receipt/${paymentId}`);
export const getFormalNoticeData = async (leaseId: string) => api.get(`/owner/formal-notice/${leaseId}`);
export const getPosterData = async (propertyId: string) => api.get(`/owner/poster/${propertyId}`);

export const addArtisan = async (data: { name: string; job: string; phone: string; location?: string }) => {
  return api.post('/owner/artisans', data);
};

export const endLeaseWithProposals = async (data: { leaseId: string; deduction: number; comment: string }) => {
  return api.post('/owner/leases/end', data);
};

// =============================================================================
// ✅ 4. NOUVEAU : UNIVERSAL PAYMENT GATEWAY (Frontend Service)
// =============================================================================
// Cette fonction gère à la fois les Loyers (RENT) et les Investissements (INVESTMENT)
export const initiatePayment = async (data: {
  type: 'RENT' | 'INVESTMENT'; 
  referenceId: string;         // leaseId OU investmentContractId
  phone: string;               // Numéro Mobile Money
}) => {
  // Appelle notre route Next.js blindée (src/app/api/payment/initiate/route.ts)
  const response = await api.post('/payment/initiate', data);
  return response.data; // Retourne { success: true, paymentUrl: "..." }
};
