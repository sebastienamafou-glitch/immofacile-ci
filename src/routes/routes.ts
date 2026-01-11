import { Router } from 'express';
import { PaymentController } from '../controllers/payment.controller';
import { authenticate } from '../middleware/auth.middleware';
import { authorize } from '../middleware/role.middleware';
import { Role } from '@prisma/client';

const router = Router();
const controller = new PaymentController();

// 1. Initialiser le paiement : 
// - Il faut être connecté (authenticate)
// - Il faut être un TENANT ou un OWNER (authorize)
router.post('/rent', 
  authenticate, 
  authorize([Role.TENANT, Role.OWNER]), // Seuls ces rôles peuvent payer un loyer
  (req, res) => controller.payRent(req, res)
);

// 2. Webhook CinetPay : 
// - PAS de middleware d'auth ici, car c'est CinetPay qui appelle le serveur
// - La sécurité se fait via la vérification de transaction interne au controller
router.post('/webhook', (req, res) => controller.handleWebhook(req, res));

export default router;
