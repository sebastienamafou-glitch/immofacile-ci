import os

# Configuration du projet
files = {
    "package.json": """{
  "name": "immofacile-ci",
  "version": "1.0.0",
  "description": "Application de gestion immobilière ImmoFacile CI - Production",
  "main": "src/app.js",
  "scripts": {
    "start": "node src/app.js",
    "dev": "nodemon src/app.js",
    "postinstall": "prisma generate",
    "build": "echo 'Build finished'"
  },
  "dependencies": {
    "@prisma/client": "5.10.0",
    "@quixo3/prisma-session-store": "^3.1.13",
    "axios": "^1.13.2",
    "bcryptjs": "^3.0.3",
    "cloudinary": "^2.8.0",
    "connect-pg-simple": "^10.0.0",
    "cookie-parser": "^1.4.7",
    "csurf": "^1.2.2",
    "dotenv": "^17.2.3",
    "ejs": "^3.1.10",
    "express": "^5.2.1",
    "express-session": "^1.18.2",
    "helmet": "^7.1.0",
    "multer": "^2.0.2",
    "nodemailer": "^7.0.11",
    "pg": "^8.16.3",
    "prisma": "5.10.0",
    "streamifier": "^0.1.1",
    "web-push": "^3.6.7"
  },
  "devDependencies": {
    "nodemon": "^3.1.11"
  }
}""",

    "vercel.json": """{
  "version": 2,
  "builds": [
    {
      "src": "src/app.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "src/app.js"
    }
  ],
  "env": {
    "NODE_ENV": "production"
  }
}""",

    "src/prisma/schema.prisma": """// CORRECTION AUDIT : Utilisation de Int pour la fiabilité financière
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id        String   @id @default(cuid())
  email     String   @unique
  phone     String   @unique
  name      String?
  role      UserRole @default(TENANT)
  password  String
  createdAt DateTime @default(now())
  isActive  Boolean  @default(true)
  resetPasswordToken   String?
  resetPasswordExpires DateTime?
  
  // FINANCES (CORRIGÉ : Int au lieu de Float)
  walletBalance Int    @default(0) 
  escrowBalance Int    @default(0) 

  properties        Property[]          @relation("OwnerProperties")
  leasesAsTenant    Lease[]             @relation("TenantLeases")
  reportedIncidents Incident[]          @relation("Reporter")
  leads             Lead[]              @relation("AgentLeads")
  transactions      CreditTransaction[] 
  pushSubscriptions PushSubscription[]
}

enum UserRole {
  OWNER
  TENANT
  ADMIN
  AGENT
}

model CreditTransaction {
  id          String   @id @default(cuid())
  amount      Int      // CORRIGÉ : Int
  description String   
  date        DateTime @default(now())
  userId      String
  user        User     @relation(fields: [userId], references: [id])
}

model Property {
  id        String   @id @default(cuid())
  title     String
  address   String
  commune   String
  price     Int      // CORRIGÉ : Int
  createdAt DateTime @default(now())
  imageUrl  String?
  ownerId   String
  owner     User     @relation("OwnerProperties", fields: [ownerId], references: [id])
  leases    Lease[]
  incidents Incident[]
  expenses  Expense[]
  candidates Candidate[]
}

model Lease {
  id            String    @id @default(cuid())
  startDate     DateTime
  endDate       DateTime?
  depositAmount Int       // CORRIGÉ : Int
  monthlyRent   Int       // CORRIGÉ : Int
  isActive      Boolean   @default(true)
  tenantId      String
  tenant        User      @relation("TenantLeases", fields: [tenantId], references: [id])
  propertyId    String
  property      Property  @relation(fields: [propertyId], references: [id])
  payments      Payment[]
  inventories   Inventory[]
}

model Payment {
  id        String   @id @default(cuid())
  amount    Int      // CORRIGÉ : Int
  date      DateTime @default(now())
  month     String
  type      String   @default("LOYER")
  leaseId   String
  lease     Lease    @relation(fields: [leaseId], references: [id])
}

model Incident {
  id          String   @id @default(cuid())
  title       String
  description String
  status      String   @default("OPEN")
  priority    String   @default("MEDIUM")
  createdAt   DateTime @default(now())
  reporterId  String
  reporter    User     @relation("Reporter", fields: [reporterId], references: [id])
  propertyId  String
  property    Property @relation(fields: [propertyId], references: [id])
}

model Expense {
  id          String   @id @default(cuid())
  description String
  amount      Int      // CORRIGÉ : Int
  date        DateTime @default(now())
  category    String
  propertyId  String
  property    Property @relation(fields: [propertyId], references: [id])
}

model Inventory {
  id             String   @id @default(cuid())
  type           String
  date           DateTime @default(now())
  kitchenState   String?
  kitchenPhoto   String?
  livingState    String?
  livingPhoto    String?
  bathState      String?
  bathPhoto      String?
  generalComment String?
  leaseId        String
  lease          Lease    @relation(fields: [leaseId], references: [id])
}

model Lead {
  id          String   @id @default(cuid())
  name        String
  phone       String
  address     String?
  photo       String?
  status      String   @default("NOUVEAU")
  createdAt   DateTime @default(now())
  agentId     String?
  agent       User?    @relation("AgentLeads", fields: [agentId], references: [id])
}

model Candidate {
  id          String   @id @default(cuid())
  name        String
  phone       String
  email       String
  income      Int      // CORRIGÉ : Int
  status      String   @default("PENDING")
  score       Int
  createdAt   DateTime @default(now())
  propertyId  String
  property    Property @relation(fields: [propertyId], references: [id])
}

model Artisan {
  id          String   @id @default(uuid())
  name        String
  job         String   
  phone       String
  location    String   
  isVerified  Boolean  @default(true)
  rating      Float    @default(5.0) // On garde Float pour une moyenne d'étoiles
  createdAt   DateTime @default(now())
}

model PushSubscription {
  id        String   @id @default(cuid())
  endpoint  String   @unique 
  keys      String   
  createdAt DateTime @default(now())
  userId    String
  user      User     @relation(fields: [userId], references: [id])
}""",

    "src/prisma/client.js": """const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
module.exports = prisma;""",

    "src/app.js": """const express = require('express');
const path = require('path');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const csrfMiddleware = require('./middleware/csrfMiddleware');
const helmet = require('helmet'); // CORRECTION : Sécurité
const pg = require('pg');
const pgSession = require('connect-pg-simple')(session);

require('dotenv').config();

const authRoutes = require('./routes/authRoutes');
const ownerRoutes = require('./routes/ownerRoutes');
const tenantRoutes = require('./routes/tenantRoutes');
const adminRoutes = require('./routes/adminRoutes');
const agentRoutes = require('./routes/agentRoutes');
const apiRoutes = require('./routes/apiRoutes');

const app = express();
const PORT = process.env.PORT || 3000;
const IS_PROD = process.env.NODE_ENV === 'production';

app.set('trust proxy', 1); 

// CORRECTION : Helmet pour la sécurité des headers
app.use(helmet({
  contentSecurityPolicy: false, // Désactivé temporairement pour éviter les conflits avec CDN Tailwind/Cloudinary en démo
}));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.static(path.join(__dirname, '..', 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());

const pgPool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: IS_PROD ? { rejectUnauthorized: false } : false
});

app.use(session({
    store: new pgSession({
        pool : pgPool,
        tableName : 'session',
        createTableIfMissing: true
    }),
    secret: process.env.SESSION_SECRET || 'secret_dev_key_immofacile',
    resave: false,
    saveUninitialized: false,
    name: 'immofacile_sid',
    cookie: { 
        secure: IS_PROD, 
        httpOnly: true,  
        maxAge: 30 * 24 * 60 * 60 * 1000,
        sameSite: 'lax'
    }
}));

app.use(csrfMiddleware);

app.use((req, res, next) => {
    res.locals.user = req.session.user || null;
    res.locals.csrfToken = (typeof req.csrfToken === 'function') ? req.csrfToken() : null;
    next();
});

app.use('/', authRoutes);
app.use('/owner', ownerRoutes);
app.use('/tenant', tenantRoutes);
app.use('/admin', adminRoutes);
app.use('/agent', agentRoutes);
app.use('/api', apiRoutes);

app.use((req, res) => {
    res.status(404).render('404');
});

if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`✅ ImmoFacile-CI (Prod Ready) opérationnel sur le port ${PORT}`);
    });
}

module.exports = app;""",

    "src/middleware/csrfMiddleware.js": """// CORRECTION AUDIT : Suppression exclusion add-lead
const csrf = require('csurf');

const csrfProtection = csrf({
    cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax'
    }
});

const csrfMiddleware = (req, res, next) => {
    const excludedPaths = [
        '/api/payment/notify' 
        // L'ajout de lead a été retiré des exclusions pour sécurité
    ];

    if (
        excludedPaths.includes(req.path) || 
        req.path.startsWith('/inventory/') || 
        req.path.startsWith('/apply/')
    ) {
        return next();
    }

    csrfProtection(req, res, next);
};

module.exports = csrfMiddleware;""",

    "src/middleware/authMiddleware.js": """const redirectUserByRole = (req, res) => {
    const user = req.session.user;
    if (!user) return res.redirect('/login');
    switch (user.role) {
        case 'OWNER': return res.redirect('/owner/dashboard');
        case 'TENANT': return res.redirect('/tenant/dashboard');
        case 'ADMIN': return res.redirect('/admin/dashboard');
        case 'AGENT': return res.redirect('/agent/dashboard');
        default: return res.redirect('/login');
    }
};

exports.isOwner = (req, res, next) => {
    if (!req.session || !req.session.user) return res.redirect('/login?error=session_expired');
    if (req.session.user.role === 'OWNER') return next();
    return redirectUserByRole(req, res);
};

exports.isTenant = (req, res, next) => {
    if (!req.session || !req.session.user) return res.redirect('/login');
    if (req.session.user.role === 'TENANT') return next();
    return redirectUserByRole(req, res);
};

exports.isAgent = (req, res, next) => {
    if (!req.session || !req.session.user) return res.redirect('/login');
    if (req.session.user.role === 'AGENT') return next();
    return redirectUserByRole(req, res);
};

exports.isAdmin = (req, res, next) => {
    if (!req.session || !req.session.user) return res.redirect('/login');
    if (req.session.user.role === 'ADMIN') return next();
    return res.redirect('/login');
};""",

    "src/middleware/uploadMiddleware.js": """const multer = require('multer');
const path = require('path');
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
        return cb(null, true);
    } else {
        cb(new Error('Format non supporté : Seules les images sont autorisées !'));
    }
};

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: fileFilter
});
module.exports = upload;""",

    "src/utils/security.js": """const crypto = require('crypto');
exports.generateRandomPassword = (length = 8) => {
    return crypto.randomBytes(length).toString('hex').slice(0, length);
};""",

    "src/utils/cloudinary.js": """const cloudinary = require('cloudinary').v2;
const streamifier = require('streamifier');

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const uploadFromBuffer = (buffer) => {
    return new Promise((resolve, reject) => {
        const cld_upload_stream = cloudinary.uploader.upload_stream(
            { folder: "immofacile_properties" },
            (error, result) => {
                if (result) resolve(result);
                else reject(error);
            }
        );
        streamifier.createReadStream(buffer).pipe(cld_upload_stream);
    });
};
module.exports = { uploadFromBuffer };""",

    "src/utils/email.js": """const nodemailer = require('nodemailer');
const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT),
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    },
    tls: { rejectUnauthorized: false }
});

exports.sendResetEmail = async (to, token, host) => {
    const resetLink = `http://${host}/reset-password/${token}`;
    const mailOptions = {
        from: '"Sécurité ImmoFacile CI" <contact@webappci.com>',
        to: to,
        subject: '🔐 Réinitialisation de votre mot de passe',
        html: `<p>Cliquez ici : <a href="${resetLink}">Réinitialiser</a></p>`
    };
    try {
        await transporter.sendMail(mailOptions);
    } catch (error) {
        console.error("❌ Erreur envoi email:", error);
    }
};""",

    "public/sw.js": """// CORRECTION AUDIT : Stratégie Network First pour HTML pour éviter bugs CSRF
const CACHE_NAME = 'immofacile-prod-v1';
const ASSETS_TO_CACHE = [
  '/manifest.json',
  '/icon-512.png',
  'https://cdn.tailwindcss.com',
  'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;800&display=swap'
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS_TO_CACHE)));
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(
    keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
  )));
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  if (event.request.method !== 'GET' || url.pathname.startsWith('/api/')) return;

  // STRATÉGIE "NETWORK FIRST" (HTML)
  if (event.request.headers.get('accept').includes('text/html')) {
    event.respondWith(
      fetch(event.request).catch(() => caches.match('/offline.html'))
    );
    return;
  }

  // STRATÉGIE "CACHE FIRST" (Assets)
  event.respondWith(
    caches.match(event.request).then(cached => {
      return cached || fetch(event.request).then(res => {
        return caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, res.clone());
          return res;
        });
      });
    })
  );
});""",

    "public/manifest.json": """{
  "name": "ImmoFacile CI",
  "short_name": "ImmoFacile",
  "start_url": "/?source=pwa",
  "display": "standalone",
  "background_color": "#0B1120",
  "theme_color": "#0B1120",
  "description": "Gestion immobilière simplifiée en Côte d'Ivoire",
  "icons": [
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}""",

    "scripts/setAdmin.js": """const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
    const lastUser = await prisma.user.findFirst({ orderBy: { createdAt: 'desc' } });
    if (!lastUser) return console.log("❌ Aucun utilisateur.");
    await prisma.user.update({
        where: { id: lastUser.id },
        data: { role: 'ADMIN', walletBalance: 1000000 }
    });
    console.log(`✅ ${lastUser.name} est ADMIN.`);
}
main().catch(e => console.error(e)).finally(() => prisma.$disconnect());"""
}

# Fonction de création
def create_project():
    print("🚀 Démarrage de l'installation ImmoFacile CI...")
    
    for path, content in files.items():
        # Créer les dossiers parents si nécessaire
        dir_name = os.path.dirname(path)
        if dir_name and not os.path.exists(dir_name):
            os.makedirs(dir_name)
            print(f"📁 Dossier créé : {dir_name}")
        
        # Écrire le fichier
        with open(path, "w", encoding="utf-8") as f:
            f.write(content)
        print(f"✅ Fichier généré : {path}")

    print("\\n🎉 Projet généré avec succès !")
    print("⚠️  NOTE : Ce script a généré le 'Cœur Technique'.")
    print("👉 Vous devez maintenant copier vos fichiers .ejs dans le dossier src/views/ manuellement")
    print("   (car ils sont trop nombreux pour tenir dans ce script unique).")
    print("\\nProchaines étapes :")
    print("1. npm install")
    print("2. npx prisma generate")
    print("3. npx prisma db push")
    print("4. npm start")

if __name__ == "__main__":
    create_project()
