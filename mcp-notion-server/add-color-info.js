#!/usr/bin/env node

/**
 * Fügt Farbdokumentation zu Notion hinzu
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

async function addColorInfo() {
    console.log('Füge Farbdokumentation zu Notion hinzu...\n');

    try {
        // Erstelle Info-Block mit Farbdokumentation
        const blocks = [
            {
                object: 'block',
                type: 'heading_2',
                heading_2: {
                    rich_text: [{ type: 'text', text: { content: 'Info: Farben für Nodes' } }],
                    color: 'blue_background'
                }
            },
            {
                object: 'block',
                type: 'paragraph',
                paragraph: {
                    rich_text: [{
                        type: 'text',
                        text: { content: 'Du kannst Nodes farbig gestalten, indem du einen Hex-Farbcode am Ende des Titels hinzufügst.' }
                    }]
                }
            },
            {
                object: 'block',
                type: 'heading_3',
                heading_3: {
                    rich_text: [{ type: 'text', text: { content: 'Format' } }]
                }
            },
            {
                object: 'block',
                type: 'code',
                code: {
                    rich_text: [{ type: 'text', text: { content: 'Titel [#RRGGBB]\nTitel [#RGB]' } }],
                    language: 'plain text'
                }
            },
            {
                object: 'block',
                type: 'heading_3',
                heading_3: {
                    rich_text: [{ type: 'text', text: { content: 'Beispiele' } }]
                }
            },
            {
                object: 'block',
                type: 'bulleted_list_item',
                bulleted_list_item: {
                    rich_text: [
                        { type: 'text', text: { content: 'Spiele [#00A0D2]' }, annotations: { code: true } },
                        { type: 'text', text: { content: ' → Cyan Node' } }
                    ]
                }
            },
            {
                object: 'block',
                type: 'bulleted_list_item',
                bulleted_list_item: {
                    rich_text: [
                        { type: 'text', text: { content: 'Tabelle [#FF6B6B]' }, annotations: { code: true } },
                        { type: 'text', text: { content: ' → Roter Node' } }
                    ]
                }
            },
            {
                object: 'block',
                type: 'bulleted_list_item',
                bulleted_list_item: {
                    rich_text: [
                        { type: 'text', text: { content: 'Analyse [#4ADE80]' }, annotations: { code: true } },
                        { type: 'text', text: { content: ' → Grüner Node' } }
                    ]
                }
            },
            {
                object: 'block',
                type: 'bulleted_list_item',
                bulleted_list_item: {
                    rich_text: [
                        { type: 'text', text: { content: 'Shows [#A855F7]' }, annotations: { code: true } },
                        { type: 'text', text: { content: ' → Violetter Node' } }
                    ]
                }
            },
            {
                object: 'block',
                type: 'heading_3',
                heading_3: {
                    rich_text: [{ type: 'text', text: { content: 'Beliebte Farben' } }]
                }
            },
            {
                object: 'block',
                type: 'table',
                table: {
                    table_width: 2,
                    has_column_header: true,
                    has_row_header: false,
                    children: [
                        {
                            type: 'table_row',
                            table_row: {
                                cells: [
                                    [{ type: 'text', text: { content: 'Farbe' } }],
                                    [{ type: 'text', text: { content: 'Hex-Code' } }]
                                ]
                            }
                        },
                        {
                            type: 'table_row',
                            table_row: {
                                cells: [
                                    [{ type: 'text', text: { content: 'Cyan (Sky)' } }],
                                    [{ type: 'text', text: { content: '#00A0D2' }, annotations: { code: true } }]
                                ]
                            }
                        },
                        {
                            type: 'table_row',
                            table_row: {
                                cells: [
                                    [{ type: 'text', text: { content: 'Rot' } }],
                                    [{ type: 'text', text: { content: '#FF6B6B' }, annotations: { code: true } }]
                                ]
                            }
                        },
                        {
                            type: 'table_row',
                            table_row: {
                                cells: [
                                    [{ type: 'text', text: { content: 'Grün' } }],
                                    [{ type: 'text', text: { content: '#4ADE80' }, annotations: { code: true } }]
                                ]
                            }
                        },
                        {
                            type: 'table_row',
                            table_row: {
                                cells: [
                                    [{ type: 'text', text: { content: 'Gelb' } }],
                                    [{ type: 'text', text: { content: '#FACC15' }, annotations: { code: true } }]
                                ]
                            }
                        },
                        {
                            type: 'table_row',
                            table_row: {
                                cells: [
                                    [{ type: 'text', text: { content: 'Orange' } }],
                                    [{ type: 'text', text: { content: '#FB923C' }, annotations: { code: true } }]
                                ]
                            }
                        },
                        {
                            type: 'table_row',
                            table_row: {
                                cells: [
                                    [{ type: 'text', text: { content: 'Violett' } }],
                                    [{ type: 'text', text: { content: '#A855F7' }, annotations: { code: true } }]
                                ]
                            }
                        },
                        {
                            type: 'table_row',
                            table_row: {
                                cells: [
                                    [{ type: 'text', text: { content: 'Pink' } }],
                                    [{ type: 'text', text: { content: '#EC4899' }, annotations: { code: true } }]
                                ]
                            }
                        }
                    ]
                }
            },
            {
                object: 'block',
                type: 'heading_3',
                heading_3: {
                    rich_text: [{ type: 'text', text: { content: 'Hinweise' } }]
                }
            },
            {
                object: 'block',
                type: 'bulleted_list_item',
                bulleted_list_item: {
                    rich_text: [{
                        type: 'text',
                        text: { content: 'Der Farbcode wird automatisch aus dem angezeigten Titel entfernt' }
                    }]
                }
            },
            {
                object: 'block',
                type: 'bulleted_list_item',
                bulleted_list_item: {
                    rich_text: [{
                        type: 'text',
                        text: { content: 'Kind-Elemente erben die Farbe vom Eltern-Node' }
                    }]
                }
            },
            {
                object: 'block',
                type: 'bulleted_list_item',
                bulleted_list_item: {
                    rich_text: [{
                        type: 'text',
                        text: { content: 'Nach Änderungen: Sync im Admin Panel ausführen' }
                    }]
                }
            },
            {
                object: 'block',
                type: 'divider',
                divider: {}
            }
        ];

        // Füge Blöcke zur Seite hinzu
        const response = await notion.blocks.children.append({
            block_id: PAGE_ID,
            children: blocks
        });

        console.log('✅ Farbdokumentation erfolgreich hinzugefügt!');
        console.log(`   ${response.results.length} Blöcke erstellt`);
        console.log('\nÖffne Notion, um die neue "Info: Farben für Nodes" Sektion zu sehen.');

    } catch (error) {
        console.error('❌ Fehler:', error.message);
        if (error.code === 'object_not_found') {
            console.log('\nHinweis: Stelle sicher, dass PAGE_ID in .env korrekt ist');
            console.log('und die Integration Zugriff auf die Seite hat.');
        }
    }
}

addColorInfo();
