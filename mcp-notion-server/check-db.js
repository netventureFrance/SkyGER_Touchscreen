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

async function checkDatabase() {
  const db = await notion.databases.retrieve({ database_id: DATABASE_ID });

  console.log('Datenbank:', db.title[0]?.plain_text);
  console.log('\nStatus-Optionen:');

  const statusProp = db.properties.Status;
  if (statusProp && statusProp.select) {
    statusProp.select.options.forEach(opt => {
      console.log(`  - ${opt.name} (${opt.color})`);
    });
  }

  console.log('\nKategorie-Optionen:');
  const kategorieProp = db.properties.Kategorie;
  if (kategorieProp && kategorieProp.select) {
    kategorieProp.select.options.forEach(opt => {
      console.log(`  - ${opt.name} (${opt.color})`);
    });
  }
}

checkDatabase();
