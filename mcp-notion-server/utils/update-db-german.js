#!/usr/bin/env node

/**
 * Update database properties to German
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
const DATABASE_ID = env.NOTION_DATABASE_ID || '2eaf99a2-be22-81e5-889e-e73037a37b08';

async function updateToGerman() {
  console.log('Aktualisiere Datenbank auf Deutsch...\n');

  try {
    // First, delete the old database
    console.log('Lösche alte Datenbank...');
    await notion.blocks.delete({ block_id: DATABASE_ID });
    console.log('✅ Alte Datenbank gelöscht\n');

    // Create new database with German properties
    console.log('Erstelle neue Datenbank mit deutschen Eigenschaften...');
    const PARENT_PAGE_ID = env.NOTION_WORKSPACE_PAGE_ID || '2e9f99a2be2281379653c6ba4b29400f';

    const response = await notion.databases.create({
      parent: { page_id: PARENT_PAGE_ID },
      title: [{ type: 'text', text: { content: 'SkyGER Touchscreen Elemente' } }],
      properties: {
        // Name - Titel (erforderlich)
        Name: { title: {} },

        // Beschreibung - Detaillierte Beschreibung
        Beschreibung: { rich_text: {} },

        // Meilensteine - Zu erreichende Meilensteine
        Meilensteine: { rich_text: {} },

        // Aufgaben - Aufgabenliste
        Aufgaben: { rich_text: {} },

        // Tage - Geschätzte Arbeitstage
        Tage: {
          number: {
            format: 'number'
          }
        },

        // Status - Fortschritt
        Status: {
          select: {
            options: [
              { name: 'Entwurf', color: 'gray' },
              { name: 'In Bearbeitung', color: 'yellow' },
              { name: 'Überprüfung', color: 'blue' },
              { name: 'Abgeschlossen', color: 'green' },
            ],
          },
        },

        // Reihenfolge - Anzeigereihenfolge
        Reihenfolge: {
          number: {
            format: 'number'
          }
        },

        // Symbol - Icon-Bezeichner
        Symbol: { rich_text: {} },

        // Video URL - Link zum Video
        'Video URL': { url: {} },

        // Screenshot - Datei-Upload für Screenshots
        Screenshot: { files: {} },

        // Ebene - Hierarchieebene (1=Wurzel, 2=Kind, etc.)
        Ebene: {
          number: {
            format: 'number'
          }
        },

        // Kategorie - Hauptkategorie
        Kategorie: {
          select: {
            options: [
              { name: 'Spiele', color: 'red' },
              { name: 'Tabelle', color: 'orange' },
              { name: 'Liga Info', color: 'yellow' },
              { name: 'Analyse', color: 'green' },
              { name: 'Multiview', color: 'blue' },
              { name: 'Live', color: 'purple' },
              { name: 'Headlines', color: 'pink' },
              { name: 'Twitter', color: 'default' },
              { name: 'Telestrator', color: 'brown' },
              { name: 'Web App', color: 'gray' },
            ],
          },
        },

        // Ausgeklappt - Standard-Ausklappzustand
        Ausgeklappt: { checkbox: {} },
      },
    });

    console.log('\n✅ Datenbank erfolgreich erstellt!\n');
    console.log('Datenbank-ID:', response.id);
    console.log('Datenbank-URL:', response.url);
    console.log('\nErstellte Eigenschaften:');
    Object.keys(response.properties).forEach(prop => {
      console.log(`  - ${prop} (${response.properties[prop].type})`);
    });

    // Add self-referencing Parent relation
    console.log('\n🔗 Füge Eltern-Beziehung für Hierarchie hinzu...');
    await notion.databases.update({
      database_id: response.id,
      properties: {
        'Übergeordnet': {
          relation: {
            database_id: response.id,
            single_property: {},
          },
        },
      },
    });
    console.log('✅ Eltern-Beziehung konfiguriert!\n');

    console.log('📝 Aktualisiere deine .env Datei:');
    console.log(`NOTION_DATABASE_ID=${response.id}\n`);

    return response;
  } catch (error) {
    console.error('❌ Fehler:', error.message);
    if (error.body) {
      console.error('Details:', JSON.stringify(error.body, null, 2));
    }
    throw error;
  }
}

updateToGerman()
  .then((db) => {
    console.log('🎉 Fertig! Datenbank wurde auf Deutsch aktualisiert.');
  })
  .catch((error) => {
    console.error('Fehler:', error.message);
    process.exit(1);
  });
