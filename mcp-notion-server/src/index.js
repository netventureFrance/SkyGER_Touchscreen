#!/usr/bin/env node

/**
 * MCP Notion Server
 * Model Context Protocol Server für Notion API Integration
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { Client } from '@notionhq/client';

// Notion Client initialisieren
const notion = new Client({
  auth: process.env.NOTION_TOKEN,
});

// MCP Server erstellen
const server = new Server(
  {
    name: 'mcp-notion-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
      resources: {},
    },
  }
);

// ============================================
// TOOLS DEFINITION
// ============================================

const TOOLS = [
  {
    name: 'notion_get_page',
    description: 'Ruft eine Notion-Seite ab und gibt ihre Eigenschaften zurück',
    inputSchema: {
      type: 'object',
      properties: {
        page_id: {
          type: 'string',
          description: 'Die ID der Notion-Seite (mit oder ohne Bindestriche)',
        },
      },
      required: ['page_id'],
    },
  },
  {
    name: 'notion_get_page_content',
    description: 'Ruft den kompletten Inhalt (Blocks) einer Notion-Seite ab',
    inputSchema: {
      type: 'object',
      properties: {
        page_id: {
          type: 'string',
          description: 'Die ID der Notion-Seite',
        },
      },
      required: ['page_id'],
    },
  },
  {
    name: 'notion_search',
    description: 'Durchsucht Notion nach Seiten und Datenbanken',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Suchbegriff',
        },
        filter: {
          type: 'string',
          enum: ['page', 'database'],
          description: 'Optional: Nur Seiten oder nur Datenbanken suchen',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'notion_get_children',
    description: 'Listet alle Unterseiten und Blöcke einer Seite auf',
    inputSchema: {
      type: 'object',
      properties: {
        block_id: {
          type: 'string',
          description: 'Die ID der Seite oder des Blocks',
        },
      },
      required: ['block_id'],
    },
  },
  {
    name: 'notion_query_database',
    description: 'Fragt eine Notion-Datenbank ab',
    inputSchema: {
      type: 'object',
      properties: {
        database_id: {
          type: 'string',
          description: 'Die ID der Datenbank',
        },
        filter: {
          type: 'object',
          description: 'Optional: Filter für die Abfrage',
        },
        sorts: {
          type: 'array',
          description: 'Optional: Sortierung',
        },
      },
      required: ['database_id'],
    },
  },
  {
    name: 'notion_create_page',
    description: 'Erstellt eine neue Seite in Notion',
    inputSchema: {
      type: 'object',
      properties: {
        parent_id: {
          type: 'string',
          description: 'ID der übergeordneten Seite oder Datenbank',
        },
        parent_type: {
          type: 'string',
          enum: ['page', 'database'],
          description: 'Typ des Parents',
        },
        title: {
          type: 'string',
          description: 'Titel der neuen Seite',
        },
        content: {
          type: 'string',
          description: 'Optional: Initialer Textinhalt',
        },
      },
      required: ['parent_id', 'parent_type', 'title'],
    },
  },
  {
    name: 'notion_append_blocks',
    description: 'Fügt Inhaltsblöcke zu einer Seite hinzu',
    inputSchema: {
      type: 'object',
      properties: {
        page_id: {
          type: 'string',
          description: 'ID der Seite',
        },
        content: {
          type: 'string',
          description: 'Text-Inhalt zum Hinzufügen (wird als Paragraph eingefügt)',
        },
      },
      required: ['page_id', 'content'],
    },
  },
];

// ============================================
// TOOL HANDLERS
// ============================================

async function handleGetPage(pageId) {
  const page = await notion.pages.retrieve({ page_id: formatId(pageId) });
  return formatPageResponse(page);
}

async function handleGetPageContent(pageId) {
  const blocks = [];
  let cursor = undefined;

  do {
    const response = await notion.blocks.children.list({
      block_id: formatId(pageId),
      start_cursor: cursor,
      page_size: 100,
    });
    blocks.push(...response.results);
    cursor = response.has_more ? response.next_cursor : undefined;
  } while (cursor);

  return {
    page_id: pageId,
    block_count: blocks.length,
    content: blocks.map(formatBlock).join('\n'),
    blocks: blocks.map(b => ({
      id: b.id,
      type: b.type,
      content: formatBlock(b),
    })),
  };
}

async function handleSearch(query, filter) {
  const params = {
    query: query,
    page_size: 20,
  };

  if (filter) {
    params.filter = { property: 'object', value: filter };
  }

  const response = await notion.search(params);

  return {
    query: query,
    result_count: response.results.length,
    results: response.results.map(item => ({
      id: item.id,
      type: item.object,
      title: getTitle(item),
      url: item.url,
    })),
  };
}

async function handleGetChildren(blockId) {
  const children = [];
  let cursor = undefined;

  do {
    const response = await notion.blocks.children.list({
      block_id: formatId(blockId),
      start_cursor: cursor,
      page_size: 100,
    });
    children.push(...response.results);
    cursor = response.has_more ? response.next_cursor : undefined;
  } while (cursor);

  return {
    parent_id: blockId,
    child_count: children.length,
    children: children.map(child => ({
      id: child.id,
      type: child.type,
      has_children: child.has_children,
      content: formatBlock(child),
    })),
  };
}

async function handleQueryDatabase(databaseId, filter, sorts) {
  const params = {
    database_id: formatId(databaseId),
    page_size: 100,
  };

  if (filter) params.filter = filter;
  if (sorts) params.sorts = sorts;

  const response = await notion.databases.query(params);

  return {
    database_id: databaseId,
    result_count: response.results.length,
    results: response.results.map(page => ({
      id: page.id,
      title: getTitle(page),
      properties: formatProperties(page.properties),
      url: page.url,
    })),
  };
}

async function handleCreatePage(parentId, parentType, title, content) {
  const parent =
    parentType === 'database'
      ? { database_id: formatId(parentId) }
      : { page_id: formatId(parentId) };

  const properties =
    parentType === 'database'
      ? { title: { title: [{ text: { content: title } }] } }
      : { title: { title: [{ text: { content: title } }] } };

  const children = content
    ? [
        {
          object: 'block',
          type: 'paragraph',
          paragraph: {
            rich_text: [{ type: 'text', text: { content: content } }],
          },
        },
      ]
    : [];

  const page = await notion.pages.create({
    parent,
    properties,
    children,
  });

  return {
    id: page.id,
    url: page.url,
    title: title,
    created: true,
  };
}

async function handleAppendBlocks(pageId, content) {
  const blocks = content.split('\n').map(line => ({
    object: 'block',
    type: 'paragraph',
    paragraph: {
      rich_text: [{ type: 'text', text: { content: line } }],
    },
  }));

  const response = await notion.blocks.children.append({
    block_id: formatId(pageId),
    children: blocks,
  });

  return {
    page_id: pageId,
    blocks_added: response.results.length,
  };
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function formatId(id) {
  // Entferne Bindestriche falls vorhanden und füge sie korrekt ein
  const clean = id.replace(/-/g, '');
  if (clean.length === 32) {
    return `${clean.slice(0, 8)}-${clean.slice(8, 12)}-${clean.slice(12, 16)}-${clean.slice(16, 20)}-${clean.slice(20)}`;
  }
  return id;
}

function getTitle(item) {
  if (item.properties?.title?.title) {
    return item.properties.title.title.map(t => t.plain_text).join('');
  }
  if (item.properties?.Name?.title) {
    return item.properties.Name.title.map(t => t.plain_text).join('');
  }
  if (item.title) {
    return item.title.map(t => t.plain_text).join('');
  }
  if (item.child_page?.title) {
    return item.child_page.title;
  }
  return 'Untitled';
}

function formatPageResponse(page) {
  return {
    id: page.id,
    title: getTitle(page),
    url: page.url,
    created_time: page.created_time,
    last_edited_time: page.last_edited_time,
    properties: formatProperties(page.properties),
  };
}

function formatProperties(properties) {
  if (!properties) return {};

  const formatted = {};
  for (const [key, value] of Object.entries(properties)) {
    formatted[key] = formatPropertyValue(value);
  }
  return formatted;
}

function formatPropertyValue(prop) {
  switch (prop.type) {
    case 'title':
      return prop.title.map(t => t.plain_text).join('');
    case 'rich_text':
      return prop.rich_text.map(t => t.plain_text).join('');
    case 'number':
      return prop.number;
    case 'select':
      return prop.select?.name;
    case 'multi_select':
      return prop.multi_select.map(s => s.name);
    case 'date':
      return prop.date?.start;
    case 'checkbox':
      return prop.checkbox;
    case 'url':
      return prop.url;
    case 'email':
      return prop.email;
    case 'phone_number':
      return prop.phone_number;
    default:
      return prop[prop.type];
  }
}

function formatBlock(block) {
  const type = block.type;
  const content = block[type];

  switch (type) {
    case 'paragraph':
      return content.rich_text.map(t => t.plain_text).join('');
    case 'heading_1':
      return `# ${content.rich_text.map(t => t.plain_text).join('')}`;
    case 'heading_2':
      return `## ${content.rich_text.map(t => t.plain_text).join('')}`;
    case 'heading_3':
      return `### ${content.rich_text.map(t => t.plain_text).join('')}`;
    case 'bulleted_list_item':
      return `• ${content.rich_text.map(t => t.plain_text).join('')}`;
    case 'numbered_list_item':
      return `1. ${content.rich_text.map(t => t.plain_text).join('')}`;
    case 'to_do':
      const checkbox = content.checked ? '☑' : '☐';
      return `${checkbox} ${content.rich_text.map(t => t.plain_text).join('')}`;
    case 'toggle':
      return `▸ ${content.rich_text.map(t => t.plain_text).join('')}`;
    case 'code':
      return `\`\`\`${content.language}\n${content.rich_text.map(t => t.plain_text).join('')}\n\`\`\``;
    case 'quote':
      return `> ${content.rich_text.map(t => t.plain_text).join('')}`;
    case 'divider':
      return '---';
    case 'child_page':
      return `📄 ${content.title}`;
    case 'child_database':
      return `📊 ${content.title}`;
    case 'callout':
      const icon = content.icon?.emoji || '💡';
      return `${icon} ${content.rich_text.map(t => t.plain_text).join('')}`;
    case 'image':
      const url = content.type === 'external' ? content.external.url : content.file.url;
      return `![Image](${url})`;
    default:
      return `[${type}]`;
  }
}

// ============================================
// MCP HANDLERS
// ============================================

// List Tools Handler
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools: TOOLS };
});

// Call Tool Handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    let result;

    switch (name) {
      case 'notion_get_page':
        result = await handleGetPage(args.page_id);
        break;
      case 'notion_get_page_content':
        result = await handleGetPageContent(args.page_id);
        break;
      case 'notion_search':
        result = await handleSearch(args.query, args.filter);
        break;
      case 'notion_get_children':
        result = await handleGetChildren(args.block_id);
        break;
      case 'notion_query_database':
        result = await handleQueryDatabase(args.database_id, args.filter, args.sorts);
        break;
      case 'notion_create_page':
        result = await handleCreatePage(args.parent_id, args.parent_type, args.title, args.content);
        break;
      case 'notion_append_blocks':
        result = await handleAppendBlocks(args.page_id, args.content);
        break;
      default:
        throw new Error(`Unknown tool: ${name}`);
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${error.message}`,
        },
      ],
      isError: true,
    };
  }
});

// ============================================
// START SERVER
// ============================================

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('MCP Notion Server running on stdio');
}

main().catch(console.error);
