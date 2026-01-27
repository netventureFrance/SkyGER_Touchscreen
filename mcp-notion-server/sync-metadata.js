#!/usr/bin/env node

/**
 * Sync Screenshot Metadata from Notion Database
 * Fetches technical details: API fields, build time, template group, status
 */

import { Client } from '@notionhq/client';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load environment variables
function loadEnv() {
    if (process.env.NOTION_TOKEN) {
        return process.env;
    }
    try {
        const envPath = join(__dirname, '..', '.env');
        const envContent = readFileSync(envPath, 'utf-8');
        const vars = {};
        envContent.split('\n').forEach(line => {
            const [key, ...valueParts] = line.split('=');
            if (key && !key.startsWith('#')) {
                vars[key.trim()] = valueParts.join('=').trim();
            }
        });
        return vars;
    } catch (e) {
        console.error('Could not load .env file:', e.message);
        process.exit(1);
    }
}

const env = loadEnv();
const notion = new Client({ auth: env.NOTION_TOKEN });

// Database ID from the shared link
const DATABASE_ID = '2eff99a2be22818985aac34c4463241f';
const OUTPUT_FILE = join(__dirname, '..', 'images', 'screenshot-metadata.json');

/**
 * Extract plain text from rich text array
 */
function getRichText(richTextArray) {
    if (!richTextArray || !Array.isArray(richTextArray)) return '';
    return richTextArray.map(t => t.plain_text).join('');
}

/**
 * Extract image URL from screenshot, converting to local path
 */
function getLocalPath(screenshotFiles) {
    if (!screenshotFiles || screenshotFiles.length === 0) return null;

    const file = screenshotFiles[0];
    let url = file.external?.url || file.file?.url || '';

    // Convert Netlify URL to local path
    // https://skyger-touchscreen.netlify.app/images/screenshots/... -> images/screenshots/...
    if (url.includes('skyger-touchscreen.netlify.app/')) {
        url = url.split('skyger-touchscreen.netlify.app/')[1];
    }

    return url || null;
}

/**
 * Fetch all entries from the database
 */
async function fetchAllEntries() {
    const entries = [];
    let cursor;

    console.log('Fetching entries from Notion database...');

    do {
        const response = await notion.databases.query({
            database_id: DATABASE_ID,
            start_cursor: cursor,
            page_size: 100,
        });

        for (const page of response.results) {
            const props = page.properties;

            const entry = {
                name: getRichText(props.Name?.title),
                sektion: props.Sektion?.select?.name || null,
                kategorie: getRichText(props.Kategorie?.rich_text),
                templateGruppe: props['Template-Gruppe']?.select?.name || null,
                apiFelder: getRichText(props['API-Felder']?.rich_text),
                tage: props.Tage?.number || null,
                status: props.Status?.select?.name || null,
                bilder: props.Bilder?.number || 1,
                imagePath: getLocalPath(props.Screenshots?.files),
            };

            if (entry.imagePath) {
                entries.push(entry);
            }
        }

        cursor = response.has_more ? response.next_cursor : null;
        console.log(`  Fetched ${entries.length} entries...`);
    } while (cursor);

    return entries;
}

/**
 * Convert entries array to lookup object by image path
 */
function createLookup(entries) {
    const lookup = {};

    for (const entry of entries) {
        if (entry.imagePath) {
            lookup[entry.imagePath] = {
                name: entry.name,
                sektion: entry.sektion,
                kategorie: entry.kategorie,
                templateGruppe: entry.templateGruppe,
                apiFelder: entry.apiFelder,
                tage: entry.tage,
                status: entry.status,
            };
        }
    }

    return lookup;
}

/**
 * Main function
 */
async function main() {
    console.log('Syncing screenshot metadata from Notion...\n');

    try {
        const entries = await fetchAllEntries();
        console.log(`\nTotal entries: ${entries.length}`);

        const lookup = createLookup(entries);

        const output = {
            syncedAt: new Date().toISOString(),
            count: Object.keys(lookup).length,
            metadata: lookup,
        };

        writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2));
        console.log(`\nSaved to: images/screenshot-metadata.json`);

        // Show sample
        const sample = Object.entries(lookup).slice(0, 2);
        console.log('\nSample entries:');
        for (const [path, data] of sample) {
            console.log(`\n  ${path}:`);
            console.log(`    Template: ${data.templateGruppe}`);
            console.log(`    API: ${data.apiFelder}`);
            console.log(`    Tage: ${data.tage}`);
        }

    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

main();
