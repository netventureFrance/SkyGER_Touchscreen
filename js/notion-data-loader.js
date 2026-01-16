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
     */
    getFiles(prop) {
        if (!prop || !prop.files || prop.files.length === 0) return [];

        return prop.files.map(file => {
            if (file.type === 'file') {
                return {
                    name: file.name,
                    url: file.file.url,
                    expiry: file.file.expiry_time
                };
            } else if (file.type === 'external') {
                return {
                    name: file.name,
                    url: file.external.url,
                    expiry: null
                };
            }
            return null;
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
const NOTION_DATABASE_ID = '2eaf99a2-be22-816d-8d01-d501ef32cc32';
const notionDataLoader = new NotionDataLoader(NOTION_DATABASE_ID);

// Export für Module
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { NotionDataLoader, notionDataLoader };
}
