/**
 * Frontend backup script
 * Creates a backup of key frontend components and files
 */
const fs = require('fs');
const path = require('path');

// Create timestamp for backup folder
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const backupDir = path.join(__dirname, '..', '..', 'backups', `frontend_${timestamp}`);

// Source directory for Frontend
const sourceFrontendDir = path.join(__dirname, '..', '..', 'frontend');

// Directories to backup (relative to frontend folder)
const directoriesToBackup = [
  'src',  // This contains app, components, lib, styles
  'public'
];

// Files to backup (relative to frontend folder)
const filesToBackup = [
  'package.json',
  'tsconfig.json',
  'next.config.ts',
  'postcss.config.mjs',
  'eslint.config.mjs',
  'vercel.json',
  'components.json',
  'README.md',
  '.env.local',
  '.gitignore'
];

// Create backup directory
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}

console.log('Starting frontend backup...');
console.log(`Source: ${sourceFrontendDir}`);
console.log(`Destination: ${backupDir}`);

/**
 * Copy a directory recursively
 */
function copyFolderRecursive(source, target) {
  // Skip if source doesn't exist
  if (!fs.existsSync(source)) {
    console.log(`Directory not found, skipping: ${source}`);
    return;
  }

  // Create target folder if it doesn't exist
  if (!fs.existsSync(target)) {
    fs.mkdirSync(target, { recursive: true });
  }

  // Read source directory
  const files = fs.readdirSync(source);

  // Copy each file/folder
  files.forEach(file => {
    // Skip node_modules and .next
    if (file === 'node_modules' || file === '.next') {
      return;
    }

    const sourcePath = path.join(source, file);
    const targetPath = path.join(target, file);
    
    try {
      const stats = fs.statSync(sourcePath);
      
      if (stats.isDirectory()) {
        // Recursively copy subdirectory
        copyFolderRecursive(sourcePath, targetPath);
      } else {
        // Copy file
        fs.copyFileSync(sourcePath, targetPath);
        console.log(`Backed up: ${sourcePath} -> ${targetPath}`);
      }
    } catch (error) {
      console.error(`Error processing ${sourcePath}:`, error.message);
    }
  });
}

/**
 * Copy a single file
 */
function copyFile(source, target) {
  try {
    if (fs.existsSync(source)) {
      const targetDir = path.dirname(target);
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }
      fs.copyFileSync(source, target);
      console.log(`Backed up: ${source} -> ${target}`);
    } else {
      console.log(`File not found, skipping: ${source}`);
    }
  } catch (error) {
    console.error(`Error copying ${source}:`, error.message);
  }
}

try {
  // Check if source directory exists
  if (!fs.existsSync(sourceFrontendDir)) {
    console.error(`Frontend directory not found: ${sourceFrontendDir}`);
    process.exit(1);
  }
  
  // Backup key directories
  console.log('Backing up frontend directories...');
  directoriesToBackup.forEach(dir => {
    const sourcePath = path.join(sourceFrontendDir, dir);
    const targetPath = path.join(backupDir, dir);
    
    console.log(`Backing up directory: ${dir}`);
    copyFolderRecursive(sourcePath, targetPath);
  });
  
  // Backup key files
  console.log('Backing up frontend files...');
  filesToBackup.forEach(file => {
    const sourcePath = path.join(sourceFrontendDir, file);
    const targetPath = path.join(backupDir, file);
    
    copyFile(sourcePath, targetPath);
  });
  
  // Create a summary file
  const summaryPath = path.join(backupDir, 'backup-summary.txt');
  const summary = `Frontend Backup
Date: ${new Date().toISOString()}

Directories backed up:
${directoriesToBackup.filter(dir => fs.existsSync(path.join(sourceFrontendDir, dir))).join('\n')}

Files backed up:
${filesToBackup.filter(file => fs.existsSync(path.join(sourceFrontendDir, file))).join('\n')}
`;
  
  fs.writeFileSync(summaryPath, summary);
  console.log(`Created backup summary: ${summaryPath}`);
  
  console.log('✅ Frontend backup completed successfully!');
} catch (error) {
  console.error('❌ Error during backup:', error.message);
  process.exit(1);
}
