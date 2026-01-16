#!/usr/bin/env node

/**
 * Setup Script: Create SkyGER Touchscreen Database in Notion
 * Run with: node scripts/setup-notion-db.js
 */

import { Client } from '@notionhq/client';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env manually
function loadEnv() {
  try {
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
  } catch (e) {
    console.error('Could not load .env file:', e.message);
    process.exit(1);
  }
}

const env = loadEnv();
const notion = new Client({ auth: env.NOTION_TOKEN });

// Parent page where database will be created (Yan's workspace)
const PARENT_PAGE_ID = env.NOTION_WORKSPACE_PAGE_ID || '2e9f99a2be2281379653c6ba4b29400f';

async function createDatabase() {
  console.log('Creating SkyGER Touchscreen Database...\n');
  console.log('Parent Page ID:', PARENT_PAGE_ID);

  try {
    const response = await notion.databases.create({
      parent: { page_id: PARENT_PAGE_ID },
      title: [{ type: 'text', text: { content: 'SkyGER Touchscreen Items' } }],
      properties: {
        // Name - Title field (required)
        Name: { title: {} },

        // Description - Rich text for detailed info
        Description: { rich_text: {} },

        // Milestones - Rich text for milestone descriptions
        Milestones: { rich_text: {} },

        // Days - Number of days estimated
        Days: {
          number: {
            format: 'number'
          }
        },

        // Status - Progress tracking
        Status: {
          select: {
            options: [
              { name: 'Draft', color: 'gray' },
              { name: 'In Progress', color: 'yellow' },
              { name: 'Review', color: 'blue' },
              { name: 'Complete', color: 'green' },
            ],
          },
        },

        // Order - For sorting items
        Order: {
          number: {
            format: 'number'
          }
        },

        // Icon - Icon identifier for tree view
        Icon: { rich_text: {} },

        // VideoURL - Link to video demonstration
        VideoURL: { url: {} },

        // Screenshot - File upload for screenshots
        Screenshot: { files: {} },

        // Level - Hierarchy level (1=root, 2=child, etc.)
        Level: {
          number: {
            format: 'number'
          }
        },

        // Category - Main category type
        Category: {
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

        // Tasks - Checkbox list as rich text
        Tasks: { rich_text: {} },

        // IsExpanded - Default expansion state
        IsExpanded: { checkbox: {} },
      },
    });

    console.log('\n✅ Database created successfully!\n');
    console.log('Database ID:', response.id);
    console.log('Database URL:', response.url);
    console.log('\nProperties created:');
    Object.keys(response.properties).forEach(prop => {
      console.log(`  - ${prop} (${response.properties[prop].type})`);
    });

    // Update the database to add self-referencing Parent relation
    console.log('\n🔗 Adding Parent relation for hierarchy...');
    await notion.databases.update({
      database_id: response.id,
      properties: {
        Parent: {
          relation: {
            database_id: response.id,
            single_property: {},
          },
        },
      },
    });
    console.log('✅ Parent relation configured!\n');

    // Save the database ID for later use
    console.log('📝 Add this to your .env file:');
    console.log(`NOTION_DATABASE_ID=${response.id}\n`);

    return response;
  } catch (error) {
    console.error('❌ Error creating database:', error.message);
    if (error.body) {
      console.error('Details:', JSON.stringify(error.body, null, 2));
    }
    throw error;
  }
}

// Run the setup
createDatabase()
  .then(() => {
    console.log('🎉 Setup complete! You can now add items to your database in Notion.');
  })
  .catch((error) => {
    console.error('Setup failed:', error.message);
    process.exit(1);
  });
