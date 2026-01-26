#!/usr/bin/env node

/**
 * Write to Notion - Add analysis data to Notion pages
 * Finds image blocks and appends [data]...[/data] blocks below them
 */

import { Client } from '@notionhq/client';
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join, basename } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load environment variables
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
const ANALYSIS_FILE = join(__dirname, '..', 'images', 'screenshot-analysis.json');

// Import marker - same as sync-notion.js
const IMPORT_MARKER = '+++ Ab hier startet der Import Bereich';

/**
 * Load analysis data
 */
function loadAnalysis() {
    try {
        if (existsSync(ANALYSIS_FILE)) {
            return JSON.parse(readFileSync(ANALYSIS_FILE, 'utf-8'));
        }
    } catch (e) {
        console.error('Could not load analysis file:', e.message);
    }
    return { analyses: {} };
}

/**
 * Get rich text content from a block
 */
function getRichText(richTextArray) {
    if (!richTextArray || !Array.isArray(richTextArray)) return '';
    return richTextArray.map(t => t.plain_text).join('');
}

/**
 * Get text content from a block
 */
function getBlockText(block) {
    const type = block.type;
    const data = block[type];
    if (data?.rich_text) {
        return getRichText(data.rich_text);
    }
    return '';
}

/**
 * Get all blocks from a page/block
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
 * Check if a block contains [data] content
 */
function hasDataBlock(text) {
    return text.includes('[data]');
}

/**
 * Format analysis data as [data] block content
 */
function formatDataBlock(analysis) {
    const lines = ['[data]'];

    if (analysis.extractedText && analysis.extractedText.length > 0) {
        lines.push(`**Erkannter Text:** ${analysis.extractedText.join(', ')}`);
    }

    if (analysis.uiElements && analysis.uiElements.length > 0) {
        lines.push(`**UI-Elemente:** ${analysis.uiElements.join(', ')}`);
    }

    if (analysis.screenPurpose) {
        lines.push(`**Beschreibung:** ${analysis.screenPurpose}`);
    }

    lines.push('[/data]');

    return lines.join('\n');
}

/**
 * Create a paragraph block with the data content
 */
function createDataParagraph(analysis) {
    return {
        object: 'block',
        type: 'paragraph',
        paragraph: {
            rich_text: [
                {
                    type: 'text',
                    text: { content: formatDataBlock(analysis) },
                },
            ],
            color: 'gray',
        },
    };
}

/**
 * Find matching analysis for an image URL
 */
function findAnalysisForImage(imageUrl, analyses) {
    // Extract filename from URL
    const urlParts = imageUrl.split('/');
    const filename = urlParts[urlParts.length - 1].split('?')[0]; // Remove query params

    // Try to match by filename (case-insensitive)
    for (const [path, analysis] of Object.entries(analyses)) {
        const analysisFilename = basename(path);
        if (analysisFilename.toLowerCase() === filename.toLowerCase()) {
            return analysis;
        }
    }

    return null;
}

/**
 * Process a single block and its children
 * Returns array of { imageBlockId, analysis } for images that need data blocks
 */
async function processBlocksRecursively(blocks, analyses, depth = 0) {
    const indent = '  '.repeat(depth);
    const toUpdate = [];

    for (let i = 0; i < blocks.length; i++) {
        const block = blocks[i];
        const type = block.type;

        // Check if this is an image
        if (type === 'image') {
            const imageData = block.image;
            let url = '';

            if (imageData.type === 'file') {
                url = imageData.file?.url || '';
            } else if (imageData.type === 'external') {
                url = imageData.external?.url || '';
            }

            if (url) {
                // Check if next block is already a [data] block
                const nextBlock = blocks[i + 1];
                if (nextBlock) {
                    const nextText = getBlockText(nextBlock);
                    if (hasDataBlock(nextText)) {
                        console.log(`${indent}  ✓ Image already has data block`);
                        continue;
                    }
                }

                // Find analysis for this image
                const analysis = findAnalysisForImage(url, analyses);
                if (analysis && analysis.success) {
                    console.log(`${indent}  📷 Found analysis for image`);
                    toUpdate.push({
                        afterBlockId: block.id,
                        analysis: analysis,
                    });
                } else {
                    console.log(`${indent}  ⚠️  No analysis found for image`);
                }
            }
        }

        // Process children
        if (block.has_children) {
            const childBlocks = await getBlocks(block.id);
            const childUpdates = await processBlocksRecursively(childBlocks, analyses, depth + 1);
            toUpdate.push(...childUpdates);
        }
    }

    return toUpdate;
}

/**
 * Write data blocks to Notion
 */
async function writeDataBlocks(updates) {
    console.log(`\n📝 Writing ${updates.length} data blocks to Notion...\n`);

    let written = 0;
    let failed = 0;

    for (const update of updates) {
        try {
            // Append the data block after the image
            await notion.blocks.children.append({
                block_id: update.afterBlockId,
                children: [createDataParagraph(update.analysis)],
            });

            written++;
            console.log(`  ✓ Added data block (${written}/${updates.length})`);

            // Rate limiting
            await new Promise(resolve => setTimeout(resolve, 300));
        } catch (e) {
            failed++;
            console.log(`  ❌ Failed to write block: ${e.message}`);
        }
    }

    return { written, failed };
}

/**
 * Main function
 */
async function main() {
    console.log('📤 Write Analysis Data to Notion\n');

    // Load analysis
    console.log('📂 Loading analysis data...');
    const data = loadAnalysis();
    const analysisCount = Object.keys(data.analyses).length;

    if (analysisCount === 0) {
        console.log('❌ No analysis data found. Run analyze-screenshots.js first.');
        return;
    }

    console.log(`   Found ${analysisCount} analyzed screenshots\n`);

    // Get main page blocks
    console.log('📖 Reading Notion page structure...');
    const allBlocks = await getBlocks(PAGE_ID);

    // Find import marker
    let blocks = allBlocks;
    for (let i = 0; i < allBlocks.length; i++) {
        const text = getBlockText(allBlocks[i]);
        if (text.includes(IMPORT_MARKER)) {
            console.log(`   Found import marker at block ${i + 1}`);
            blocks = allBlocks.slice(i + 1);
            break;
        }
    }

    console.log(`   Processing ${blocks.length} blocks...\n`);

    // Find images that need data blocks
    console.log('🔍 Finding images without data blocks...');
    const updates = await processBlocksRecursively(blocks, data.analyses);

    if (updates.length === 0) {
        console.log('\n✅ All images already have data blocks!');
        return;
    }

    console.log(`\n   Found ${updates.length} images that need data blocks`);

    // Write data blocks
    const results = await writeDataBlocks(updates);

    console.log(`\n✅ Complete!`);
    console.log(`   • Written: ${results.written}`);
    console.log(`   • Failed: ${results.failed}`);
    console.log(`\n   Run sync-notion.js to pull updated data.`);
}

// Export for programmatic use
export { loadAnalysis, formatDataBlock, findAnalysisForImage };

// Run if executed directly
main().catch(console.error);
