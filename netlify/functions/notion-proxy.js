/**
 * Netlify Function: Notion API Proxy
 * Ermöglicht sichere API-Aufrufe ohne CORS-Probleme
 */

const { Client } = require('@notionhq/client');

// Notion Client initialisieren
const notion = new Client({
    auth: process.env.NOTION_TOKEN
});

// CORS Headers
const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
};

exports.handler = async (event, context) => {
    // OPTIONS Request für CORS Preflight
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers,
            body: ''
        };
    }

    try {
        const path = event.path.replace('/.netlify/functions/notion-proxy', '').replace('/api/notion', '');
        const params = event.queryStringParameters || {};

        // Route Handler
        switch (true) {
            // Seite abrufen
            case path === '/page' || path === '/page/':
                return await getPage(params.id);

            // Seiteninhalt (Blocks) abrufen
            case path === '/blocks' || path === '/blocks/':
                return await getBlocks(params.id);

            // Kinder einer Seite abrufen
            case path === '/children' || path === '/children/':
                return await getChildren(params.id);

            // Datenbank abfragen
            case path === '/database' || path === '/database/':
                return await queryDatabase(params.id);

            // Suche
            case path === '/search' || path === '/search/':
                return await searchPages(params.query);

            // Health Check
            case path === '/health' || path === '/health/':
                return {
                    statusCode: 200,
                    headers,
                    body: JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() })
                };

            default:
                return {
                    statusCode: 404,
                    headers,
                    body: JSON.stringify({ error: 'Route not found', path })
                };
        }
    } catch (error) {
        console.error('Notion API Error:', error);
        return {
            statusCode: error.status || 500,
            headers,
            body: JSON.stringify({
                error: error.message || 'Internal server error',
                code: error.code
            })
        };
    }
};

/**
 * Seite abrufen
 */
async function getPage(pageId) {
    if (!pageId) {
        return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Page ID required' })
        };
    }

    const response = await notion.pages.retrieve({ page_id: pageId });

    return {
        statusCode: 200,
        headers,
        body: JSON.stringify(response)
    };
}

/**
 * Blocks einer Seite abrufen
 */
async function getBlocks(blockId) {
    if (!blockId) {
        return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Block ID required' })
        };
    }

    const blocks = [];
    let cursor = undefined;

    do {
        const response = await notion.blocks.children.list({
            block_id: blockId,
            start_cursor: cursor,
            page_size: 100
        });

        blocks.push(...response.results);
        cursor = response.has_more ? response.next_cursor : undefined;
    } while (cursor);

    return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ blocks, count: blocks.length })
    };
}

/**
 * Kinder-Seiten abrufen
 */
async function getChildren(pageId) {
    if (!pageId) {
        return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Page ID required' })
        };
    }

    const children = [];
    let cursor = undefined;

    do {
        const response = await notion.blocks.children.list({
            block_id: pageId,
            start_cursor: cursor,
            page_size: 100
        });

        // Nur child_page Blocks filtern
        const pages = response.results.filter(block =>
            block.type === 'child_page' || block.type === 'child_database'
        );

        children.push(...pages);
        cursor = response.has_more ? response.next_cursor : undefined;
    } while (cursor);

    return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ children, count: children.length })
    };
}

/**
 * Datenbank abfragen
 */
async function queryDatabase(databaseId) {
    if (!databaseId) {
        return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Database ID required' })
        };
    }

    const results = [];
    let cursor = undefined;

    do {
        const response = await notion.databases.query({
            database_id: databaseId,
            start_cursor: cursor,
            page_size: 100
        });

        results.push(...response.results);
        cursor = response.has_more ? response.next_cursor : undefined;
    } while (cursor);

    return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ results, count: results.length })
    };
}

/**
 * Seiten durchsuchen
 */
async function searchPages(query) {
    if (!query) {
        return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Search query required' })
        };
    }

    const response = await notion.search({
        query: query,
        filter: {
            property: 'object',
            value: 'page'
        },
        page_size: 20
    });

    return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
            results: response.results,
            count: response.results.length,
            has_more: response.has_more
        })
    };
}
