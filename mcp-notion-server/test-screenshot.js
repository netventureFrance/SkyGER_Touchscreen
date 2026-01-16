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
const DATABASE_ID = env.NOTION_DATABASE_ID;

async function testScreenshot() {
  console.log('Hole Datenbank-Einträge mit Screenshots...\n');

  const response = await notion.databases.query({
    database_id: DATABASE_ID,
    page_size: 5
  });

  for (const page of response.results) {
    const name = page.properties.Name?.title?.[0]?.plain_text || 'Unbekannt';
    const screenshot = page.properties.Screenshot;

    console.log(`\n📄 ${name}`);
    console.log('Screenshot-Feld:', JSON.stringify(screenshot, null, 2));

    if (screenshot?.files?.length > 0) {
      console.log('\n🖼️ Gefundene Bilder:');
      screenshot.files.forEach((file, i) => {
        if (file.type === 'file') {
          console.log(`  ${i + 1}. Notion-Datei: ${file.file.url}`);
          console.log(`     Ablauf: ${file.file.expiry_time}`);
        } else if (file.type === 'external') {
          console.log(`  ${i + 1}. Externe URL: ${file.external.url}`);
        }
      });
    }
  }
}

testScreenshot().catch(console.error);
