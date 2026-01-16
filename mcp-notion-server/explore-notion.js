#!/usr/bin/env node

/**
 * Explore Notion Structure - Find all content including databases
 */

import { Client } from '@notionhq/client';
import { readFileSync, mkdirSync, writeFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import https from 'https';
import http from 'http';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env
function loadEnv() {
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
const PAGE_ID = env.NOTION_PAGE_ID || '2e9f99a2be2281379653c6ba4b29400f';

// Store found data
const allImages = [];
const allPages = [];

/**
 * Download file from URL
 */
function downloadFile(url, filepath) {
    return new Promise((resolve, reject) => {
        const protocol = url.startsWith('https') ? https : http;

        protocol.get(url, (response) => {
            if (response.statusCode === 302 || response.statusCode === 301) {
                downloadFile(response.headers.location, filepath).then(resolve).catch(reject);
                return;
            }

            const chunks = [];
            response.on('data', chunk => chunks.push(chunk));
            response.on('end', () => {
                const buffer = Buffer.concat(chunks);
                writeFileSync(filepath, buffer);
                resolve(filepath);
            });
            response.on('error', reject);
        }).on('error', reject);
    });
}

/**
 * Sanitize filename
 */
function sanitize(name) {
    return name.toLowerCase()
        .replace(/[äöüß]/g, c => ({ 'ä': 'ae', 'ö': 'oe', 'ü': 'ue', 'ß': 'ss' }[c]))
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '') || 'unnamed';
}

/**
 * Get blocks from a page/block
 */
async function getBlocks(blockId) {
    const blocks = [];
    let cursor;

    try {
        do {
            const response = await notion.blocks.children.list({
                block_id: blockId,
                start_cursor: cursor,
            });
            blocks.push(...response.results);
            cursor = response.has_more ? response.next_cursor : null;
        } while (cursor);
    } catch (e) {
        console.log(`    Could not get blocks: ${e.message}`);
    }

    return blocks;
}

/**
 * Get database entries
 */
async function getDatabaseEntries(databaseId) {
    const entries = [];
    let cursor;

    try {
        do {
            const response = await notion.databases.query({
                database_id: databaseId,
                start_cursor: cursor,
            });
            entries.push(...response.results);
            cursor = response.has_more ? response.next_cursor : null;
        } while (cursor);
    } catch (e) {
        console.log(`    Could not query database: ${e.message}`);
    }

    return entries;
}

/**
 * Get title from page properties
 */
function getPageTitle(page) {
    const props = page.properties || {};

    // Try different title property names
    for (const key of ['Name', 'title', 'Title', 'name']) {
        if (props[key]?.title) {
            return props[key].title.map(t => t.plain_text).join('');
        }
    }

    return 'Untitled';
}

/**
 * Extract images from properties
 */
function getImagesFromProperties(page, pageTitle) {
    const images = [];
    const props = page.properties || {};

    for (const [key, prop] of Object.entries(props)) {
        if (prop.type === 'files' && prop.files?.length > 0) {
            for (const file of prop.files) {
                let url = '';
                if (file.type === 'file') {
                    url = file.file?.url;
                } else if (file.type === 'external') {
                    url = file.external?.url;
                }

                if (url) {
                    images.push({
                        url,
                        name: file.name || key,
                        pageTitle,
                        property: key
                    });
                }
            }
        }
    }

    return images;
}

/**
 * Process blocks recursively to find images
 */
async function processBlocks(blocks, pageTitle, indent = '') {
    const images = [];

    for (const block of blocks) {
        // Image blocks
        if (block.type === 'image') {
            const imageData = block.image;
            let url = '';

            if (imageData.type === 'file') {
                url = imageData.file?.url;
            } else if (imageData.type === 'external') {
                url = imageData.external?.url;
            }

            if (url) {
                const caption = imageData.caption?.map(c => c.plain_text).join('') || '';
                console.log(`${indent}  🖼️  Image: ${caption || 'no caption'}`);
                images.push({ url, name: caption, pageTitle });
            }
        }

        // Child pages
        if (block.type === 'child_page') {
            console.log(`${indent}  📄 Child page: ${block.child_page.title}`);
            const childBlocks = await getBlocks(block.id);
            const childImages = await processBlocks(childBlocks, block.child_page.title, indent + '  ');
            images.push(...childImages);

            allPages.push({
                id: block.id,
                title: block.child_page.title,
                type: 'child_page'
            });
        }

        // Child databases
        if (block.type === 'child_database') {
            console.log(`${indent}  🗃️  Database: ${block.child_database.title}`);

            const entries = await getDatabaseEntries(block.id);
            console.log(`${indent}     ${entries.length} entries`);

            for (const entry of entries) {
                const entryTitle = getPageTitle(entry);
                console.log(`${indent}     - ${entryTitle}`);

                // Get images from file properties
                const propImages = getImagesFromProperties(entry, entryTitle);
                if (propImages.length > 0) {
                    console.log(`${indent}       🖼️  ${propImages.length} image(s) in properties`);
                    images.push(...propImages);
                }

                // Get images from page content
                const entryBlocks = await getBlocks(entry.id);
                const entryImages = await processBlocks(entryBlocks, entryTitle, indent + '     ');
                images.push(...entryImages);

                allPages.push({
                    id: entry.id,
                    title: entryTitle,
                    type: 'database_entry'
                });
            }
        }

        // Check nested blocks
        if (block.has_children && !['child_page', 'child_database'].includes(block.type)) {
            const nestedBlocks = await getBlocks(block.id);
            const nestedImages = await processBlocks(nestedBlocks, pageTitle, indent);
            images.push(...nestedImages);
        }
    }

    return images;
}

/**
 * Download all images
 */
async function downloadAllImages(images) {
    const baseDir = join(__dirname, '..', 'images', 'screenshots');

    if (!existsSync(baseDir)) {
        mkdirSync(baseDir, { recursive: true });
    }

    console.log(`\n📥 Downloading ${images.length} images...\n`);

    const downloaded = [];

    for (let i = 0; i < images.length; i++) {
        const img = images[i];
        const folderName = sanitize(img.pageTitle);
        const folderPath = join(baseDir, folderName);

        if (!existsSync(folderPath)) {
            mkdirSync(folderPath, { recursive: true });
        }

        // Determine extension from URL or default to jpg
        let ext = 'jpg';
        const urlLower = img.url.toLowerCase();
        if (urlLower.includes('.png')) ext = 'png';
        else if (urlLower.includes('.gif')) ext = 'gif';
        else if (urlLower.includes('.webp')) ext = 'webp';

        const filename = img.name ?
            `${sanitize(img.name)}.${ext}` :
            `image-${i + 1}.${ext}`;
        const filepath = join(folderPath, filename);

        try {
            console.log(`  [${i + 1}/${images.length}] ${folderName}/${filename}`);
            await downloadFile(img.url, filepath);

            downloaded.push({
                pageTitle: img.pageTitle,
                name: img.name || filename,
                localPath: `images/screenshots/${folderName}/${filename}`
            });
        } catch (error) {
            console.error(`    ❌ Failed: ${error.message}`);
        }
    }

    return downloaded;
}

// Main
async function main() {
    console.log('🔍 Exploring Notion structure...\n');
    console.log(`Starting from page: ${PAGE_ID}\n`);

    // Get main page info
    try {
        const mainPage = await notion.pages.retrieve({ page_id: PAGE_ID });
        const mainTitle = getPageTitle(mainPage);
        console.log(`📄 Main page: ${mainTitle}\n`);

        // Get images from main page properties
        const mainImages = getImagesFromProperties(mainPage, mainTitle);
        allImages.push(...mainImages);

    } catch (e) {
        console.log(`Could not get main page: ${e.message}`);
    }

    // Get blocks from main page
    const blocks = await getBlocks(PAGE_ID);
    console.log(`Found ${blocks.length} blocks\n`);

    // Process all blocks
    const blockImages = await processBlocks(blocks, 'Root', '');
    allImages.push(...blockImages);

    console.log(`\n✅ Total: ${allImages.length} images found`);
    console.log(`✅ Total: ${allPages.length} pages/entries found`);

    if (allImages.length > 0) {
        const downloaded = await downloadAllImages(allImages);

        // Create mapping
        const mapping = {};
        for (const img of downloaded) {
            if (!mapping[img.pageTitle]) {
                mapping[img.pageTitle] = [];
            }
            mapping[img.pageTitle].push({
                url: img.localPath,
                name: img.name
            });
        }

        const mappingPath = join(__dirname, '..', 'images', 'screenshot-mapping.json');
        writeFileSync(mappingPath, JSON.stringify(mapping, null, 2));

        console.log(`\n✅ Downloaded ${downloaded.length} images`);
        console.log(`📄 Mapping saved to: images/screenshot-mapping.json\n`);
        console.log(JSON.stringify(mapping, null, 2));
    }
}

main().catch(console.error);
