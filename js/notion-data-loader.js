/**
 * Sky Touchscreen - Notion Data Loader
 * Lädt Daten aus der Notion-Datenbank und konvertiert sie zur Baumstruktur
 */

class NotionDataLoader {
    constructor(databaseId) {
        this.databaseId = databaseId;
        this.apiBase = '/api';
        this.cache = null;
        this.cacheTime = null;
        this.cacheDuration = 5 * 60 * 1000; // 5 Minuten
    }

    /**
     * Lädt alle Elemente aus der Notion-Datenbank
     */
    async loadAll() {
        // Cache prüfen
        if (this.cache && this.cacheTime && (Date.now() - this.cacheTime < this.cacheDuration)) {
            return this.cache;
        }

        try {
            const response = await fetch(`${this.apiBase}/database?id=${this.databaseId}`);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();
            const items = data.results || [];

            // Konvertiere zu internem Format
            const converted = items.map(item => this.convertItem(item));

            // Baue Hierarchie auf
            const tree = this.buildTree(converted);

            this.cache = tree;
            this.cacheTime = Date.now();

            return tree;
        } catch (error) {
            console.error('Fehler beim Laden der Notion-Daten:', error);
            throw error;
        }
    }

    /**
     * Konvertiert ein Notion-Item zum internen Format
     */
    convertItem(item) {
        const props = item.properties;

        return {
            id: item.id,
            notionId: item.id,
            label: this.getText(props.Name, 'title'),
            description: this.getText(props.Beschreibung, 'rich_text'),
            icon: this.getText(props.Symbol, 'rich_text') || 'circle',
            ebene: props.Ebene?.number || 1,
            reihenfolge: props.Reihenfolge?.number || 0,
            status: props.Status?.select?.name || 'Entwurf',
            kategorie: props.Kategorie?.select?.name || null,
            tage: props.Tage?.number || null,
            meilensteine: this.getText(props.Meilensteine, 'rich_text'),
            aufgaben: this.getText(props.Aufgaben, 'rich_text'),
            videoUrl: props['Video URL']?.url || null,
            screenshots: this.getFiles(props.Screenshot),
            parentId: props['Übergeordnet']?.relation?.[0]?.id || null,
            ausgeklappt: props.Ausgeklappt?.checkbox || false,
            children: []
        };
    }

    /**
     * Extrahiert Text aus Notion-Property
     */
    getText(prop, type) {
        if (!prop || !prop[type]) return '';
        return prop[type].map(t => t.plain_text).join('');
    }

    /**
     * Extrahiert Dateien/Screenshots
     * Unterstützt: Notion-Uploads, externe URLs, und lokale Pfade
     */
    getFiles(prop) {
        if (!prop || !prop.files || prop.files.length === 0) return [];

        return prop.files.map(file => {
            let url = '';
            let name = file.name || '';
            let isLocal = false;

            if (file.type === 'file') {
                // Notion-Upload (temporäre URL)
                url = file.file.url;
            } else if (file.type === 'external') {
                url = file.external.url;

                // Prüfen ob es ein lokaler Pfad ist (beginnt mit / oder images/)
                if (url.startsWith('/') || url.startsWith('images/')) {
                    isLocal = true;
                    // Sicherstellen dass der Pfad mit / beginnt
                    if (!url.startsWith('/')) {
                        url = '/' + url;
                    }
                }
            }

            return {
                name: name,
                url: url,
                isLocal: isLocal,
                expiry: file.type === 'file' ? file.file.expiry_time : null
            };
        }).filter(Boolean);
    }

    /**
     * Baut die Baumstruktur aus flachen Daten
     */
    buildTree(items) {
        const itemMap = new Map();
        const roots = [];

        // Erst alle Items in Map speichern
        items.forEach(item => {
            itemMap.set(item.id, item);
        });

        // Dann Hierarchie aufbauen
        items.forEach(item => {
            if (item.parentId && itemMap.has(item.parentId)) {
                const parent = itemMap.get(item.parentId);
                parent.children.push(item);
            } else {
                roots.push(item);
            }
        });

        // Sortieren nach Reihenfolge
        const sortByOrder = (a, b) => (a.reihenfolge || 0) - (b.reihenfolge || 0);

        roots.sort(sortByOrder);
        items.forEach(item => {
            if (item.children.length > 0) {
                item.children.sort(sortByOrder);
            }
        });

        return roots;
    }

    /**
     * Findet ein Element nach ID
     */
    findById(tree, id) {
        for (const item of tree) {
            if (item.id === id) return item;
            if (item.children.length > 0) {
                const found = this.findById(item.children, id);
                if (found) return found;
            }
        }
        return null;
    }

