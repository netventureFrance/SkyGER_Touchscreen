#!/usr/bin/env node

/**
 * Fügt Beschreibungen zu allen Datenbank-Eigenschaften hinzu
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
const DATABASE_ID = env.NOTION_DATABASE_ID;

// Beschreibungen für jede Eigenschaft
const propertyDescriptions = {
  'Name': 'Der Name des Touchscreen-Elements, wie er in der Baumansicht angezeigt wird. Z.B. "Spiele", "Tabelle", "Match Stats".',
  'Übergeordnet': 'Wähle das Eltern-Element aus, um die Hierarchie zu erstellen. Lass es leer für Wurzel-Elemente (Hauptmenü). Beispiel: "Match Stats" → Übergeordnet: "Spiele".',
  'Beschreibung': 'Ausführliche Beschreibung des Elements. Was macht diese Funktion? Wie wird sie verwendet? Diese Information erscheint im Detail-Panel der Baumansicht.',
  'Meilensteine': 'Liste der wichtigsten Meilensteine für dieses Element. Was muss erreicht werden? Format: Jeder Meilenstein in einer neuen Zeile.',
  'Aufgaben': 'Detaillierte Aufgabenliste für die Umsetzung. Format: Jede Aufgabe in einer neuen Zeile mit Status.',
  'Tage': 'Geschätzte Anzahl der Arbeitstage für die Umsetzung dieses Elements. Nur ganze Zahlen eingeben.',
  'Status': 'Aktueller Bearbeitungsstand: Entwurf = Noch nicht begonnen, In Bearbeitung = Wird gerade umgesetzt, Überprüfung = Wartet auf Feedback, Abgeschlossen = Fertig.',
  'Kategorie': 'Hauptkategorie des Elements. Entspricht den Hauptmenüpunkten des Touchscreens.',
  'Screenshot': 'Lade hier Screenshots des Touchscreen-Zustands hoch. Mehrere Bilder möglich. PNG, JPG, GIF.',
  'Video URL': 'Link zum Video, das diesen Touchscreen-Zustand zeigt. YouTube, Vimeo oder direkter Video-Link.',
  'Reihenfolge': 'Bestimmt die Sortierung innerhalb der gleichen Ebene. Niedrigere Zahlen erscheinen weiter oben.',
  'Ebene': 'Hierarchieebene: 1 = Hauptmenü, 2 = Untermenü, 3 = Detail-Ebene, 4+ = Weitere Verschachtelung.',
  'Symbol': 'Icon-Bezeichner für die Anzeige in der Baumansicht. Z.B. "soccer", "stats", "video", "chart".',
  'Ausgeklappt': 'Soll dieses Element beim Laden automatisch ausgeklappt sein? Aktivieren für wichtige Elemente.'
};

async function addDescriptions() {
  console.log('Füge Beschreibungen zu Datenbank-Eigenschaften hinzu...\n');

  try {
    // Hole aktuelle Datenbank-Struktur
    const db = await notion.databases.retrieve({ database_id: DATABASE_ID });
    console.log('Datenbank:', db.title[0]?.plain_text);
    console.log('');

    // Update jede Eigenschaft einzeln mit Beschreibung
    for (const [propName, description] of Object.entries(propertyDescriptions)) {
      const existingProp = db.properties[propName];
      if (!existingProp) {
        console.log(`⚠ ${propName} nicht gefunden`);
        continue;
      }

      // Erstelle Update-Objekt basierend auf Eigenschaftstyp
      const propType = existingProp.type;
      let updateConfig = { description };

      // Füge den erforderlichen Typ hinzu
      switch (propType) {
        case 'title':
          updateConfig.title = {};
          break;
        case 'rich_text':
          updateConfig.rich_text = {};
          break;
        case 'number':
          updateConfig.number = { format: existingProp.number?.format || 'number' };
          break;
        case 'select':
          updateConfig.select = { options: existingProp.select.options };
          break;
        case 'multi_select':
          updateConfig.multi_select = { options: existingProp.multi_select.options };
          break;
        case 'checkbox':
          updateConfig.checkbox = {};
          break;
        case 'url':
          updateConfig.url = {};
          break;
        case 'files':
          updateConfig.files = {};
          break;
        case 'relation':
          updateConfig.relation = {
            database_id: existingProp.relation.database_id,
            single_property: existingProp.relation.single_property || {}
          };
          break;
        default:
          console.log(`⚠ Unbekannter Typ für ${propName}: ${propType}`);
          continue;
      }

      try {
        await notion.databases.update({
          database_id: DATABASE_ID,
          properties: {
            [propName]: updateConfig
          }
        });
        console.log(`✓ ${propName}`);
      } catch (err) {
        console.log(`✗ ${propName}: ${err.message}`);
      }
    }

    console.log('\n✅ Beschreibungen wurden hinzugefügt!');
    console.log('\nÖffne die Datenbank in Notion und klicke auf einen');
    console.log('Spaltennamen, um die Beschreibung zu sehen.');

  } catch (error) {
    console.error('❌ Fehler:', error.message);
    throw error;
  }
}

addDescriptions();
