/**
 * Sky Touchscreen - Notion API Client
 * Frontend-Client für die Notion API über Netlify Functions
 */

class NotionClient {
    constructor(baseUrl = '/api') {
        this.baseUrl = baseUrl;
        this.cache = new Map();
        this.cacheTimeout = 5 * 60 * 1000; // 5 Minuten Cache
    }

    /**
     * API Request mit Fehlerbehandlung und Caching
     */
    async request(endpoint, params = {}) {
        const cacheKey = `${endpoint}:${JSON.stringify(params)}`;

        // Cache prüfen
        if (this.cache.has(cacheKey)) {
            const cached = this.cache.get(cacheKey);
            if (Date.now() - cached.timestamp < this.cacheTimeout) {
                return cached.data;
            }
            this.cache.delete(cacheKey);
        }

        // Query String bauen
        const queryString = Object.entries(params)
            .filter(([_, v]) => v !== undefined && v !== null)
            .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
            .join('&');

        const url = `${this.baseUrl}${endpoint}${queryString ? '?' + queryString : ''}`;

        try {
            const response = await fetch(url);

            if (!response.ok) {
                const error = await response.json().catch(() => ({}));
                throw new Error(error.error || `HTTP ${response.status}`);
            }

            const data = await response.json();

            // Im Cache speichern
            this.cache.set(cacheKey, {
                data,
                timestamp: Date.now()
            });

            return data;
        } catch (error) {
            console.error(`Notion API Error [${endpoint}]:`, error);
            throw error;
        }
    }

    /**
     * Seite abrufen
     */
    async getPage(pageId) {
        return this.request('/page', { id: pageId });
    }

    /**
     * Blocks einer Seite abrufen
     */
    async getBlocks(blockId) {
        return this.request('/blocks', { id: blockId });
    }

    /**
     * Kinder-Seiten abrufen
     */
    async getChildren(pageId) {
        return this.request('/children', { id: pageId });
    }

    /**
     * Datenbank abfragen
     */
    async queryDatabase(databaseId) {
        return this.request('/database', { id: databaseId });
    }

    /**
     * Seiten durchsuchen
     */
    async search(query) {
        return this.request('/search', { query });
    }

    /**
     * Health Check
     */
    async healthCheck() {
        return this.request('/health');
    }

    /**
     * Cache leeren
     */
    clearCache() {
        this.cache.clear();
    }

    /**
     * Einzelnen Cache-Eintrag entfernen
     */
    invalidateCache(endpoint, params = {}) {
        const cacheKey = `${endpoint}:${JSON.stringify(params)}`;
        this.cache.delete(cacheKey);
    }
}

/**
 * Notion Block zu HTML konvertieren
 */
function blockToHtml(block) {
    const type = block.type;
    const content = block[type];

    switch (type) {
        case 'paragraph':
            return `<p>${richTextToHtml(content.rich_text)}</p>`;

        case 'heading_1':
            return `<h1>${richTextToHtml(content.rich_text)}</h1>`;

        case 'heading_2':
            return `<h2>${richTextToHtml(content.rich_text)}</h2>`;

        case 'heading_3':
            return `<h3>${richTextToHtml(content.rich_text)}</h3>`;

        case 'bulleted_list_item':
            return `<li>${richTextToHtml(content.rich_text)}</li>`;

        case 'numbered_list_item':
            return `<li>${richTextToHtml(content.rich_text)}</li>`;

        case 'to_do':
            const checked = content.checked ? 'checked' : '';
            return `<div class="todo-item"><input type="checkbox" ${checked} disabled> ${richTextToHtml(content.rich_text)}</div>`;

        case 'toggle':
            return `<details><summary>${richTextToHtml(content.rich_text)}</summary></details>`;

        case 'code':
            const lang = content.language || 'plaintext';
            return `<pre><code class="language-${lang}">${richTextToHtml(content.rich_text)}</code></pre>`;

        case 'quote':
            return `<blockquote>${richTextToHtml(content.rich_text)}</blockquote>`;

        case 'divider':
            return '<hr>';

        case 'callout':
            const emoji = content.icon?.emoji || '';
            return `<div class="callout">${emoji} ${richTextToHtml(content.rich_text)}</div>`;

        case 'child_page':
            return `<div class="child-page" data-id="${block.id}">${content.title}</div>`;

        case 'image':
            const imgUrl = content.type === 'external' ? content.external.url : content.file.url;
            const caption = content.caption ? richTextToHtml(content.caption) : '';
            return `<figure><img src="${imgUrl}" alt="${caption}"><figcaption>${caption}</figcaption></figure>`;

        default:
            return `<!-- Unsupported block type: ${type} -->`;
    }
}

/**
 * Rich Text Array zu HTML konvertieren
 */
function richTextToHtml(richText) {
    if (!richText || !Array.isArray(richText)) return '';

    return richText.map(text => {
        let html = escapeHtml(text.plain_text);
        const annotations = text.annotations;

        if (annotations.bold) html = `<strong>${html}</strong>`;
        if (annotations.italic) html = `<em>${html}</em>`;
        if (annotations.strikethrough) html = `<del>${html}</del>`;
        if (annotations.underline) html = `<u>${html}</u>`;
        if (annotations.code) html = `<code>${html}</code>`;

        if (text.href) {
            html = `<a href="${escapeHtml(text.href)}" target="_blank" rel="noopener">${html}</a>`;
        }

        return html;
    }).join('');
}

/**
 * HTML Escaping
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Blocks zu strukturierter HTML-Liste konvertieren
 */
function blocksToHtml(blocks) {
    let html = '';
    let currentListType = null;

    blocks.forEach(block => {
        const type = block.type;

        // Listen-Handling
        if (type === 'bulleted_list_item' && currentListType !== 'ul') {
            if (currentListType) html += `</${currentListType}>`;
            html += '<ul>';
            currentListType = 'ul';
        } else if (type === 'numbered_list_item' && currentListType !== 'ol') {
            if (currentListType) html += `</${currentListType}>`;
            html += '<ol>';
            currentListType = 'ol';
        } else if (type !== 'bulleted_list_item' && type !== 'numbered_list_item' && currentListType) {
            html += `</${currentListType}>`;
            currentListType = null;
        }

        html += blockToHtml(block);
    });

    // Liste abschließen
    if (currentListType) {
        html += `</${currentListType}>`;
    }

    return html;
}

/**
 * Seiten-Titel aus Page-Objekt extrahieren
 */
function getPageTitle(page) {
    const titleProperty = page.properties?.title || page.properties?.Name;

    if (titleProperty?.title) {
        return titleProperty.title.map(t => t.plain_text).join('');
    }

    if (page.child_page?.title) {
        return page.child_page.title;
    }

    return 'Untitled';
}

// Globale Instanz
const notionClient = new NotionClient();

// Export für Module
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        NotionClient,
        notionClient,
        blockToHtml,
        blocksToHtml,
        richTextToHtml,
        getPageTitle
    };
}