    /**
     * Konvertiert zu SKY_DATA Format (für Kompatibilität)
     */
    toSkyDataFormat(tree) {
        const convert = (item) => ({
            id: item.id,
            label: item.label,
            icon: item.icon,
            description: item.description,
            screenshots: item.screenshots,
            videoUrl: item.videoUrl,
            status: item.status,
            tage: item.tage,
            meilensteine: item.meilensteine,
            aufgaben: item.aufgaben,
            children: item.children.map(convert)
        });

        return {
            mainMenu: tree.filter(item => item.ebene === 1).map(convert)
        };
    }

    /**
     * Cache leeren
     */
    clearCache() {
        this.cache = null;
        this.cacheTime = null;
    }
}

// Globale Instanz mit Datenbank-ID
// Die ID wird aus dem Environment oder direkt gesetzt
// Workspace Page ID (Yan): 2e9f99a2be2281379653c6ba4b29400f
const NOTION_DATABASE_ID = '2eaf99a2-be22-816d-8d01-d501ef32cc32';
const NOTION_PAGE_ID = '2e9f99a2be2281379653c6ba4b29400f';

// Data loader with fallback to page hierarchy
const notionDataLoader = new NotionDataLoader(NOTION_DATABASE_ID);

/**
 * PageHierarchyLoader - Lädt Daten aus Notion Seitenhierarchie statt Datenbank
 */
class PageHierarchyLoader {
    constructor(pageId) {
        this.pageId = pageId;
        this.apiBase = '/api';
        this.cache = null;
        this.cacheTime = null;
        this.cacheDuration = 5 * 60 * 1000; // 5 Minuten
    }

    /**
     * Lädt die Seitenhierarchie rekursiv
     */
    async loadAll() {
        // Cache prüfen
        if (this.cache && this.cacheTime && (Date.now() - this.cacheTime < this.cacheDuration)) {
            return this.cache;
        }

        try {
            const tree = await this.loadPage(this.pageId, 1);
            this.cache = tree ? [tree] : [];
            this.cacheTime = Date.now();
            return this.cache;
        } catch (error) {
            console.error('Fehler beim Laden der Notion-Seitenhierarchie:', error);
            throw error;
        }
    }

    /**
     * Lädt eine einzelne Seite mit ihren Kindern
     */
    async loadPage(pageId, level) {
        try {
            // Hole Seiten-Info
            const pageResponse = await fetch(`${this.apiBase}/page?id=${pageId}`);
            if (!pageResponse.ok) throw new Error(`HTTP ${pageResponse.status}`);
            const pageData = await pageResponse.json();

            // Hole Kinder
            const childrenResponse = await fetch(`${this.apiBase}/children?id=${pageId}`);
            if (!childrenResponse.ok) throw new Error(`HTTP ${childrenResponse.status}`);
            const childrenData = await childrenResponse.json();

            // Konvertiere zu internem Format
            const item = {
                id: pageId,
                notionId: pageId,
                label: this.getTitle(pageData),
                description: '',
                icon: pageData.icon?.emoji || 'circle',
                ebene: level,
                reihenfolge: 0,
                status: 'Aktiv',
                children: []
            };

            // Lade Kinder rekursiv (max 3 Ebenen tief)
            if (childrenData.children && level < 4) {
                for (const child of childrenData.children) {
                    if (child.type === 'child_page') {
                        const childItem = await this.loadPage(child.id, level + 1);
                        if (childItem) {
                            childItem.label = child.child_page.title;
                            item.children.push(childItem);
                        }
                    } else if (child.type === 'child_database') {
                        // Datenbank gefunden - als Knoten hinzufügen
                        item.children.push({
                            id: child.id,
                            notionId: child.id,
                            label: child.child_database.title,
                            description: 'Notion Datenbank',
                            icon: 'database',
                            ebene: level + 1,
                            status: 'Datenbank',
                            children: []
                        });
                    }
                }
            }

            return item;
        } catch (error) {
            console.error(`Fehler beim Laden der Seite ${pageId}:`, error);
            return null;
        }
    }

    /**
     * Extrahiert den Titel aus Seitendaten
     */
    getTitle(page) {
        if (page.properties?.title?.title) {
            return page.properties.title.title.map(t => t.plain_text).join('');
        }
        if (page.properties?.Name?.title) {
            return page.properties.Name.title.map(t => t.plain_text).join('');
        }
        return 'Untitled';
    }

    /**
     * Cache leeren
     */
    clearCache() {
        this.cache = null;
        this.cacheTime = null;
    }
}

// Page Hierarchy Loader für Yan's Workspace
const notionPageLoader = new PageHierarchyLoader(NOTION_PAGE_ID);

// Export für Module
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { NotionDataLoader, notionDataLoader };
}
