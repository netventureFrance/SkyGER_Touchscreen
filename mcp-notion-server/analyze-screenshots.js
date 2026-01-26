#!/usr/bin/env node

/**
 * Analyze Screenshots - Claude Vision API
 * Extracts text, UI elements, and descriptions from screenshots
 */

import Anthropic from '@anthropic-ai/sdk';
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join, relative } from 'path';

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

// Check for Anthropic API key
if (!env.ANTHROPIC_API_KEY) {
    console.error('❌ ANTHROPIC_API_KEY not found in .env file');
    console.error('   Add: ANTHROPIC_API_KEY=sk-ant-...');
    process.exit(1);
}

const anthropic = new Anthropic({
    apiKey: env.ANTHROPIC_API_KEY,
});

const SCREENSHOTS_DIR = join(__dirname, '..', 'images', 'screenshots');
const CACHE_FILE = join(__dirname, '..', 'images', 'screenshot-analysis.json');
const NOTION_DATA_FILE = join(__dirname, '..', 'images', 'notion-data.json');

// Supported image formats
const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.gif', '.webp'];

/**
 * Extract all screenshot URLs from notion-data.json recursively
 */
function extractScreenshotUrls(node, urls = []) {
    if (node.screenshots && Array.isArray(node.screenshots)) {
        for (const screenshot of node.screenshots) {
            if (screenshot.url) {
                urls.push(screenshot.url);
            }
        }
    }
    if (node.children && Array.isArray(node.children)) {
        for (const child of node.children) {
            extractScreenshotUrls(child, urls);
        }
    }
    return urls;
}

/**
 * Get all screenshot files from notion-data.json (only images actually used)
 */
function getAllScreenshots() {
    const files = [];

    try {
        // Load notion-data.json to get only referenced images
        const notionData = JSON.parse(readFileSync(NOTION_DATA_FILE, 'utf-8'));
        const urls = extractScreenshotUrls(notionData);

        for (const url of urls) {
            const absolutePath = join(__dirname, '..', url);

            if (existsSync(absolutePath)) {
                const stat = statSync(absolutePath);
                const filename = url.split('/').pop();

                files.push({
                    absolutePath: absolutePath,
                    relativePath: url.replace('images/screenshots/', ''),
                    localPath: url,
                    filename: filename,
                    size: stat.size,
                    modified: stat.mtime.toISOString(),
                });
            } else {
                console.log(`  ⚠️ File not found: ${url}`);
            }
        }
    } catch (e) {
        console.error(`Error loading notion-data.json:`, e.message);
    }

    return files;
}

/**
 * Load existing analysis cache
 */
function loadCache() {
    try {
        if (existsSync(CACHE_FILE)) {
            return JSON.parse(readFileSync(CACHE_FILE, 'utf-8'));
        }
    } catch (e) {
        console.log('Could not load cache, starting fresh');
    }
    return { analyses: {}, lastRun: null };
}

/**
 * Save analysis cache
 */
function saveCache(cache) {
    cache.lastRun = new Date().toISOString();
    writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));
}

/**
 * Check if image needs re-analysis
 */
function needsAnalysis(file, cache) {
    const existing = cache.analyses[file.localPath];
    if (!existing) return true;

    // Re-analyze if file was modified after last analysis
    const fileModified = new Date(file.modified);
    const lastAnalyzed = new Date(existing.analyzedAt);
    return fileModified > lastAnalyzed;
}

/**
 * Get media type for image
 */
function getMediaType(filename) {
    const ext = filename.toLowerCase().slice(filename.lastIndexOf('.'));
    const types = {
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.gif': 'image/gif',
        '.webp': 'image/webp',
    };
    return types[ext] || 'image/png';
}

/**
 * Analyze a single screenshot with Claude Vision
 */
