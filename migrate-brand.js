const fs = require('fs');
const path = require('path');

// CONFIGURATION DU REMPLACEMENT
const REPLACEMENTS = [
  // 1. La Marque (Casse respectée)
  { from: /Babimmo/g, to: 'Babimmo' },
  { from: /babimmo/g, to: 'babimmo' },
  { from: /BABIMMO/g, to: 'BABIMMO' },
  
  // 2. Les Domaines & Mails
  { from: /babimmo\.ci/g, to: 'babimmo.ci' },
  { from: /contact@webappci\.com/g, to: 'contact@babimmo.ci' }, // [cite: 59, 106]
  
  // 3. Le Numéro Français (CRITIQUE) -> À remplacer par un placeholder local
  // Le numéro +33 07 83... identifié dans tes docs [cite: 60, 106]
  { from: /\+33\s?0?7\s?83\s?97\s?41\s?75/g, to: '+225 07 00 00 00 00' },
  { from: /\+225 07 00 00 00 00/g, to: '+2250700000000' },
];

// DOSSIERS À IGNORER
const IGNORE_DIRS = ['node_modules', '.next', '.git', 'dist', 'build', '.vercel'];
// EXTENSIONS À TRAITER
const TARGET_EXTS = ['.ts', '.tsx', '.js', '.jsx', '.json', '.md', '.prisma', '.env'];

function walkDir(dir) {
  const files = fs.readdirSync(dir);

  files.forEach((file) => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      if (!IGNORE_DIRS.includes(file)) {
        walkDir(filePath);
      }
    } else {
      if (TARGET_EXTS.includes(path.extname(file))) {
        processFile(filePath);
      }
    }
  });
}

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;
  let hasChanged = false;

  REPLACEMENTS.forEach(({ from, to }) => {
    if (from.test(content)) {
      content = content.replace(from, to);
      hasChanged = true;
    }
  });

  if (hasChanged) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ Modifié : ${filePath}`);
  }
}

console.log("🚀 Démarrage de la migration vers Babimmo...");
walkDir('./'); // Lance le scan depuis la racine
console.log("🏁 Migration terminée.");
