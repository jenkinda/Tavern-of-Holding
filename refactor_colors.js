const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'c:/Users/jenki/Desktop/My Coding Projects/Tavern of Holding/tavern-of-holding/src');

const replacements = {
    '#1a120b': 'var(--tavern-bg-base)',
    '#2c1e16': 'var(--tavern-bg-panel)',
    '#0a0705': 'var(--tavern-bg-dark)',
    '#c6a25b': 'var(--tavern-accent-gold)',
    '#e69a28': 'var(--tavern-accent-gold-bright)',
    '#f4ecd8': 'var(--tavern-text-main)',
    '#8b3a3a': 'var(--tavern-accent-red)',
    '#a54a4a': 'var(--tavern-accent-red-hover)'
};

function walkDir(dir) {
    const files = fs.readdirSync(dir);

    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
            walkDir(fullPath);
        } else if (fullPath.endsWith('.svelte') || fullPath.endsWith('.ts') || fullPath.endsWith('.js') || fullPath.endsWith('.html')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            let originalContent = content;

            for (const [hex, cssVar] of Object.entries(replacements)) {
                // simple global replace, handle both cases if necessary
                const regex = new RegExp(hex, 'g');
                content = content.replace(regex, cssVar);
                // Also uppercase hex
                const regexUpper = new RegExp(hex.toUpperCase(), 'g');
                content = content.replace(regexUpper, cssVar);
            }

            if (content !== originalContent) {
                fs.writeFileSync(fullPath, content, 'utf8');
                console.log(`Updated ${fullPath}`);
            }
        }
    }
}

walkDir(srcDir);
console.log('Done refactoring colors!');
