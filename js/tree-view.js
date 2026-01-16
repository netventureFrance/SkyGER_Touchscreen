/**
 * Sky Touchscreen - Tree View
 * Top-Down hierarchische Ansicht des Systems
 */

class TreeView {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.viewport = document.getElementById('treeViewport');
        this.detailPanel = document.getElementById('detailPanel');
        this.panelContent = document.getElementById('panelContent');
        this.tooltip = document.getElementById('tooltip');

        this.expandedNodes = new Set();
        this.zoom = 1;
        this.minZoom = 0.5;
        this.maxZoom = 1.5;

        this.isDragging = false;
        this.dragStart = { x: 0, y: 0 };
        this.scrollStart = { x: 0, y: 0 };

        this.init();
    }

    init() {
        // Initial erweiterte Nodes (Root und erste Ebene)
        this.expandedNodes.add('root');

        // Tree rendern
        this.render();

        // Event Listeners
        this.setupEventListeners();

        // Zeit aktualisieren
        this.updateTime();
        setInterval(() => this.updateTime(), 1000);
    }

    setupEventListeners() {
        // Expand/Collapse All
        document.getElementById('expandAllBtn').addEventListener('click', () => this.expandAll());
        document.getElementById('collapseAllBtn').addEventListener('click', () => this.collapseAll());

        // Zoom Controls
        document.getElementById('zoomInBtn').addEventListener('click', () => this.setZoom(this.zoom + 0.1));
        document.getElementById('zoomOutBtn').addEventListener('click', () => this.setZoom(this.zoom - 0.1));

        // Panel Close
        document.getElementById('panelClose').addEventListener('click', () => this.closePanel());

        // ESC to close panel
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closePanel();
            }
        });

        // Drag to pan
        this.viewport.addEventListener('mousedown', (e) => this.startDrag(e));
        document.addEventListener('mousemove', (e) => this.drag(e));
        document.addEventListener('mouseup', () => this.endDrag());

        // Mouse wheel zoom
        this.viewport.addEventListener('wheel', (e) => {
            if (e.ctrlKey) {
                e.preventDefault();
                const delta = e.deltaY > 0 ? -0.1 : 0.1;
                this.setZoom(this.zoom + delta);
            }
        }, { passive: false });

        // Window resize - Linien neu berechnen
        window.addEventListener('resize', () => {
            requestAnimationFrame(() => {
                this.updateConnectorLines();
            });
        });
    }

    /**
     * Baumstruktur aus Daten generieren
     */
    buildTreeData() {
        return {
            id: 'root',
            label: 'Sky Touchscreen',
            icon: 'grid',
            description: 'Komplettes RCS Touch System für Live-TV Produktion',
            children: [
                {
                    id: 'rcs-touch',
                    label: 'RCS Touch',
                    icon: 'layout',
                    description: 'Hauptsystem für Live-TV Produktionen',
                    children: SKY_DATA.mainMenu
                },
                {
                    id: 'shows',
                    label: 'Shows',
                    icon: 'flag',
                    description: 'Verschiedene Wettbewerbe und Ligen',
                    children: SKY_DATA.shows.map(show => ({
                        ...show,
                        description: show.hasKoPhase ? 'Inkl. KO-Phase Option' : (show.design === 'generic' ? 'Generic Design' : '')
                    }))
                },
                {
                    id: 'aki-paint',
                    label: 'AKI Paint',
                    icon: 'edit-2',
                    description: SKY_DATA.akiPaint.description,
                    children: [
                        ...SKY_DATA.akiPaint.sports,
                        {
                            id: 'aki-features',
                            label: 'Features',
                            icon: 'star',
                            description: 'AKI Paint Funktionen',
                            children: SKY_DATA.akiPaint.features.map((f, i) => ({
                                id: `aki-feature-${i}`,
                                label: f,
                                icon: 'check'
                            }))
                        }
                    ]
                },
                {
                    id: 'data-sources',
                    label: 'Datensätze',
                    icon: 'database',
                    description: 'Datenquellen für Statistiken',
                    children: SKY_DATA.dataSources.map(ds => ({
                        ...ds,
                        description: ds.competitions.join(', '),
                        children: ds.competitions.map((comp, i) => ({
                            id: `${ds.id}-${i}`,
                            label: comp,
                            icon: 'flag'
                        }))
                    }))
                },
                {
                    id: 'web-app',
                    label: 'RCS Webapplikation',
                    icon: 'globe',
                    description: 'Web-basierte Steuerung',
                    children: [
                        {
                            id: 'web-home',
                            label: 'Home',
                            icon: 'home',
                            children: [
                                {
                                    id: 'web-settings',
                                    label: 'Settings',
                                    icon: 'settings',
                                    children: SKY_DATA.webApp.home.settings.map((s, i) => ({
                                        id: `web-setting-${i}`,
                                        label: s,
                                        icon: 'sliders'
                                    }))
                                },
                                {
                                    id: 'web-content',
                                    label: 'Content',
                                    icon: 'file-text',
                                    children: SKY_DATA.webApp.home.content.map((c, i) => ({
                                        id: `web-content-${i}`,
                                        label: c,
                                        icon: 'file'
                                    }))
                                }
                            ]
                        },
                        {
                            id: 'web-sports',
                            label: 'Sports',
                            icon: 'activity',
                            children: SKY_DATA.webApp.sports.competitions.map((c, i) => ({
                                id: `web-sport-${i}`,
                                label: c,
                                icon: 'flag'
                            }))
                        }
                    ]
                }
            ]
        };
    }

    /**
     * Baum rendern
     */
    render() {
        const treeData = this.useNotionData ? this.buildTreeDataFromNotion() : this.buildTreeData();
        this.canvas.innerHTML = '';

        const treeContainer = document.createElement('div');
        treeContainer.className = 'tree-container';

        const rootNode = this.renderNode(treeData, 0, []);
        treeContainer.appendChild(rootNode);

        this.canvas.appendChild(treeContainer);

        // Linien-Positionen nach dem Rendern berechnen
        requestAnimationFrame(() => {
            this.updateConnectorLines();
        });
    }

    /**
     * Berechnet und setzt die horizontalen Verbindungslinien
     */
    updateConnectorLines() {
        const childrenContainers = this.canvas.querySelectorAll('.tree-children:not(.single)');

        childrenContainers.forEach(container => {
            const children = container.querySelectorAll(':scope > .tree-node');
            if (children.length < 2) return;

            const firstChild = children[0];
            const lastChild = children[children.length - 1];

            const containerRect = container.getBoundingClientRect();
            const firstRect = firstChild.getBoundingClientRect();
            const lastRect = lastChild.getBoundingClientRect();

            // Berechne die Position relativ zum Container
            const firstCenter = firstRect.left + firstRect.width / 2 - containerRect.left;
            const lastCenter = lastRect.left + lastRect.width / 2 - containerRect.left;

            // Setze CSS-Variablen für die horizontale Linie
            container.style.setProperty('--line-left', `${firstCenter}px`);
            container.style.setProperty('--line-right', `${containerRect.width - lastCenter}px`);
        });
    }

    /**
     * Einzelnen Node rendern
     */
    renderNode(node, level, path) {
        const nodeElement = document.createElement('div');
        nodeElement.className = `tree-node ${level === 0 ? 'root-node' : ''}`;
        nodeElement.dataset.id = node.id;
        nodeElement.style.animationDelay = `${level * 0.05}s`;

        const currentPath = [...path, node.label];

        // Node Box
        const nodeBox = document.createElement('div');
        nodeBox.className = `node-box ${level === 0 ? 'root' : ''} ${level === 1 ? 'level-1' : ''}`;

        if (this.expandedNodes.has(node.id)) {
            nodeBox.classList.add('expanded');
        }

        // Icon
        const iconDiv = document.createElement('div');
        iconDiv.className = 'node-icon';
        iconDiv.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICONS[node.icon] || ICONS['circle']}</svg>`;
        nodeBox.appendChild(iconDiv);

        // Content
        const contentDiv = document.createElement('div');
        contentDiv.className = 'node-content';

        const labelSpan = document.createElement('span');
        labelSpan.className = 'node-label';
        labelSpan.textContent = node.label;
        contentDiv.appendChild(labelSpan);

        if (node.children && node.children.length > 0) {
            const countSpan = document.createElement('span');
            countSpan.className = 'node-count';
            countSpan.textContent = `${node.children.length} items`;
            contentDiv.appendChild(countSpan);
        }

        nodeBox.appendChild(contentDiv);

        // Toggle (wenn Kinder vorhanden)
        if (node.children && node.children.length > 0) {
            const toggleDiv = document.createElement('div');
            toggleDiv.className = 'node-toggle';
            toggleDiv.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>`;
            nodeBox.appendChild(toggleDiv);
        }

        // Event Listeners
        nodeBox.addEventListener('click', (e) => {
            e.stopPropagation();
            this.handleNodeClick(node, currentPath);
        });

        nodeBox.addEventListener('mouseenter', (e) => {
            if (node.description) {
                this.showTooltip(node.description, e);
            }
        });

        nodeBox.addEventListener('mouseleave', () => {
            this.hideTooltip();
        });

        nodeElement.appendChild(nodeBox);

        // Kinder rendern (wenn erweitert)
        if (node.children && node.children.length > 0 && this.expandedNodes.has(node.id)) {
            const childrenContainer = document.createElement('div');
            const childCount = node.children.length;
            childrenContainer.className = `tree-children ${childCount === 1 ? 'single' : ''}`;

            node.children.forEach((child, index) => {
                const childNode = this.renderNode(child, level + 1, currentPath);
                childNode.style.animationDelay = `${(level + 1) * 0.03 + index * 0.02}s`;
                childrenContainer.appendChild(childNode);
            });

            nodeElement.appendChild(childrenContainer);
        }

        return nodeElement;
    }

    /**
     * Node Click Handler
     */
    handleNodeClick(node, path) {
        // Toggle expand/collapse
        if (node.children && node.children.length > 0) {
            if (this.expandedNodes.has(node.id)) {
                this.expandedNodes.delete(node.id);
            } else {
                this.expandedNodes.add(node.id);
            }
            this.render();
        }

        // Detail Panel öffnen
        this.showDetail(node, path);
    }

    /**
     * Detail Panel anzeigen
     */
    showDetail(node, path) {
        let html = `<h2>${node.label}</h2>`;

        if (node.description) {
            html += `<p>${node.description}</p>`;
        }

        // Pfad
        html += `<div class="panel-path">Pfad: ${path.join(' → ')}</div>`;

        // Screenshots anzeigen (aus Notion)
        if (node.screenshots && node.screenshots.length > 0) {
            html += `<h3>Screenshots</h3><div class="panel-screenshots">`;
            node.screenshots.forEach((screenshot, index) => {
                html += `
                    <div class="screenshot-item">
                        <img src="${screenshot.url}" alt="${screenshot.name || 'Screenshot ' + (index + 1)}" loading="lazy" onclick="window.open('${screenshot.url}', '_blank')">
                        <span class="screenshot-name">${screenshot.name || 'Screenshot ' + (index + 1)}</span>
                    </div>
                `;
            });
            html += `</div>`;
        }

        // Video anzeigen (aus Notion)
        if (node.videoUrl) {
            html += `<h3>Video</h3>`;
            // YouTube/Vimeo Embed
            if (node.videoUrl.includes('youtube.com') || node.videoUrl.includes('youtu.be')) {
                const videoId = this.extractYouTubeId(node.videoUrl);
                if (videoId) {
                    html += `<div class="panel-video"><iframe src="https://www.youtube.com/embed/${videoId}" frameborder="0" allowfullscreen></iframe></div>`;
                }
            } else if (node.videoUrl.includes('vimeo.com')) {
                const videoId = node.videoUrl.split('/').pop();
                html += `<div class="panel-video"><iframe src="https://player.vimeo.com/video/${videoId}" frameborder="0" allowfullscreen></iframe></div>`;
            } else {
                html += `<div class="panel-video"><a href="${node.videoUrl}" target="_blank" class="video-link">🎬 Video öffnen</a></div>`;
            }
        }

        // Status, Tage, Meilensteine (aus Notion)
        if (node.status || node.tage || node.meilensteine || node.aufgaben) {
            html += `<h3>Projektinfo</h3><ul class="project-info">`;
            if (node.status) {
                const statusClass = node.status.toLowerCase().replace(/\s+/g, '-');
                html += `<li><strong>Status:</strong> <span class="status-badge ${statusClass}">${node.status}</span></li>`;
            }
            if (node.tage) {
                html += `<li><strong>Aufwand:</strong> ${node.tage} Tage</li>`;
            }
            html += `</ul>`;

            if (node.meilensteine) {
                html += `<h4>Meilensteine</h4><div class="milestones">${node.meilensteine.replace(/\n/g, '<br>')}</div>`;
            }
            if (node.aufgaben) {
                html += `<h4>Aufgaben</h4><div class="tasks">${node.aufgaben.replace(/\n/g, '<br>')}</div>`;
            }
        }

        // Metadaten
        html += `
            <h3>Informationen</h3>
            <ul>
                <li><strong>ID:</strong> ${node.id}</li>
                <li><strong>Icon:</strong> ${node.icon}</li>
                ${node.children ? `<li><strong>Unterelemente:</strong> ${node.children.length}</li>` : ''}
            </ul>
        `;

        // Kinder auflisten
        if (node.children && node.children.length > 0) {
            html += `<h3>Unterelemente</h3><div class="panel-children">`;
            node.children.forEach(child => {
                html += `
                    <div class="panel-child-item" data-id="${child.id}">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICONS[child.icon] || ICONS['circle']}</svg>
                        <span>${child.label}</span>
                    </div>
                `;
            });
            html += `</div>`;
        }

        this.panelContent.innerHTML = html;
        this.detailPanel.classList.add('open');

        // Child item click handlers
        this.panelContent.querySelectorAll('.panel-child-item').forEach(item => {
            item.addEventListener('click', () => {
                const childId = item.dataset.id;
                this.expandedNodes.add(node.id);
                this.render();

                // Scroll to child
                setTimeout(() => {
                    const childElement = this.canvas.querySelector(`[data-id="${childId}"]`);
                    if (childElement) {
                        childElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        childElement.querySelector('.node-box').classList.add('highlighted');
                        setTimeout(() => {
                            childElement.querySelector('.node-box').classList.remove('highlighted');
                        }, 2000);
                    }
                }, 100);
            });
        });
    }

    /**
     * Panel schließen
     */
    closePanel() {
        this.detailPanel.classList.remove('open');
    }

    /**
     * Alle aufklappen
     */
    expandAll() {
        const addAllIds = (node) => {
            this.expandedNodes.add(node.id);
            if (node.children) {
                node.children.forEach(child => addAllIds(child));
            }
        };

        const treeData = this.buildTreeData();
        addAllIds(treeData);
        this.render();
    }

    /**
     * Alle zuklappen
     */
    collapseAll() {
        this.expandedNodes.clear();
        this.expandedNodes.add('root');
        this.render();
    }

    /**
     * Zoom setzen
     */
    setZoom(level) {
        this.zoom = Math.max(this.minZoom, Math.min(this.maxZoom, level));
        this.canvas.style.transform = `scale(${this.zoom})`;
        document.getElementById('zoomLevel').textContent = `${Math.round(this.zoom * 100)}%`;

        // Linien nach Zoom-Änderung neu berechnen
        requestAnimationFrame(() => {
            this.updateConnectorLines();
        });
    }

    /**
     * Drag Start
     */
    startDrag(e) {
        if (e.target.closest('.node-box') || e.target.closest('.control-btn')) {
            return;
        }
        this.isDragging = true;
        this.dragStart = { x: e.clientX, y: e.clientY };
        this.scrollStart = {
            x: this.viewport.scrollLeft,
            y: this.viewport.scrollTop
        };
        this.viewport.style.cursor = 'grabbing';
    }

    /**
     * Drag
     */
    drag(e) {
        if (!this.isDragging) return;

        const dx = e.clientX - this.dragStart.x;
        const dy = e.clientY - this.dragStart.y;

        this.viewport.scrollLeft = this.scrollStart.x - dx;
        this.viewport.scrollTop = this.scrollStart.y - dy;
    }

    /**
     * Drag End
     */
    endDrag() {
        this.isDragging = false;
        this.viewport.style.cursor = 'grab';
    }

    /**
     * Tooltip anzeigen
     */
    showTooltip(text, event) {
        this.tooltip.textContent = text;
        this.tooltip.classList.add('visible');

        const rect = event.target.getBoundingClientRect();
        const tooltipRect = this.tooltip.getBoundingClientRect();

        let left = rect.left + rect.width / 2 - tooltipRect.width / 2;
        let top = rect.bottom + 10;

        if (left < 10) left = 10;
        if (left + tooltipRect.width > window.innerWidth - 10) {
            left = window.innerWidth - tooltipRect.width - 10;
        }
        if (top + tooltipRect.height > window.innerHeight - 10) {
            top = rect.top - tooltipRect.height - 10;
        }

        this.tooltip.style.left = `${left}px`;
        this.tooltip.style.top = `${top}px`;
    }

    /**
     * Tooltip verstecken
     */
    hideTooltip() {
        this.tooltip.classList.remove('visible');
    }

    /**
     * Zeit aktualisieren
     */
    updateTime() {
        const now = new Date();
        const timeStr = now.toLocaleTimeString('de-DE', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
        document.getElementById('currentTime').textContent = timeStr;
    }

    /**
     * YouTube Video ID extrahieren
     */
    extractYouTubeId(url) {
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
        const match = url.match(regExp);
        return (match && match[2].length === 11) ? match[2] : null;
    }

    /**
     * Daten aus Notion laden und Baum aktualisieren
     */
    async loadFromNotion() {
        if (typeof notionDataLoader === 'undefined') {
            console.warn('NotionDataLoader nicht verfügbar');
            return false;
        }

        try {
            const notionData = await notionDataLoader.loadAll();
            this.notionData = notionData;
            this.useNotionData = true;
            this.render();
            console.log('Notion-Daten geladen:', notionData.length, 'Elemente');
            return true;
        } catch (error) {
            console.error('Fehler beim Laden der Notion-Daten:', error);
            return false;
        }
    }

    /**
     * Baumstruktur aus Notion-Daten oder statischen Daten generieren
     */
    buildTreeDataFromNotion() {
        if (!this.useNotionData || !this.notionData) {
            return this.buildTreeData();
        }

        // Notion-Daten als Hauptmenü verwenden
        return {
            id: 'root',
            label: 'Sky Touchscreen',
            icon: 'grid',
            description: 'Komplettes RCS Touch System für Live-TV Produktion (Daten aus Notion)',
            children: this.notionData
        };
    }
}

// Zusätzliche Icons für Tree View
ICONS['globe'] = '<circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>';
ICONS['home'] = '<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>';
ICONS['settings'] = '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>';
ICONS['sliders'] = '<line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/>';
ICONS['file-text'] = '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>';
ICONS['file'] = '<path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/>';

// App starten
document.addEventListener('DOMContentLoaded', () => {
    window.treeView = new TreeView('treeCanvas');
});
