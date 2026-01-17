#!/usr/bin/env node

/**
 * Increment version on every Netlify deploy
 * Runs during build step
 */

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const versionPath = join(__dirname, '..', 'version.json');

try {
    const version = JSON.parse(readFileSync(versionPath, 'utf8'));

    // Increment patch version
    version.patch = (version.patch || 0) + 1;

    // Roll over to minor if patch reaches 100
    if (version.patch >= 100) {
        version.patch = 0;
        version.minor = (version.minor || 0) + 1;
    }

    // Roll over to major if minor reaches 100
    if (version.minor >= 100) {
        version.minor = 0;
        version.major = (version.major || 1) + 1;
    }

    writeFileSync(versionPath, JSON.stringify(version, null, 2) + '\n');
    console.log(`✅ Version incremented to ${version.major}.${version.minor}.${version.patch}`);
} catch (e) {
    console.error(`❌ Could not increment version: ${e.message}`);
    process.exit(1);
}
# Auto-version: pre-commit hook increments patch on every commit
