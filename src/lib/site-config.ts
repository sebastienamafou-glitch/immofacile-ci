// config/site.ts

export const siteConfig = {
  name: "Babimmo",
  shortName: "Babimmo",
  description: "La première plateforme immobilière sécurisée par Mobile Money en Côte d'Ivoire.",
  url: "https://www.babimmo.ci",
  ogImage: "https://www.babimmo.ci/og.jpg",
  links: {
    twitter: "https://twitter.com/babimmo_ci",
    github: "https://github.com/webappci/babimmo",
  },
  contact: {
    email: "contact@babimmo.ci",
    phone: "+225 07 00 00 00 00", // Numéro ivoirien générique pour l'instant
    address: "Abidjan, Côte d'Ivoire",
  },
  legal: {
    companyName: "WebappCi SARL",
    ninea: "0000000A", // À remplir plus tard
  },
  paymentMethods: ["Wave", "Orange Money", "MTN Momo"], // Pour l'affichage UI
}

export type SiteConfig = typeof siteConfig
