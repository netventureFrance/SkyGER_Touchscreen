#!/usr/bin/env node

/**
 * Aktualisiert die Info-Sektion in Notion mit Dokumentation
 * zu Farben, Import-Marker und Nutzung
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

async function updateNotionInfo() {
    console.log('📝 Aktualisiere Notion Info-Bereich...\n');

    try {
        // Erstelle Info-Blöcke
        const blocks = [
            // Überschrift
            {
                object: 'block',
                type: 'heading_1',
                heading_1: {
                    rich_text: [{ type: 'text', text: { content: '📋 Dokumentation' } }],
                    color: 'blue_background'
                }
            },
            {
                object: 'block',
                type: 'paragraph',
                paragraph: {
                    rich_text: [{
                        type: 'text',
                        text: { content: 'Alles Wichtige zur Nutzung der Mindmap-Visualisierung.' }
                    }]
                }
            },
            {
                object: 'block',
                type: 'divider',
                divider: {}
            },

            // Farben für Nodes
            {
                object: 'block',
                type: 'heading_2',
                heading_2: {
                    rich_text: [{ type: 'text', text: { content: '🎨 Farben für Nodes' } }]
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
                        { type: 'text', text: { content: 'Bundesliga [#D20515]' }, annotations: { code: true } },
                        { type: 'text', text: { content: ' → Roter Node' } }
                    ]
                }
            },
            {
                object: 'block',
                type: 'bulleted_list_item',
                bulleted_list_item: {
                    rich_text: [
                        { type: 'text', text: { content: 'Tabelle [#4ADE80]' }, annotations: { code: true } },
                        { type: 'text', text: { content: ' → Grüner Node' } }
                    ]
                }
            },
            {
                object: 'block',
                type: 'bulleted_list_item',
                bulleted_list_item: {
                    rich_text: [
                        { type: 'text', text: { content: 'Premier League [#3D195B]' }, annotations: { code: true } },
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
                                    [{ type: 'text', text: { content: '🔵 Cyan (Sky)' } }],
                                    [{ type: 'text', text: { content: '#00A0D2' }, annotations: { code: true } }]
                                ]
                            }
                        },
                        {
                            type: 'table_row',
                            table_row: {
                                cells: [
                                    [{ type: 'text', text: { content: '🔴 Rot' } }],
                                    [{ type: 'text', text: { content: '#D20515' }, annotations: { code: true } }]
                                ]
                            }
                        },
                        {
                            type: 'table_row',
                            table_row: {
                                cells: [
                                    [{ type: 'text', text: { content: '🟢 Grün' } }],
                                    [{ type: 'text', text: { content: '#4ADE80' }, annotations: { code: true } }]
                                ]
                            }
                        },
                        {
                            type: 'table_row',
                            table_row: {
                                cells: [
                                    [{ type: 'text', text: { content: '🟡 Gelb' } }],
                                    [{ type: 'text', text: { content: '#FACC15' }, annotations: { code: true } }]
                                ]
                            }
                        },
                        {
                            type: 'table_row',
                            table_row: {
                                cells: [
                                    [{ type: 'text', text: { content: '🟠 Orange' } }],
                                    [{ type: 'text', text: { content: '#FB923C' }, annotations: { code: true } }]
                                ]
                            }
                        },
                        {
                            type: 'table_row',
                            table_row: {
                                cells: [
                                    [{ type: 'text', text: { content: '🟣 Violett' } }],
                                    [{ type: 'text', text: { content: '#A855F7' }, annotations: { code: true } }]
                                ]
                            }
                        },
                        {
                            type: 'table_row',
                            table_row: {
                                cells: [
                                    [{ type: 'text', text: { content: '🩷 Pink' } }],
                                    [{ type: 'text', text: { content: '#EC4899' }, annotations: { code: true } }]
                                ]
                            }
                        },
                        {
                            type: 'table_row',
                            table_row: {
                                cells: [
                                    [{ type: 'text', text: { content: '🔵 Twitter Blau' } }],
                                    [{ type: 'text', text: { content: '#1DA1F2' }, annotations: { code: true } }]
                                ]
                            }
                        }
                    ]
                }
            },
            {
                object: 'block',
                type: 'callout',
                callout: {
                    rich_text: [{
                        type: 'text',
                        text: { content: 'Farbvererbung: Kind-Nodes ohne eigenen Farbcode erben automatisch die Farbe ihres Eltern-Nodes.' }
                    }],
                    icon: { type: 'emoji', emoji: '💡' },
                    color: 'blue_background'
                }
            },
            {
                object: 'block',
                type: 'divider',
                divider: {}
            },

            // Import-Marker
            {
                object: 'block',
                type: 'heading_2',
                heading_2: {
                    rich_text: [{ type: 'text', text: { content: '🚀 Import-Bereich' } }]
                }
            },
            {
                object: 'block',
                type: 'paragraph',
                paragraph: {
                    rich_text: [{
                        type: 'text',
                        text: { content: 'Alles ' }
                    }, {
                        type: 'text',
                        text: { content: 'oberhalb' },
                        annotations: { bold: true }
                    }, {
                        type: 'text',
                        text: { content: ' des Import-Markers wird beim Sync ignoriert. Du kannst dort Dokumentation, Notizen oder Anleitungen ablegen.' }
                    }]
                }
            },
            {
                object: 'block',
                type: 'code',
                code: {
                    rich_text: [{ type: 'text', text: { content: '+++ Ab hier startet der Import Bereich' } }],
                    language: 'plain text'
                }
            },
            {
                object: 'block',
                type: 'callout',
                callout: {
                    rich_text: [{
                        type: 'text',
                        text: { content: 'Nur Inhalte NACH diesem Marker werden in die Mindmap importiert!' }
                    }],
                    icon: { type: 'emoji', emoji: '⚠️' },
                    color: 'yellow_background'
                }
            },
            {
                object: 'block',
                type: 'divider',
                divider: {}
            },

            // Sync-Anleitung
            {
                object: 'block',
                type: 'heading_2',
                heading_2: {
                    rich_text: [{ type: 'text', text: { content: '🔄 Synchronisierung' } }]
                }
            },
            {
                object: 'block',
                type: 'numbered_list_item',
                numbered_list_item: {
                    rich_text: [{
                        type: 'text',
                        text: { content: 'Änderungen in Notion vornehmen (Texte, Bilder, Farben)' }
                    }]
                }
            },
            {
                object: 'block',
                type: 'numbered_list_item',
                numbered_list_item: {
                    rich_text: [{
                        type: 'text',
                        text: { content: 'Admin Panel öffnen: ' }
                    }, {
                        type: 'text',
                        text: { content: 'skyger-touchscreen.netlify.app/admin', link: { url: 'https://skyger-touchscreen.netlify.app/admin' } },
                        annotations: { code: true }
                    }]
                }
            },
            {
                object: 'block',
                type: 'numbered_list_item',
                numbered_list_item: {
                    rich_text: [{
                        type: 'text',
                        text: { content: 'Anmelden und "Sync from Notion" klicken' }
                    }]
                }
            },
            {
                object: 'block',
                type: 'numbered_list_item',
                numbered_list_item: {
                    rich_text: [{
                        type: 'text',
                        text: { content: 'Warten bis der 45s Countdown abgelaufen ist' }
                    }]
                }
            },
            {
                object: 'block',
                type: 'numbered_list_item',
                numbered_list_item: {
                    rich_text: [{
                        type: 'text',
                        text: { content: 'Mindmap neu laden - fertig!' }
                    }]
                }
            },
            {
                object: 'block',
                type: 'divider',
                divider: {}
            },

            // Hinweise
            {
                object: 'block',
                type: 'heading_2',
                heading_2: {
                    rich_text: [{ type: 'text', text: { content: '📌 Hinweise' } }]
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
                        text: { content: 'Bilder werden automatisch heruntergeladen und lokal gespeichert' }
                    }]
                }
            },
            {
                object: 'block',
                type: 'bulleted_list_item',
                bulleted_list_item: {
                    rich_text: [{
                        type: 'text',
                        text: { content: 'Die Version wird bei jedem Deploy automatisch erhöht' }
                    }]
                }
            },
            {
                object: 'block',
                type: 'bulleted_list_item',
                bulleted_list_item: {
                    rich_text: [{
                        type: 'text',
                        text: { content: 'In der Sidebar werden Kind-Nodes ebenfalls farbig angezeigt' }
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

        console.log('✅ Notion Info-Bereich erfolgreich aktualisiert!');
        console.log(`   ${response.results.length} Blöcke erstellt`);
        console.log('\n📍 Öffne Notion, um die aktualisierte Dokumentation zu sehen.');
        console.log('   Die Doku erscheint am Ende der Seite.');
        console.log('\n💡 Tipp: Verschiebe die Doku-Blöcke nach oben, VOR den Import-Marker.');

    } catch (error) {
        console.error('❌ Fehler:', error.message);
        if (error.code === 'object_not_found') {
            console.log('\nHinweis: Stelle sicher, dass PAGE_ID in .env korrekt ist');
            console.log('und die Integration Zugriff auf die Seite hat.');
        }
    }
}

updateNotionInfo();
