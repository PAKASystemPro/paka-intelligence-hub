/**
 * Project Reset Script
 * Cleans up the project folder while preserving important components
 */
const fs = require('fs');
const path = require('path');

// Directories to preserve
const preserveDirectories = [
  'frontend',                // Frontend components
  'supabase',                // Supabase Edge Functions
  'scripts/shopifysync',     // Our new scripts folder
  'backups',                 // Keep backup folder structure
  'node_modules',            // Keep node modules
  '.git'                     // Keep git history
];

// Files to preserve
const preserveFiles = [
  '.env',
  '.env.local',
  'package.json',
  'package-lock.json',
  'README.md',
  'PROJECT_STRUCTURE.md'
];

// Directories to clean (remove all contents but keep the directory)
const directoriesToClean = [
  'scripts/improved'  // Clean up old scripts but keep directory structure
];

// Root directory
const rootDir = path.join(__dirname, '..', '..');

// Function to check if a path should be preserved
function shouldPreserve(itemPath) {
  const relativePath = path.relative(rootDir, itemPath);
  
  // Check if the path is in the preserve list
  return preserveDirectories.some(dir => {
    return relativePath === dir || relativePath.startsWith(dir + path.sep);
  }) || preserveFiles.some(file => {
    return relativePath === file;
  });
}

// Function to check if a directory should be cleaned
function shouldClean(itemPath) {
  const relativePath = path.relative(rootDir, itemPath);
  
  return directoriesToClean.some(dir => {
    return relativePath === dir;
  });
}

// Function to clean a directory (remove contents but keep directory)
function cleanDirectory(dirPath) {
  console.log(`Cleaning directory: ${dirPath}`);
  
  const items = fs.readdirSync(dirPath);
  
  for (const item of items) {
    const itemPath = path.join(dirPath, item);
    
    if (fs.statSync(itemPath).isDirectory()) {
      fs.rmSync(itemPath, { recursive: true });
      console.log(`Removed directory: ${itemPath}`);
    } else {
      fs.unlinkSync(itemPath);
      console.log(`Removed file: ${itemPath}`);
    }
  }
}

// Function to recursively delete items that should not be preserved
function cleanupItem(itemPath) {
  // Skip if this item should be preserved
  if (shouldPreserve(itemPath)) {
    console.log(`Preserving: ${itemPath}`);
    return;
  }
  
  // If this is a directory that should be cleaned (not deleted)
  if (shouldClean(itemPath)) {
    cleanDirectory(itemPath);
    return;
  }
  
  // Get item stats
  const stats = fs.statSync(itemPath);
  
  if (stats.isDirectory()) {
    // Process directory contents first
    const items = fs.readdirSync(itemPath);
    
    for (const item of items) {
      cleanupItem(path.join(itemPath, item));
    }
    
    // Try to remove the directory (will only succeed if empty)
    try {
      fs.rmdirSync(itemPath);
      console.log(`Removed empty directory: ${itemPath}`);
    } catch (error) {
      if (error.code !== 'ENOTEMPTY') {
        console.error(`Error removing directory ${itemPath}:`, error.message);
      }
    }
  } else {
    // Remove file
    fs.unlinkSync(itemPath);
    console.log(`Removed file: ${itemPath}`);
  }
}

// Main function
function resetProject() {
  console.log('Starting project reset...');
  
  // Get all items in the root directory
  const rootItems = fs.readdirSync(rootDir);
  
  // Process each item
  for (const item of rootItems) {
    // Skip hidden files and directories (except .git)
    if (item.startsWith('.') && item !== '.git') {
      continue;
    }
    
    const itemPath = path.join(rootDir, item);
    cleanupItem(itemPath);
  }
  
  console.log('Project reset completed!');
  console.log('Remember to run the database cleanup script to reset the database.');
}

// Run the reset
resetProject();
