#!/usr/bin/env node

/**
 * Sync Notion - Deep exploration of all content including toggles and nested blocks
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
const structure = {
    title: '',
    description: '',
    images: [],
    children: []
};

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
 * Get rich text content
 */
function getRichText(richTextArray) {
    if (!richTextArray) return '';
    return richTextArray.map(t => t.plain_text).join('');
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
        console.log(`    Could not get blocks for ${blockId}: ${e.message}`);
    }

    return blocks;
}

/**
 * Extract text from various block types
 */
function getBlockText(block) {
    const type = block.type;
    const data = block[type];

    if (data?.rich_text) {
        return getRichText(data.rich_text);
    }
    if (data?.title) {
        return getRichText(data.title);
    }
    return '';
}

/**
 * Process blocks recursively - find structure
 */
async function processBlocks(blocks, parentItem, depth = 0) {
    const indent = '  '.repeat(depth);

    for (const block of blocks) {
        const type = block.type;
        const text = getBlockText(block);

        // Headings define new sections
        if (type.startsWith('heading_')) {
            console.log(`${indent}📌 ${type}: ${text}`);

            const newItem = {
                id: block.id,
                title: text,
                description: '',
                images: [],
                children: []
            };
            parentItem.children.push(newItem);

            // If heading has children (toggle heading), process them
            if (block.has_children) {
                const childBlocks = await getBlocks(block.id);
                await processBlocks(childBlocks, newItem, depth + 1);
            }
        }
        // Toggle blocks - these contain nested content
        else if (type === 'toggle') {
            console.log(`${indent}📂 Toggle: ${text}`);

            const newItem = {
                id: block.id,
                title: text,
                description: '',
                images: [],
                children: []
            };
            parentItem.children.push(newItem);

            if (block.has_children) {
                const childBlocks = await getBlocks(block.id);
                await processBlocks(childBlocks, newItem, depth + 1);
            }
        }
        // Bulleted/numbered lists with children
        else if ((type === 'bulleted_list_item' || type === 'numbered_list_item') && text) {
            console.log(`${indent}• ${text}`);

            const newItem = {
                id: block.id,
                title: text,
                description: '',
                images: [],
                children: []
            };
            parentItem.children.push(newItem);

            if (block.has_children) {
                const childBlocks = await getBlocks(block.id);
                await processBlocks(childBlocks, newItem, depth + 1);
            }
        }
        // Paragraphs - add as description to parent
        else if (type === 'paragraph' && text) {
            console.log(`${indent}  ¶ ${text.substring(0, 50)}...`);
            if (!parentItem.description) {
                parentItem.description = text;
            } else {
                parentItem.description += '\n' + text;
            }
        }
        // Images
        else if (type === 'image') {
            const imageData = block.image;
            let url = '';

            if (imageData.type === 'file') {
                url = imageData.file?.url;
            } else if (imageData.type === 'external') {
                url = imageData.external?.url;
            }

            if (url) {
                const caption = getRichText(imageData.caption) || '';
                console.log(`${indent}  🖼️  Image: ${caption || 'no caption'}`);
                parentItem.images.push({ url, caption });
            }
        }
        // Child pages
        else if (type === 'child_page') {
            console.log(`${indent}📄 Page: ${block.child_page.title}`);

            const newItem = {
                id: block.id,
                title: block.child_page.title,
                description: '',
                images: [],
                children: []
            };
            parentItem.children.push(newItem);

            const childBlocks = await getBlocks(block.id);
            await processBlocks(childBlocks, newItem, depth + 1);
        }
        // Child databases
        else if (type === 'child_database') {
            console.log(`${indent}🗃️  Database: ${block.child_database.title}`);
            await processDatabase(block.id, parentItem, depth);
        }
        // Other blocks with children
        else if (block.has_children) {
            const childBlocks = await getBlocks(block.id);
            await processBlocks(childBlocks, parentItem, depth);
        }
    }
}

/**
 * Process database entries
 */
async function processDatabase(databaseId, parentItem, depth) {
    const indent = '  '.repeat(depth);

    try {
        let cursor;
        do {
            const response = await notion.databases.query({
                database_id: databaseId,
                start_cursor: cursor,
            });

            for (const entry of response.results) {
                // Get title from properties
                let title = 'Untitled';
                const props = entry.properties;
                for (const key of ['Name', 'title', 'Title']) {
                    if (props[key]?.title) {
                        title = getRichText(props[key].title);
                        break;
                    }
                }

                console.log(`${indent}  📝 Entry: ${title}`);

                const newItem = {
                    id: entry.id,
                    title: title,
                    description: '',
                    images: [],
                    children: []
                };

                // Check for file properties (images)
                for (const [key, prop] of Object.entries(props)) {
                    if (prop.type === 'files' && prop.files?.length > 0) {
                        for (const file of prop.files) {
                            let url = file.file?.url || file.external?.url;
                            if (url) {
                                console.log(`${indent}    🖼️  File: ${file.name}`);
                                newItem.images.push({ url, caption: file.name });
                            }
                        }
                    }
                    // Rich text properties as description
                    if (prop.type === 'rich_text' && prop.rich_text?.length > 0) {
                        const text = getRichText(prop.rich_text);
                        if (text && !newItem.description) {
                            newItem.description = text;
                        }
                    }
                }

                // Get page content
                const childBlocks = await getBlocks(entry.id);
                await processBlocks(childBlocks, newItem, depth + 2);

                parentItem.children.push(newItem);
            }

            cursor = response.has_more ? response.next_cursor : null;
        } while (cursor);
    } catch (e) {
        console.log(`${indent}  ❌ Could not query database: ${e.message}`);
    }
}

