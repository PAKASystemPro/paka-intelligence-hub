/**
 * Local Supabase Edge Functions backup script
 * Copies Edge Functions from the local supabase/functions directory to a backup location
 */
const fs = require('fs');
const path = require('path');

// Create timestamp for backup folder
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const backupDir = path.join(__dirname, '..', '..', 'backups', `edge-functions-local_${timestamp}`);

// Source directory for Edge Functions
const sourceFunctionsDir = path.join(__dirname, '..', '..', 'supabase', 'functions');

// Create backup directory
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}

console.log('Starting local Edge Functions backup...');
console.log(`Source: ${sourceFunctionsDir}`);
console.log(`Destination: ${backupDir}`);

/**
 * Copy a directory recursively
 */
function copyFolderRecursive(source, target) {
  // Create target folder if it doesn't exist
  if (!fs.existsSync(target)) {
    fs.mkdirSync(target, { recursive: true });
  }

  // Read source directory
  const files = fs.readdirSync(source);

  // Copy each file/folder
  files.forEach(file => {
    const sourcePath = path.join(source, file);
    const targetPath = path.join(target, file);
    
    const stats = fs.statSync(sourcePath);
    
    if (stats.isDirectory()) {
      // Recursively copy subdirectory
      copyFolderRecursive(sourcePath, targetPath);
    } else {
      // Copy file
      fs.copyFileSync(sourcePath, targetPath);
      console.log(`Backed up: ${sourcePath} -> ${targetPath}`);
    }
  });
}

try {
  // Check if source directory exists
  if (!fs.existsSync(sourceFunctionsDir)) {
    console.error(`Source directory not found: ${sourceFunctionsDir}`);
    process.exit(1);
  }
  
  // Get list of Edge Functions
  const functions = fs.readdirSync(sourceFunctionsDir);
  
  if (functions.length === 0) {
    console.log('No Edge Functions found in source directory.');
  } else {
    console.log(`Found ${functions.length} Edge Functions.`);
    
    // Copy each function directory
    functions.forEach(functionName => {
      const sourcePath = path.join(sourceFunctionsDir, functionName);
      const targetPath = path.join(backupDir, functionName);
      
      // Skip non-directories and hidden files
      if (!fs.statSync(sourcePath).isDirectory() || functionName.startsWith('.')) {
        console.log(`Skipping non-directory: ${functionName}`);
        return;
      }
      
      console.log(`Backing up function: ${functionName}`);
      copyFolderRecursive(sourcePath, targetPath);
    });
    
    // Create a summary file
    const summaryPath = path.join(backupDir, 'backup-summary.txt');
    const summary = `Edge Functions Backup
Date: ${new Date().toISOString()}
Functions backed up: ${functions.filter(f => !f.startsWith('.') && fs.statSync(path.join(sourceFunctionsDir, f)).isDirectory()).length}

Function list:
${functions.filter(f => !f.startsWith('.') && fs.statSync(path.join(sourceFunctionsDir, f)).isDirectory()).join('\n')}
`;
    
    fs.writeFileSync(summaryPath, summary);
    console.log(`Created backup summary: ${summaryPath}`);
  }
  
  console.log('✅ Edge Functions backup completed successfully!');
} catch (error) {
  console.error('❌ Error during backup:', error.message);
  process.exit(1);
}
