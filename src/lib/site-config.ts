// config/site.ts

export const siteConfig = {
  name: "Babimmo",
  shortName: "Babimmo",
  description: "La première plateforme immobilière sécurisée par Mobile Money en Côte d'Ivoire.",
  url: "https://www.immofacile.ci",
  ogImage: "https://www.immofacile.ci/og.jpg",
  links: {
    twitter: "https://twitter.com/immofacile_ci",
    github: "https://github.com/webappci/immofacile",
  },
  contact: {
    email: "contact@webappci.com",
    phone: "+225 07 83 97 41 75", // Numéro ivoirien générique pour l'instant
    address: "Abidjan, Côte d'Ivoire",
  },
  legal: {
    companyName: "WebappCi SARL",
    ninea: "0000000A", // À remplir plus tard
  },
  paymentMethods: ["Wave", "Orange Money", "MTN Momo"], // Pour l'affichage UI
}

export type SiteConfig = typeof siteConfig