/**
 * Download all images and create mapping
 */
async function downloadAllImages(item, basePath = '') {
    const results = [];
    const folderName = sanitize(item.title || 'root');
    const currentPath = basePath ? `${basePath}/${folderName}` : folderName;

    // Download this item's images
    if (item.images.length > 0) {
        const folderPath = join(__dirname, '..', 'images', 'screenshots', currentPath);
        if (!existsSync(folderPath)) {
            mkdirSync(folderPath, { recursive: true });
        }

        for (let i = 0; i < item.images.length; i++) {
            const img = item.images[i];
            let ext = 'jpg';
            const urlLower = img.url.toLowerCase();
            if (urlLower.includes('.png')) ext = 'png';
            else if (urlLower.includes('.gif')) ext = 'gif';
            else if (urlLower.includes('.webp')) ext = 'webp';

            const filename = img.caption ?
                `${sanitize(img.caption)}.${ext}` :
                `image-${i + 1}.${ext}`;
            const filepath = join(folderPath, filename);

            try {
                console.log(`  📥 ${currentPath}/${filename}`);
                await downloadFile(img.url, filepath);

                results.push({
                    itemTitle: item.title,
                    path: currentPath,
                    filename,
                    caption: img.caption,
                    localPath: `images/screenshots/${currentPath}/${filename}`
                });
            } catch (e) {
                console.log(`  ❌ Failed: ${e.message}`);
            }
        }
    }

    // Process children
    for (const child of item.children) {
        const childResults = await downloadAllImages(child, currentPath);
        results.push(...childResults);
    }

    return results;
}

/**
 * Generate data.js compatible structure
 */
function generateDataStructure(item, depth = 0) {
    const result = {
        id: sanitize(item.title || 'root'),
        label: item.title || 'Untitled',
        description: item.description || '',
        screenshots: item.images.map((img, i) => ({
            url: `images/screenshots/${sanitize(item.title || 'root')}/${img.caption ? sanitize(img.caption) : `image-${i+1}`}.${img.url.includes('.png') ? 'png' : 'jpg'}`,
            name: img.caption || item.title
        })),
        children: item.children.map(child => generateDataStructure(child, depth + 1))
    };

    return result;
}

// Main
async function main() {
    console.log('🔄 Syncing Notion content...\n');
    console.log(`Page ID: ${PAGE_ID}\n`);

    // Get main page info
    try {
        const mainPage = await notion.pages.retrieve({ page_id: PAGE_ID });
        const props = mainPage.properties;

        for (const key of ['Name', 'title', 'Title']) {
            if (props[key]?.title) {
                structure.title = getRichText(props[key].title);
                break;
            }
        }

        console.log(`📄 Main page: ${structure.title || 'Untitled'}\n`);
    } catch (e) {
        console.log(`Could not get main page: ${e.message}`);
        structure.title = 'Sky Sport Design Bundesliga';
    }

    // Get all blocks
    console.log('📖 Reading page structure...\n');
    const blocks = await getBlocks(PAGE_ID);
    await processBlocks(blocks, structure, 0);

    // Count totals
    function countItems(item) {
        let images = item.images.length;
        let children = item.children.length;
        for (const child of item.children) {
            const counts = countItems(child);
            images += counts.images;
            children += counts.children;
        }
        return { images, children };
    }

    const counts = countItems(structure);
    console.log(`\n✅ Found ${counts.images} images in ${counts.children} items\n`);

    // Download images
    if (counts.images > 0) {
        console.log('📥 Downloading images...\n');
        const downloaded = await downloadAllImages(structure);
        console.log(`\n✅ Downloaded ${downloaded.length} images`);
    }

    // Save structure
    const structurePath = join(__dirname, '..', 'images', 'notion-structure.json');
    writeFileSync(structurePath, JSON.stringify(structure, null, 2));
    console.log(`\n📄 Structure saved to: images/notion-structure.json`);

    // Generate data structure for data.js
    const dataStructure = generateDataStructure(structure);
    const dataPath = join(__dirname, '..', 'images', 'notion-data.json');
    writeFileSync(dataPath, JSON.stringify(dataStructure, null, 2));
    console.log(`📄 Data structure saved to: images/notion-data.json`);
}

main().catch(console.error);