async function analyzeScreenshot(file) {
    console.log(`  🔍 Analyzing: ${file.relativePath}`);

    try {
        // Read image as base64
        const imageBuffer = readFileSync(file.absolutePath);
        const base64Image = imageBuffer.toString('base64');
        const mediaType = getMediaType(file.filename);

        // Call Claude Vision API
        const response = await anthropic.messages.create({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 1024,
            messages: [
                {
                    role: 'user',
                    content: [
                        {
                            type: 'image',
                            source: {
                                type: 'base64',
                                media_type: mediaType,
                                data: base64Image,
                            },
                        },
                        {
                            type: 'text',
                            text: `Analyze this sports broadcast screenshot from Sky Sport Germany (Bundesliga). Extract:

1. **Visible Text**: All readable text (team names, scores, player names, statistics, labels, etc.)
2. **UI Elements**: Key interface components (score panels, data tables, graphics, logos, etc.)
3. **Screen Purpose**: Brief description of what this screen shows (1-2 sentences in German)

Respond in this exact JSON format:
{
  "extractedText": ["text1", "text2", ...],
  "uiElements": ["element1", "element2", ...],
  "screenPurpose": "German description of screen purpose"
}

Focus on accuracy. Only include text you can clearly read. Keep descriptions concise.`,
                        },
                    ],
                },
            ],
        });

        // Parse response
        const content = response.content[0].text;

        // Try to extract JSON from response
        let parsed;
        try {
            // Try direct parse first
            parsed = JSON.parse(content);
        } catch {
            // Try to extract JSON from markdown code block
            const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
            if (jsonMatch) {
                parsed = JSON.parse(jsonMatch[1].trim());
            } else {
                // Try to find JSON object in text
                const objectMatch = content.match(/\{[\s\S]*\}/);
                if (objectMatch) {
                    parsed = JSON.parse(objectMatch[0]);
                } else {
                    throw new Error('Could not parse JSON from response');
                }
            }
        }

        return {
            imagePath: file.localPath,
            extractedText: parsed.extractedText || [],
            uiElements: parsed.uiElements || [],
            screenPurpose: parsed.screenPurpose || '',
            analyzedAt: new Date().toISOString(),
            success: true,
        };

    } catch (error) {
        console.error(`    ❌ Error: ${error.message}`);
        return {
            imagePath: file.localPath,
            extractedText: [],
            uiElements: [],
            screenPurpose: '',
            analyzedAt: new Date().toISOString(),
            success: false,
            error: error.message,
        };
    }
}

/**
 * Rate limiter - simple delay between requests
 */
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Main analysis function
 */
async function main() {
    console.log('🔄 Screenshot Analysis with Claude Vision\n');

    // Get all screenshots from notion-data.json
    console.log('📂 Loading screenshots from notion-data.json...');
    const screenshots = getAllScreenshots();
    console.log(`   Found ${screenshots.length} screenshots\n`);

    if (screenshots.length === 0) {
        console.log('No screenshots found to analyze.');
        return;
    }

    // Load cache
    const cache = loadCache();

    // Filter to only screenshots that need analysis
    const toAnalyze = screenshots.filter(f => needsAnalysis(f, cache));
    const skipped = screenshots.length - toAnalyze.length;

    console.log(`📊 Analysis status:`);
    console.log(`   • ${skipped} screenshots already analyzed (cached)`);
    console.log(`   • ${toAnalyze.length} screenshots need analysis\n`);

    if (toAnalyze.length === 0) {
        console.log('✅ All screenshots are already analyzed!');
        console.log(`   Cache file: images/screenshot-analysis.json`);
        return;
    }

    // Estimate cost
    const estimatedCost = (toAnalyze.length * 0.015).toFixed(2);
    console.log(`💰 Estimated cost: ~$${estimatedCost} (${toAnalyze.length} images × $0.015)\n`);

    // Analyze screenshots
    console.log('🔍 Starting analysis...\n');
    let analyzed = 0;
    let failed = 0;

    for (const file of toAnalyze) {
        const result = await analyzeScreenshot(file);

        if (result.success) {
            cache.analyses[file.localPath] = result;
            analyzed++;
        } else {
            failed++;
        }

        // Save cache periodically (every 10 images)
        if ((analyzed + failed) % 10 === 0) {
            saveCache(cache);
        }

        // Rate limiting - 1 second between requests
        if (toAnalyze.indexOf(file) < toAnalyze.length - 1) {
            await delay(1000);
        }
    }

    // Final save
    saveCache(cache);

    console.log(`\n✅ Analysis complete!`);
    console.log(`   • Analyzed: ${analyzed}`);
    console.log(`   • Failed: ${failed}`);
    console.log(`   • Cache file: images/screenshot-analysis.json`);

    // Summary statistics
    const totalAnalyzed = Object.keys(cache.analyses).length;
    console.log(`\n📊 Total in cache: ${totalAnalyzed} screenshots`);
}

// Export for programmatic use
export { getAllScreenshots, analyzeScreenshot, loadCache, saveCache };

// Run if executed directly
main().catch(console.error);
