const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/features/achievements/data/achievements.ts');
let content = fs.readFileSync(filePath, 'utf8');

// Replace all currentProgress: <number>, with currentProgress: 0,
content = content.replace(/currentProgress:\s*\d+,/g, 'currentProgress: 0,');

// Replace all unlocked: true, with unlocked: false,
content = content.replace(/unlocked:\s*true,/g, 'unlocked: false,');

// Replace all isUnlocked: true, with isUnlocked: false,
content = content.replace(/isUnlocked:\s*true,/g, 'isUnlocked: false,');

// Replace all glowStage: 'UNLOCKED' | 'NEAR_COMPLETION', with glowStage: 'LOCKED',
content = content.replace(/glowStage:\s*'(UNLOCKED|NEAR_COMPLETION)',/g, "glowStage: 'LOCKED',");

// Replace all rewardHP: <number>, with rewardHP: 0,
content = content.replace(/rewardHP:\s*\d+,/g, 'rewardHP: 0,');

// Remove unlockDate lines
content = content.replace(/\s*unlockDate:\s*'[^']+',/g, '');

fs.writeFileSync(filePath, content, 'utf8');
console.log('Normalized achievements.ts successfully.');
