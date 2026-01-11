export const createWhatsAppLink = (phone: string, message: string) => {
  // 1. Nettoyage du numéro (enlève espaces, tirets, etc.)
  let cleanPhone = phone.replace(/\D/g, '');

  // 2. Gestion format ivoirien (si 10 chiffres, on ajoute 225)
  if (cleanPhone.length === 10) {
    cleanPhone = '225' + cleanPhone;
  }

  // 3. Encodage du message (pour les espaces et accents)
  const encodedMessage = encodeURIComponent(message);

  return `https://wa.me/${cleanPhone}?text=${encodedMessage}`;
};
