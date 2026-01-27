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

// Load environment variables (process.env for Netlify, .env file for local)
function loadEnv() {
    // First check if required vars are in process.env (Netlify)
    if (process.env.NOTION_TOKEN) {
        console.log('Using environment variables from process.env');
        return process.env;
    }

    // Fall back to .env file (local development)
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
        console.log('Using environment variables from .env file');
        return vars;
    } catch (e) {
        console.error('Could not load .env file:', e.message);
        console.error('Set NOTION_TOKEN and NOTION_PAGE_ID in environment or create .env file');
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

// Import marker - everything before this line in Notion is ignored
const IMPORT_MARKER = '+++ Ab hier startet der Import Bereich';

/**
 * Find the import marker and return blocks after it
 * If no marker found, returns all blocks
 */
function filterBlocksFromMarker(blocks) {
    let markerFound = false;
    let markerIndex = -1;

    for (let i = 0; i < blocks.length; i++) {
        const block = blocks[i];
        const text = getBlockText(block);

        if (text && text.includes(IMPORT_MARKER)) {
            markerFound = true;
            markerIndex = i;
            console.log(`\n🎯 Import marker found at block ${i + 1}`);
            console.log(`   "${text.substring(0, 60)}..."\n`);
            break;
        }
    }

    if (markerFound) {
        const skipped = markerIndex + 1;
        const remaining = blocks.length - skipped;
        console.log(`📋 Skipping ${skipped} blocks before marker`);
        console.log(`📋 Processing ${remaining} blocks after marker\n`);
        return blocks.slice(markerIndex + 1); // Return blocks AFTER the marker
    } else {
        console.log('⚠️  No import marker found - processing all blocks');
        console.log(`   Add "${IMPORT_MARKER}" in Notion to skip content above it\n`);
        return blocks;
    }
}

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
function sanitize(name, maxLength = 50) {
    const sanitized = name.toLowerCase()
        .replace(/[äöüß]/g, c => ({ 'ä': 'ae', 'ö': 'oe', 'ü': 'ue', 'ß': 'ss' }[c]))
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '') || 'unnamed';

    // Truncate to maxLength, but don't cut in middle of word
    if (sanitized.length <= maxLength) return sanitized;
    const truncated = sanitized.substring(0, maxLength);
    const lastDash = truncated.lastIndexOf('-');
    return lastDash > 10 ? truncated.substring(0, lastDash) : truncated;
}

/**
 * Extract metadata from title text
 * Supports formats (all at end of title):
 *   - Color: "Title [#RRGGBB]" or "Title [#RGB]"
 *   - Direction: "Title [L]" or "Title [R]" (Left/Right)
 *   - Combined: "Title [L][#RRGGBB]" or "Title [#RRGGBB][L]" (any order)
 * Returns { title: "clean title", color: "#RRGGBB" or null, direction: "left"/"right" or null }
 */
