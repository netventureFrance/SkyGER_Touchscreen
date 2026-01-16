#!/usr/bin/env node

/**
 * Download Images from Notion
 * Fetches all images from the Interaktive Mindmap page and saves them locally
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

// Store found images
const images = [];
const pageData = [];

/**
 * Download file from URL
 */
function downloadFile(url, filepath) {
    return new Promise((resolve, reject) => {
        const protocol = url.startsWith('https') ? https : http;
        const file = writeFileSync;

        protocol.get(url, (response) => {
            if (response.statusCode === 302 || response.statusCode === 301) {
                // Follow redirect
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
        .replace(/^-|-$/g, '');
}

/**
 * Get page title
 */
function getTitle(page) {
    if (page.properties?.title?.title) {
        return page.properties.title.title.map(t => t.plain_text).join('');
    }
    if (page.properties?.Name?.title) {
        return page.properties.Name.title.map(t => t.plain_text).join('');
    }
    // For child_page blocks
    if (page.child_page?.title) {
        return page.child_page.title;
    }
    return 'untitled';
}

/**
 * Get blocks from a page
 */
async function getPageBlocks(pageId) {
    const blocks = [];
    let cursor;

    do {
        const response = await notion.blocks.children.list({
            block_id: pageId,
            start_cursor: cursor,
        });
        blocks.push(...response.results);
        cursor = response.has_more ? response.next_cursor : null;
    } while (cursor);

    return blocks;
}

/**
 * Process a page and find images
 */
async function processPage(pageId, parentName = '', level = 0) {
    const indent = '  '.repeat(level);

    try {
        // Get page info
        let pageTitle = parentName;
        try {
            const page = await notion.pages.retrieve({ page_id: pageId });
            pageTitle = getTitle(page) || parentName;
            console.log(`${indent}📄 ${pageTitle}`);
        } catch (e) {
            console.log(`${indent}📄 ${parentName || pageId}`);
        }

        const pageInfo = {
            id: pageId,
            title: pageTitle,
            images: [],
            children: []
        };

        // Get blocks
        const blocks = await getPageBlocks(pageId);

        for (const block of blocks) {
            // Check for images
            if (block.type === 'image') {
                const imageData = block.image;
                let url = '';

                if (imageData.type === 'file') {
                    url = imageData.file.url;
                } else if (imageData.type === 'external') {
                    url = imageData.external.url;
                }

                if (url) {
                    const caption = imageData.caption?.map(c => c.plain_text).join('') || '';
                    console.log(`${indent}  🖼️  Found image: ${caption || 'no caption'}`);

                    pageInfo.images.push({
                        url,
                        caption,
                        blockId: block.id
                    });

                    images.push({
                        url,
                        caption,
                        pageTitle,
                        pageId
                    });
                }
            }

            // Check for child pages
            if (block.type === 'child_page') {
                const childTitle = block.child_page.title;
                console.log(`${indent}  📁 Child page: ${childTitle}`);

                const childInfo = await processPage(block.id, childTitle, level + 1);
                pageInfo.children.push(childInfo);
            }

            // Check for child databases
            if (block.type === 'child_database') {
                console.log(`${indent}  🗃️  Database: ${block.child_database.title}`);
            }
        }

        pageData.push(pageInfo);
        return pageInfo;

    } catch (error) {
        console.error(`${indent}❌ Error processing page ${pageId}:`, error.message);
        return { id: pageId, title: parentName, images: [], children: [] };
    }
}

/**
 * Download all found images
 */
async function downloadImages() {
    const baseDir = join(__dirname, '..', 'images', 'screenshots');

    // Create base directory
    if (!existsSync(baseDir)) {
        mkdirSync(baseDir, { recursive: true });
    }

    console.log(`\n📥 Downloading ${images.length} images...\n`);

    const downloaded = [];

    for (let i = 0; i < images.length; i++) {
        const img = images[i];
        const folderName = sanitize(img.pageTitle);
        const folderPath = join(baseDir, folderName);

        // Create folder for page
        if (!existsSync(folderPath)) {
            mkdirSync(folderPath, { recursive: true });
        }

        // Determine filename
        const ext = img.url.includes('.png') ? 'png' :
                   img.url.includes('.gif') ? 'gif' : 'jpg';
        const filename = img.caption ?
            `${sanitize(img.caption)}.${ext}` :
            `image-${i + 1}.${ext}`;
        const filepath = join(folderPath, filename);

        try {
            console.log(`  [${i + 1}/${images.length}] ${folderName}/${filename}`);
            await downloadFile(img.url, filepath);

            downloaded.push({
                pageTitle: img.pageTitle,
                caption: img.caption,
                localPath: `images/screenshots/${folderName}/${filename}`
            });
        } catch (error) {
            console.error(`    ❌ Failed: ${error.message}`);
        }
    }

    return downloaded;
}

/**
 * Generate data mapping
 */
function generateMapping(downloaded) {
    const mapping = {};

    for (const img of downloaded) {
        const key = img.pageTitle;
        if (!mapping[key]) {
            mapping[key] = [];
        }
        mapping[key].push({
            url: img.localPath,
            name: img.caption || img.pageTitle
        });
    }

    return mapping;
}

// Main
async function main() {
    console.log('🔍 Exploring Notion page structure...\n');
    console.log(`Page ID: ${PAGE_ID}\n`);

    await processPage(PAGE_ID, 'Interaktive Mindmap');

    console.log(`\n✅ Found ${images.length} images total\n`);

    if (images.length > 0) {
        const downloaded = await downloadImages();

        // Save mapping
        const mapping = generateMapping(downloaded);
        const mappingPath = join(__dirname, '..', 'images', 'screenshot-mapping.json');
        writeFileSync(mappingPath, JSON.stringify(mapping, null, 2));

        console.log(`\n✅ Downloaded ${downloaded.length} images`);
        console.log(`📄 Mapping saved to: images/screenshot-mapping.json`);

        console.log('\n📋 Mapping:');
        console.log(JSON.stringify(mapping, null, 2));
    } else {
        console.log('No images found in the Notion pages.');
    }
}

main().catch(console.error);
