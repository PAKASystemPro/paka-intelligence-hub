/**
 * Configuration files backup script
 * Copies important configuration files to the backups/config directory
 */
const fs = require('fs');
const path = require('path');

// Create backup directories if they don't exist
const backupDir = path.join(__dirname, '..', '..', 'backups', 'config');
const docsBackupDir = path.join(backupDir, 'docs');
const rootBackupDir = path.join(backupDir, 'root');
const frontendBackupDir = path.join(backupDir, 'frontend');

if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}
if (!fs.existsSync(docsBackupDir)) {
  fs.mkdirSync(docsBackupDir, { recursive: true });
}
if (!fs.existsSync(rootBackupDir)) {
  fs.mkdirSync(rootBackupDir, { recursive: true });
}
if (!fs.existsSync(frontendBackupDir)) {
  fs.mkdirSync(frontendBackupDir, { recursive: true });
}

// Files to backup from the project root
const rootFiles = [
  'vercel.json',
  '.github/workflows/main.yml',
  '.github/workflows/deploy.yml',
  'package.json',
  'next.config.js',
  'tsconfig.json',
  'tailwind.config.js',
  'postcss.config.js',
  'README.md',
  'supabase/config.toml'
];

// Frontend configuration files to backup
const frontendFiles = [
  'frontend/vercel.json',
  'frontend/package.json',
  'frontend/tsconfig.json',
  'frontend/components.json'
];

// Backup markdown files from scripts/improved/docs
function backupMarkdownFiles() {
  const docsDir = path.join(__dirname, '..', '..', 'scripts', 'improved', 'docs');
  
  if (!fs.existsSync(docsDir)) {
    console.log('Documentation directory not found:', docsDir);
    return;
  }
  
  const files = fs.readdirSync(docsDir);
  
  files.forEach(file => {
    if (file.endsWith('.md')) {
      const sourcePath = path.join(docsDir, file);
      const destPath = path.join(docsBackupDir, file);
      
      try {
        fs.copyFileSync(sourcePath, destPath);
        console.log(`Backed up: ${sourcePath} -> ${destPath}`);
      } catch (error) {
        console.error(`Error backing up ${sourcePath}:`, error.message);
      }
    }
  });
}

// Backup root configuration files
function backupRootFiles() {
  rootFiles.forEach(filePath => {
    const sourcePath = path.join(__dirname, '..', '..', filePath);
    const fileName = path.basename(filePath);
    const destPath = path.join(rootBackupDir, fileName);
    
    try {
      if (fs.existsSync(sourcePath)) {
        fs.copyFileSync(sourcePath, destPath);
        console.log(`Backed up: ${sourcePath} -> ${destPath}`);
      } else {
        console.log(`File not found, skipping: ${sourcePath}`);
      }
    } catch (error) {
      console.error(`Error backing up ${sourcePath}:`, error.message);
    }
  });
}

// Backup frontend configuration files
function backupFrontendFiles() {
  frontendFiles.forEach(filePath => {
    const sourcePath = path.join(__dirname, '..', '..', filePath);
    const fileName = path.basename(filePath);
    const destPath = path.join(frontendBackupDir, fileName);
    
    try {
      if (fs.existsSync(sourcePath)) {
        fs.copyFileSync(sourcePath, destPath);
        console.log(`Backed up: ${sourcePath} -> ${destPath}`);
      } else {
        console.log(`File not found, skipping: ${sourcePath}`);
      }
    } catch (error) {
      console.error(`Error backing up ${sourcePath}:`, error.message);
    }
  });
}

// Create a timestamp file to record when the backup was made
function createTimestampFile() {
  const timestamp = new Date().toISOString();
  const timestampPath = path.join(backupDir, 'backup-timestamp.txt');
  
  fs.writeFileSync(timestampPath, `Backup created: ${timestamp}\n`);
  console.log(`Created timestamp file: ${timestampPath}`);
}

// Run backup functions
console.log('Starting configuration backup...');
backupMarkdownFiles();
backupRootFiles();
backupFrontendFiles();
createTimestampFile();
console.log('Configuration backup complete!');