function extractTitleMetadata(text) {
    if (!text) return { title: '', color: null, direction: null };

    let title = text;
    let color = null;
    let direction = null;

    // Extract all bracketed tags from end of string (loop to handle multiple)
    let hasMore = true;
    while (hasMore) {
        hasMore = false;

        // Try to match direction [L] or [R] at end
        const dirMatch = title.match(/\s*\[([LlRr])\]\s*$/);
        if (dirMatch) {
            direction = dirMatch[1].toLowerCase() === 'l' ? 'left' : 'right';
            title = title.replace(dirMatch[0], '');
            hasMore = true;
            continue;
        }

        // Try to match hex color [#RRGGBB] or [#RGB] at end
        const hexMatch = title.match(/\s*\[#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})\]\s*$/);
        if (hexMatch) {
            let hexColor = hexMatch[1];
            // Expand 3-digit hex to 6-digit
            if (hexColor.length === 3) {
                hexColor = hexColor.split('').map(c => c + c).join('');
            }
            color = '#' + hexColor.toUpperCase();
            title = title.replace(hexMatch[0], '');
            hasMore = true;
            continue;
        }
    }

    return { title: title.trim(), color, direction };
}

// Backwards compatibility alias
function extractHexColor(text) {
    const { title, color } = extractTitleMetadata(text);
    return { title, color };
}

/**
 * Get rich text content
 */
function getRichText(richTextArray) {
    if (!richTextArray || !Array.isArray(richTextArray)) return '';
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
 * Parse [data]...[/data] annotations from text
 * Returns { cleanText: string, dataFields: object|null }
 */
function parseDataAnnotations(text) {
    if (!text) return { cleanText: '', dataFields: null };

    // Check if text contains [data] blocks
    const dataMatch = text.match(/\[data\]([\s\S]*?)\[\/data\]/);
    if (!dataMatch) {
        return { cleanText: text, dataFields: null };
    }

    // Extract content between [data] tags
    const dataContent = dataMatch[1].trim();

    // Parse the fields
    const dataFields = {
        extractedText: [],
        uiElements: [],
        screenPurpose: '',
    };

    // Parse each line - looking for **Label:** Value format
    const lines = dataContent.split('\n');
    for (const line of lines) {
        const trimmed = line.trim();

        // Erkannter Text (Extracted Text)
        const textMatch = trimmed.match(/\*\*Erkannter Text:\*\*\s*(.*)/);
        if (textMatch) {
            dataFields.extractedText = textMatch[1].split(',').map(s => s.trim()).filter(Boolean);
            continue;
        }

        // UI-Elemente (UI Elements)
        const uiMatch = trimmed.match(/\*\*UI-Elemente:\*\*\s*(.*)/);
        if (uiMatch) {
            dataFields.uiElements = uiMatch[1].split(',').map(s => s.trim()).filter(Boolean);
            continue;
        }

        // Beschreibung (Description / Screen Purpose)
        const descMatch = trimmed.match(/\*\*Beschreibung:\*\*\s*(.*)/);
        if (descMatch) {
            dataFields.screenPurpose = descMatch[1].trim();
            continue;
        }
    }

    // Remove [data] block from text to get clean description
    const cleanText = text.replace(/\[data\][\s\S]*?\[\/data\]/g, '').trim();

    // Only return dataFields if we found actual content
    const hasData = dataFields.extractedText.length > 0 ||
                    dataFields.uiElements.length > 0 ||
                    dataFields.screenPurpose;

    return {
        cleanText,
        dataFields: hasData ? dataFields : null,
    };
}

/**
 * Check if text is a [data] block (for filtering in description)
 */
function isDataBlock(text) {
    return text && text.trim().startsWith('[data]');
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
            // Extract metadata (color, direction) from title text
            const { title: cleanTitle, color: hexColor, direction } = extractTitleMetadata(text);
            // Fall back to Notion block color if no hex color specified
            const headingData = block[type];
            const notionColor = headingData?.color || 'default';
            const color = hexColor || (notionColor !== 'default' ? notionColor : null);

            const dirInfo = direction ? ` [${direction}]` : '';
            console.log(`${indent}📌 ${type}: ${cleanTitle}${color ? ` [${color}]` : ''}${dirInfo}`);

            const newItem = {
                id: block.id,
                title: cleanTitle,
                description: '',
                color: color, // Hex color or Notion color
                direction: direction, // 'left', 'right', or null
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
            // Extract metadata (color, direction) from title text
            const { title: cleanTitle, color: hexColor, direction } = extractTitleMetadata(text);
            // Fall back to Notion block color if no hex color specified
            const notionColor = block.toggle?.color || 'default';
            const color = hexColor || (notionColor !== 'default' ? notionColor : null);

            const dirInfo = direction ? ` [${direction}]` : '';
            console.log(`${indent}📂 Toggle: ${cleanTitle}${color ? ` [${color}]` : ''}${dirInfo}`);

            const newItem = {
                id: block.id,
                title: cleanTitle,
                description: '',
                color: color, // Hex color or Notion color
                direction: direction, // 'left', 'right', or null
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
            // Extract metadata (color, direction) from title text
            const { title: cleanTitle, color: hexColor, direction } = extractTitleMetadata(text);
            // Fall back to Notion block color if no hex color specified
            const listData = block[type];
            const notionColor = listData?.color || 'default';
            const color = hexColor || (notionColor !== 'default' ? notionColor : null);

            const dirInfo = direction ? ` [${direction}]` : '';
            console.log(`${indent}• ${cleanTitle}${color ? ` [${color}]` : ''}${dirInfo}`);

            const newItem = {
                id: block.id,
                title: cleanTitle,
                description: '',
                color: color, // Hex color or Notion color
                direction: direction, // 'left', 'right', or null
                images: [],
                children: []
            };
            parentItem.children.push(newItem);

            if (block.has_children) {
                const childBlocks = await getBlocks(block.id);
                await processBlocks(childBlocks, newItem, depth + 1);
            }
        }
        // Paragraphs - add as description to parent (handle [data] blocks)
        else if (type === 'paragraph' && text) {
            // Check if this is a [data] block
            if (isDataBlock(text)) {
                const { dataFields } = parseDataAnnotations(text);
                if (dataFields) {
                    console.log(`${indent}  📊 Data block found`);
                    // Store dataFields on parent item
                    if (!parentItem.dataFields) {
                        parentItem.dataFields = dataFields;
                    } else {
                        // Merge with existing dataFields
                        parentItem.dataFields.extractedText = [
                            ...parentItem.dataFields.extractedText,
                            ...dataFields.extractedText,
                        ];
                        parentItem.dataFields.uiElements = [
                            ...parentItem.dataFields.uiElements,
                            ...dataFields.uiElements,
                        ];
                        if (dataFields.screenPurpose && !parentItem.dataFields.screenPurpose) {
                            parentItem.dataFields.screenPurpose = dataFields.screenPurpose;
                        }
                    }
                }
            } else {
                // Regular paragraph - add to description
                console.log(`${indent}  ¶ ${text.substring(0, 50)}...`);
                if (!parentItem.description) {
                    parentItem.description = text;
                } else {
                    parentItem.description += '\n' + text;
                }
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
                // Skip if file already exists (optimization)
                if (existsSync(filepath)) {
                    console.log(`  ✓ ${currentPath}/${filename} (cached)`);
                } else {
                    console.log(`  📥 ${currentPath}/${filename}`);
                    await downloadFile(img.url, filepath);
                }

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
 * Generate data.js compatible structure with correct paths
 */
function generateDataStructure(item, basePath = '', depth = 0) {
    const folderName = sanitize(item.title || 'root');
    const currentPath = basePath ? `${basePath}/${folderName}` : folderName;

    const result = {
        id: sanitize(item.title || 'root'),
        label: item.title || 'Untitled',
        description: item.description || '',
        color: item.color || null, // Notion background color
        direction: item.direction || null, // 'left', 'right', or null
        screenshots: item.images.map((img, i) => {
            let ext = 'jpg';
            const urlLower = img.url.toLowerCase();
            if (urlLower.includes('.png')) ext = 'png';
            else if (urlLower.includes('.gif')) ext = 'gif';
            else if (urlLower.includes('.webp')) ext = 'webp';

            const filename = img.caption ?
                `${sanitize(img.caption)}.${ext}` :
                `image-${i + 1}.${ext}`;

            return {
                url: `images/screenshots/${currentPath}/${filename}`,
                name: img.caption || item.title
            };
        }),
        children: item.children.map(child => generateDataStructure(child, currentPath, depth + 1))
    };

    // Add dataFields if present (from [data] annotations)
    if (item.dataFields) {
        result.dataFields = item.dataFields;
    }

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
    const allBlocks = await getBlocks(PAGE_ID);

    // Filter to only process blocks after the import marker
    const blocks = filterBlocksFromMarker(allBlocks);
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

    // Increment version
    const versionPath = join(__dirname, '..', 'version.json');
    try {
        const version = JSON.parse(readFileSync(versionPath, 'utf8'));
        version.minor = (version.minor || 0) + 1;
        if (version.minor >= 100) {
            version.minor = 0;
            version.major = (version.major || 1) + 1;
        }
        writeFileSync(versionPath, JSON.stringify(version, null, 2) + '\n');
        console.log(`\n📦 Version updated to ${version.major}.${version.minor}`);
    } catch (e) {
        console.log(`\n⚠️ Could not update version: ${e.message}`);
    }

    console.log(`\n✅ Sync completed! ${counts.children} items, ${counts.images} images`);
}

main().catch(console.error);
