#!/usr/bin/env node

/**
 * Merge Analysis - Combines screenshot-analysis.json with notion-data.json
 * Adds dataFields to each node based on matching screenshot paths
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const NOTION_DATA_FILE = join(__dirname, '..', 'images', 'notion-data.json');
const ANALYSIS_FILE = join(__dirname, '..', 'images', 'screenshot-analysis.json');

/**
 * Load JSON file
 */
function loadJSON(path) {
    try {
        if (existsSync(path)) {
            return JSON.parse(readFileSync(path, 'utf-8'));
        }
    } catch (e) {
        console.error(`Could not load ${path}:`, e.message);
    }
    return null;
}

/**
 * Recursively merge analysis data into notion data tree
 */
function mergeAnalysis(node, analyses, stats = { merged: 0, missing: 0 }) {
    // Check each screenshot in this node
    if (node.screenshots && Array.isArray(node.screenshots)) {
        for (const screenshot of node.screenshots) {
            if (screenshot.url) {
                const analysis = analyses[screenshot.url];
                if (analysis && analysis.success) {
                    // Merge analysis into node's dataFields
                    if (!node.dataFields) {
                        node.dataFields = {
                            extractedText: [],
                            uiElements: [],
                            screenPurpose: '',
                        };
                    }

                    // Merge extracted text
                    if (analysis.extractedText) {
                        node.dataFields.extractedText = [
                            ...new Set([
                                ...(node.dataFields.extractedText || []),
                                ...analysis.extractedText,
                            ])
                        ];
                    }

                    // Merge UI elements
                    if (analysis.uiElements) {
                        node.dataFields.uiElements = [
                            ...new Set([
                                ...(node.dataFields.uiElements || []),
                                ...analysis.uiElements,
                            ])
                        ];
                    }

                    // Set screen purpose (first one wins)
                    if (analysis.screenPurpose && !node.dataFields.screenPurpose) {
                        node.dataFields.screenPurpose = analysis.screenPurpose;
                    }

                    stats.merged++;
                } else {
                    stats.missing++;
                }
            }
        }
    }

    // Process children
    if (node.children && Array.isArray(node.children)) {
        for (const child of node.children) {
            mergeAnalysis(child, analyses, stats);
        }
    }

    return stats;
}

/**
 * Main function
 */
async function main() {
    console.log('🔄 Merging analysis data into notion-data.json\n');

    // Load notion data
    console.log('📂 Loading notion-data.json...');
    const notionData = loadJSON(NOTION_DATA_FILE);
    if (!notionData) {
        console.error('❌ Could not load notion-data.json');
        process.exit(1);
    }

    // Load analysis data
    console.log('📂 Loading screenshot-analysis.json...');
    const analysisData = loadJSON(ANALYSIS_FILE);
    if (!analysisData || !analysisData.analyses) {
        console.error('❌ Could not load screenshot-analysis.json');
        process.exit(1);
    }

    const analysisCount = Object.keys(analysisData.analyses).length;
    console.log(`   Found ${analysisCount} analyzed screenshots\n`);

    // Merge analysis into notion data
    console.log('🔗 Merging analysis data...');
    const stats = mergeAnalysis(notionData, analysisData.analyses);

    console.log(`   • Merged: ${stats.merged} screenshots`);
    console.log(`   • Missing analysis: ${stats.missing} screenshots\n`);

    // Save updated notion data
    writeFileSync(NOTION_DATA_FILE, JSON.stringify(notionData, null, 2));
    console.log('✅ Updated notion-data.json with analysis data');
}

main().catch(console.error);
