#!/usr/bin/env node

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

const YAN_PAGE_ID = '2e9f99a2be2281379653c6ba4b29400f';

async function addHelpBlock() {
  console.log('Füge Hilfe-Dokumentation hinzu...\n');

  try {
    const blocks = [
      {
        object: 'block',
        type: 'heading_2',
        heading_2: {
          rich_text: [{ type: 'text', text: { content: '📋 Anleitung: So füllst du die Datenbank aus' } }]
        }
      },
      {
        object: 'block',
        type: 'callout',
        callout: {
          rich_text: [{ type: 'text', text: { content: 'Klicke auf "Neu" in der Datenbank um ein neues Element hinzuzufügen. Fülle die Felder wie unten beschrieben aus.' } }],
          icon: { emoji: '💡' },
          color: 'blue_background'
        }
      },
      {
        object: 'block',
        type: 'divider',
        divider: {}
      },
      {
        object: 'block',
        type: 'heading_3',
        heading_3: {
          rich_text: [{ type: 'text', text: { content: '📝 Pflichtfelder' } }]
        }
      },
      {
        object: 'block',
        type: 'bulleted_list_item',
        bulleted_list_item: {
          rich_text: [
            { type: 'text', text: { content: 'Name' }, annotations: { bold: true } },
            { type: 'text', text: { content: ' — Der Name des Touchscreen-Elements, wie er in der Baumansicht angezeigt wird. Z.B. "Spiele", "Tabelle", "Match Stats".' } }
          ]
        }
      },
      {
        object: 'block',
        type: 'bulleted_list_item',
        bulleted_list_item: {
          rich_text: [
            { type: 'text', text: { content: 'Kategorie' }, annotations: { bold: true } },
            { type: 'text', text: { content: ' — Hauptkategorie: Spiele, Tabelle, Liga Info, Analyse, Multiview, Live, Headlines, Twitter, Telestrator, Web App.' } }
          ]
        }
      },
      {
        object: 'block',
        type: 'bulleted_list_item',
        bulleted_list_item: {
          rich_text: [
            { type: 'text', text: { content: 'Ebene' }, annotations: { bold: true } },
            { type: 'text', text: { content: ' — Hierarchieebene: 1 = Hauptmenü (Wurzel), 2 = Untermenü, 3 = Detail-Ebene, 4+ = Weitere Verschachtelung.' } }
          ]
        }
      },
      {
        object: 'block',
        type: 'heading_3',
        heading_3: {
          rich_text: [{ type: 'text', text: { content: '🔗 Hierarchie' } }]
        }
      },
      {
        object: 'block',
        type: 'bulleted_list_item',
        bulleted_list_item: {
          rich_text: [
            { type: 'text', text: { content: 'Übergeordnet' }, annotations: { bold: true } },
            { type: 'text', text: { content: ' — Wähle das Eltern-Element aus, um die Hierarchie zu erstellen. Lass es leer für Wurzel-Elemente (Ebene 1). Beispiel: "Match Stats" hat als Übergeordnet: "Spiele".' } }
          ]
        }
      },
      {
        object: 'block',
        type: 'bulleted_list_item',
        bulleted_list_item: {
          rich_text: [
            { type: 'text', text: { content: 'Reihenfolge' }, annotations: { bold: true } },
            { type: 'text', text: { content: ' — Bestimmt die Sortierung innerhalb der gleichen Ebene. Niedrigere Zahlen (1, 2, 3...) erscheinen weiter oben.' } }
          ]
        }
      },
      {
        object: 'block',
        type: 'heading_3',
        heading_3: {
          rich_text: [{ type: 'text', text: { content: '📄 Beschreibung & Aufgaben' } }]
        }
      },
      {
        object: 'block',
        type: 'bulleted_list_item',
        bulleted_list_item: {
          rich_text: [
            { type: 'text', text: { content: 'Beschreibung' }, annotations: { bold: true } },
            { type: 'text', text: { content: ' — Ausführliche Beschreibung: Was macht diese Funktion? Wie wird sie verwendet?' } }
          ]
        }
      },
      {
        object: 'block',
        type: 'bulleted_list_item',
        bulleted_list_item: {
          rich_text: [
            { type: 'text', text: { content: 'Meilensteine' }, annotations: { bold: true } },
            { type: 'text', text: { content: ' — Was muss erreicht werden? Jeder Meilenstein in einer neuen Zeile.' } }
          ]
        }
      },
      {
        object: 'block',
        type: 'bulleted_list_item',
        bulleted_list_item: {
          rich_text: [
            { type: 'text', text: { content: 'Aufgaben' }, annotations: { bold: true } },
            { type: 'text', text: { content: ' — Detaillierte Aufgabenliste. Format: ☐ Aufgabe 1, ☐ Aufgabe 2, ☑ Erledigte Aufgabe.' } }
          ]
        }
      },
      {
        object: 'block',
        type: 'bulleted_list_item',
        bulleted_list_item: {
          rich_text: [
            { type: 'text', text: { content: 'Tage' }, annotations: { bold: true } },
            { type: 'text', text: { content: ' — Geschätzte Arbeitstage für die Umsetzung. Nur ganze Zahlen.' } }
          ]
        }
      },
      {
        object: 'block',
        type: 'heading_3',
        heading_3: {
          rich_text: [{ type: 'text', text: { content: '📊 Status & Medien' } }]
        }
      },
      {
        object: 'block',
        type: 'bulleted_list_item',
        bulleted_list_item: {
          rich_text: [
            { type: 'text', text: { content: 'Status' }, annotations: { bold: true } },
            { type: 'text', text: { content: ' — Entwurf (nicht begonnen), In Bearbeitung (aktiv), Überprüfung (wartet auf Feedback), Abgeschlossen (fertig).' } }
          ]
        }
      },
      {
        object: 'block',
        type: 'bulleted_list_item',
        bulleted_list_item: {
          rich_text: [
            { type: 'text', text: { content: 'Screenshot' }, annotations: { bold: true } },
            { type: 'text', text: { content: ' — Lade Screenshots des Touchscreen-Zustands hoch. Mehrere Bilder möglich (PNG, JPG, GIF).' } }
          ]
        }
      },
      {
        object: 'block',
        type: 'bulleted_list_item',
        bulleted_list_item: {
          rich_text: [
            { type: 'text', text: { content: 'Video URL' }, annotations: { bold: true } },
            { type: 'text', text: { content: ' — Link zum Demonstrations-Video (YouTube, Vimeo oder direkter Link).' } }
          ]
        }
      },
      {
        object: 'block',
        type: 'heading_3',
        heading_3: {
          rich_text: [{ type: 'text', text: { content: '⚙️ Erweitert' } }]
        }
      },
      {
        object: 'block',
        type: 'bulleted_list_item',
        bulleted_list_item: {
          rich_text: [
            { type: 'text', text: { content: 'Symbol' }, annotations: { bold: true } },
            { type: 'text', text: { content: ' — Icon-Name für die Baumansicht: soccer, stats, video, chart, table, settings, etc.' } }
          ]
        }
      },
      {
        object: 'block',
        type: 'bulleted_list_item',
        bulleted_list_item: {
          rich_text: [
            { type: 'text', text: { content: 'Ausgeklappt' }, annotations: { bold: true } },
            { type: 'text', text: { content: ' — Checkbox: Soll dieses Element beim Laden automatisch ausgeklappt sein?' } }
          ]
        }
      },
      {
        object: 'block',
        type: 'divider',
        divider: {}
      }
    ];

    await notion.blocks.children.append({
      block_id: YAN_PAGE_ID,
      children: blocks
    });

    console.log('✅ Hilfe-Dokumentation wurde hinzugefügt!');
    console.log('\nDie Anleitung ist jetzt auf der Yan-Seite sichtbar.');

  } catch (error) {
    console.error('❌ Fehler:', error.message);
    if (error.body) {
      console.error('Details:', JSON.stringify(error.body, null, 2));
    }
  }
}

addHelpBlock();
