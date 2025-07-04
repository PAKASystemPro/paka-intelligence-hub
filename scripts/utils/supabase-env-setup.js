/**
 * Supabase Environment Setup Helper
 * 
 * This script helps set up the environment variables needed for Supabase connection
 * by prompting the user for the required values.
 */
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('Supabase Environment Setup Helper');
console.log('=================================');
console.log('This script will help you set up the environment variables needed for Supabase connection.');
console.log('The values will be stored in a .env.supabase file in the scripts/utils directory.');
console.log('');

// Define the environment variables we need
const envVars = [
  {
    name: 'NEXT_PUBLIC_SUPABASE_URL',
    description: 'Your Supabase project URL (e.g., https://yourproject.supabase.co)',
    required: true
  },
  {
    name: 'SUPABASE_SERVICE_ROLE_KEY',
    description: 'Your Supabase service role key (starts with "eyJ...")',
    required: true
  }
];

// Store the values
const envValues = {};

// Function to prompt for a variable
function promptForVariable(variable) {
  return new Promise((resolve) => {
    rl.question(`Enter ${variable.name} (${variable.description}): `, (answer) => {
      if (!answer && variable.required) {
        console.log(`Error: ${variable.name} is required.`);
        return promptForVariable(variable).then(resolve);
      }
      resolve(answer);
    });
  });
}

// Main function
async function main() {
  try {
    // Prompt for each variable
    for (const variable of envVars) {
      const value = await promptForVariable(variable);
      envValues[variable.name] = value;
    }

    // Create the .env.supabase file
    const envFilePath = path.join(__dirname, '.env.supabase');
    let envFileContent = '';
    
    // Add each variable to the file
    for (const [name, value] of Object.entries(envValues)) {
      envFileContent += `${name}=${value}\n`;
    }
    
    // Write the file
    fs.writeFileSync(envFilePath, envFileContent);
    
    console.log('\n✅ Environment variables saved to:', envFilePath);
    console.log('You can now run the test-supabase-connection.js script with:');
    console.log('node scripts/utils/test-supabase-connection.js --env-file=scripts/utils/.env.supabase');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    rl.close();
  }
}

main();
