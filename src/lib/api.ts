// Fichier : src/lib/api.ts
import axios from 'axios';
import { signOut } from 'next-auth/react';

// 1. Instance API Standardisée
export const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 40000,
  withCredentials: true, 
});

// 2. Intercepteur de Réponse
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // 🛑 STOP BOUCLE INFINIE
    // Si l'erreur vient des notifications ou de l'auth elle-même, on ne fait rien.
    // On laisse le composant gérer l'erreur (ex: afficher 0 notifs) sans déconnecter.
    if (originalRequest.url?.includes('/notifications') || originalRequest.url?.includes('/auth')) {
        return Promise.reject(error);
    }

    // Gestion standard des 401 pour les autres routes (ex: accès page admin)
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
        originalRequest._retry = true;
        // On garde la déconnexion pour les vraies erreurs de session sur les pages principales
        await signOut({ callbackUrl: '/login' });
      }
    }
    return Promise.reject(error);
  }
);

// ... (Le reste des exports initiatePayment, etc. reste inchangé)
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

export const initiatePayment = async (data: {
  type: 'RENT' | 'INVESTMENT' | 'QUOTE' | 'DEPOSIT' | 'TOPUP'; 
  referenceId: string;
  phone: string;
  idempotencyKey: string; 
  manualAmount?: number; 
}) => {
  const response = await api.post('/payment/initiate', data);
  return response.data; 
};
