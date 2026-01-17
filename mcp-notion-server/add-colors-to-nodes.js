#!/usr/bin/env node

/**
 * Fügt Hex-Farbcodes zu den Top-Level Nodes in Notion hinzu
 */

import { Client } from '@notionhq/client';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnv() {
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
}

const env = loadEnv();
const notion = new Client({ auth: env.NOTION_TOKEN });
const PAGE_ID = env.NOTION_PAGE_ID;

// Farbzuordnung für Top-Level Nodes
const COLOR_MAP = {
    'Touch Sport': '#00A0D2',        // Sky Cyan
    'Premier League': '#3D195B',      // Premier League Purple
    'Sky Sport Design Bundesliga': '#D20515', // Bundesliga Red
    'Tabelle': '#4ADE80',            // Green
    'Liga Information': '#FB923C',    // Orange
    'Telestrator': '#FACC15',        // Yellow
    'Analyse': '#06B6D4',            // Cyan
    'Multiview': '#EC4899',          // Pink
    'Live': '#EF4444',               // Red
    'Headlines': '#F97316',          // Orange
    'Twitter': '#1DA1F2',            // Twitter Blue
    'Sidebar': '#8B5CF6',            // Purple
    'Spiele': '#00A0D2',             // Sky Cyan
};

// Marker nach dem wir starten
const IMPORT_MARKER = '+++ Ab hier startet der Import Bereich';

async function getBlockText(block) {
    const type = block.type;
    const content = block[type];
    if (content?.rich_text) {
        return content.rich_text.map(t => t.plain_text).join('');
    }
    return '';
}

async function updateBlockTitle(blockId, currentTitle, color) {
    // Prüfe ob bereits ein Farbcode vorhanden ist
    const hasColorCode = /\s*\[#[A-Fa-f0-9]{3,6}\]\s*$/.test(currentTitle);
    if (hasColorCode) {
        console.log(`   ⏭️  "${currentTitle}" hat bereits einen Farbcode`);
        return false;
    }

    const newTitle = `${currentTitle} [${color}]`;

    try {
        // Hole Block-Details um den Typ zu kennen
        const block = await notion.blocks.retrieve({ block_id: blockId });
        const blockType = block.type;

        if (!block[blockType]?.rich_text) {
            console.log(`   ⚠️  Block-Typ ${blockType} unterstützt kein rich_text`);
            return false;
        }

        // Update den Block
        const updateData = {
            block_id: blockId,
            [blockType]: {
                rich_text: [{
                    type: 'text',
                    text: { content: newTitle }
                }]
            }
        };

        await notion.blocks.update(updateData);
        console.log(`   ✅ "${currentTitle}" → "${newTitle}"`);
        return true;
    } catch (error) {
        console.log(`   ❌ Fehler bei "${currentTitle}": ${error.message}`);
        return false;
    }
}

async function addColorsToNodes() {
    console.log('🎨 Füge Farbcodes zu Notion Nodes hinzu...\n');

    try {
        // Hole alle Blöcke der Seite
        const blocks = await notion.blocks.children.list({
            block_id: PAGE_ID,
            page_size: 100
        });

        // Finde den Marker
        let markerFound = false;
        let markerIndex = -1;

        for (let i = 0; i < blocks.results.length; i++) {
            const text = await getBlockText(blocks.results[i]);
            if (text.includes(IMPORT_MARKER)) {
                markerFound = true;
                markerIndex = i;
                console.log(`🎯 Import-Marker gefunden bei Block ${i + 1}\n`);
                break;
            }
        }

        if (!markerFound) {
            console.log('⚠️  Import-Marker nicht gefunden, verarbeite alle Blöcke\n');
            markerIndex = -1;
        }

        // Verarbeite Blöcke nach dem Marker
        const blocksToProcess = blocks.results.slice(markerIndex + 1);
        let updated = 0;
        let skipped = 0;

        console.log('📋 Verarbeite Top-Level Blöcke:\n');

        for (const block of blocksToProcess) {
            const title = await getBlockText(block);
            if (!title) continue;

            // Prüfe ob es einen passenden Farbcode gibt
            const color = COLOR_MAP[title];
            if (color) {
                const success = await updateBlockTitle(block.id, title, color);
                if (success) updated++;
                else skipped++;
            }

            // Hole auch Kinder rekursiv (für verschachtelte Top-Level wie "Touch Sport > Sky Sport Design Bundesliga > Spiele")
            if (block.has_children) {
                const children = await notion.blocks.children.list({
                    block_id: block.id,
                    page_size: 50
                });

                for (const child of children.results) {
                    const childTitle = await getBlockText(child);
                    if (!childTitle) continue;

                    const childColor = COLOR_MAP[childTitle];
                    if (childColor) {
                        const success = await updateBlockTitle(child.id, childTitle, childColor);
                        if (success) updated++;
                        else skipped++;
                    }

                    // Gehe eine weitere Ebene tiefer
                    if (child.has_children) {
                        const grandchildren = await notion.blocks.children.list({
                            block_id: child.id,
                            page_size: 50
                        });

                        for (const grandchild of grandchildren.results) {
                            const gcTitle = await getBlockText(grandchild);
                            if (!gcTitle) continue;

                            const gcColor = COLOR_MAP[gcTitle];
                            if (gcColor) {
                                const success = await updateBlockTitle(grandchild.id, gcTitle, gcColor);
                                if (success) updated++;
                                else skipped++;
                            }
                        }
                    }
                }
            }
        }

        console.log(`\n✅ Fertig! ${updated} Nodes aktualisiert, ${skipped} übersprungen`);
        console.log('\n💡 Führe jetzt einen Sync aus, um die Farben in der Web-App zu sehen.');

    } catch (error) {
        console.error('❌ Fehler:', error.message);
        if (error.code === 'object_not_found') {
            console.log('\nHinweis: Stelle sicher, dass PAGE_ID in .env korrekt ist');
        }
    }
}

addColorsToNodes();
