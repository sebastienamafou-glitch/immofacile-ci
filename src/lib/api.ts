// Fichier : src/lib/api.ts
import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { signOut } from 'next-auth/react';

// Extension de l'interface pour inclure notre flag de retry personnalisé
interface CustomAxiosRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

// 1. Instance API Standardisée
export const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 40000,
  withCredentials: true, // Indispensable pour que le navigateur envoie le cookie Next-Auth automatiquement
});

// 2. Intercepteur de Réponse
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as CustomAxiosRequestConfig;

    // 🛑 STOP BOUCLE INFINIE
    if (originalRequest?.url?.includes('/notifications') || originalRequest?.url?.includes('/auth')) {
        return Promise.reject(error);
    }

    // ✅ NOUVEAU : On détecte si c'est une erreur métier spécifique (KYC)
    // On type l'erreur en "any" localement ici juste pour lire la donnée en toute sécurité
    const errorData = error.response?.data as any; 
    const isKycError = error.response?.status === 403 && errorData?.code === 'KYC_REQUIRED';

    // Gestion stricte des 401 (Token expiré) et 403 (Rôle non autorisé), SAUF si c'est le KYC
    if (
      (error.response?.status === 401 || (error.response?.status === 403 && !isKycError)) && 
      originalRequest && 
      !originalRequest._retry
    ) {
      if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
        originalRequest._retry = true;
        
        // Nettoyage ciblé des anciens vestiges
        localStorage.removeItem('immouser');
        localStorage.removeItem('token');
        localStorage.removeItem('user');

        // Déconnexion NextAuth et redirection forcée
        await signOut({ callbackUrl: '/login', redirect: true });
      }
    }
    
    return Promise.reject(error);
  }
);

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
