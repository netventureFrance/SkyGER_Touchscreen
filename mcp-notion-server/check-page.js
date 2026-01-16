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

async function checkPage() {
  console.log('Prüfe Yan-Seite...\n');

  try {
    // Hole Kinder der Yan-Seite
    const children = await notion.blocks.children.list({
      block_id: YAN_PAGE_ID,
      page_size: 100
    });

    console.log(`Gefundene Elemente auf der Yan-Seite: ${children.results.length}\n`);

    for (const block of children.results) {
      if (block.type === 'child_database') {
        console.log(`📊 Datenbank: ${block.child_database.title}`);
        console.log(`   ID: ${block.id}`);
      } else if (block.type === 'child_page') {
        console.log(`📄 Seite: ${block.child_page.title}`);
        console.log(`   ID: ${block.id}`);
      } else {
        console.log(`   ${block.type}`);
      }
    }

  } catch (error) {
    console.error('❌ Fehler:', error.message);
  }
}

checkPage();
