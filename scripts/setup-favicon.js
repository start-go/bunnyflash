/**
 * This script helps ensure the favicon is correctly placed
 * 
 * Instructions:
 * 1. Make sure Node.js is installed
 * 2. Run this script with: node scripts/setup-favicon.js
 * 3. Follow the prompts
 */

const fs = require('fs');
const path = require('path');

// Define paths
const rootDir = path.resolve(__dirname, '..');
const targetDir = path.join(rootDir, 'assets', 'images', 'favicon');
const iconPath = path.join(rootDir, 'icon.png');
const targetPath = path.join(targetDir, 'icon.png');

// Create directory if it doesn't exist
if (!fs.existsSync(targetDir)) {
    console.log(`Creating directory: ${targetDir}`);
    fs.mkdirSync(targetDir, { recursive: true });
}

// Check if icon.png exists in root directory
if (fs.existsSync(iconPath)) {
    console.log(`Found icon.png in root directory`);
    
    // Copy file to target directory
    fs.copyFile(iconPath, targetPath, (err) => {
        if (err) {
            console.error('Error copying file:', err);
            return;
        }
        console.log(`Successfully copied icon.png to ${targetPath}`);
        console.log('You can now safely remove the original icon.png from the root directory if desired.');
    });
} else {
    console.log(`icon.png not found in root directory: ${iconPath}`);
    console.log(`Please place your icon.png file in: ${targetDir}`);
}
