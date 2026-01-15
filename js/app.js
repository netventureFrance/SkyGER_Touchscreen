/**
 * Sky Touchscreen - Hauptanwendung
 * Verwaltet Navigation, Overlays und Interaktionen
 */

class SkyTouchscreenApp {
    constructor() {
        // DOM Elemente
        this.radialContainer = document.getElementById('radialItems');
        this.submenuOverlay = document.getElementById('submenuOverlay');
        this.submenuContainer = document.getElementById('submenuContainer');
        this.submenuTitle = document.getElementById('submenuTitle');
        this.submenuGrid = document.getElementById('submenuGrid');
        this.detailOverlay = document.getElementById('detailOverlay');
        this.detailContainer = document.getElementById('detailContainer');
        this.detailContent = document.getElementById('detailContent');
        this.breadcrumb = document.getElementById('breadcrumb');
        this.tooltip = document.getElementById('tooltip');
        this.centerLogo = document.getElementById('centerLogo');

        // State
        this.navigationStack = [];
        this.currentLevel = 0;
        this.radialMenu = null;

        // Initialisierung
        this.init();
    }

    init() {
        // Radiales Menü initialisieren
        this.radialMenu = new RadialMenu('radialItems', {
            radius: 220,
            startAngle: -90
        });

        // Event Handler setzen
        this.radialMenu.setClickHandler((item, index) => this.handleMenuClick(item));
        this.radialMenu.setHoverHandler((item, event, isEntering) => this.handleMenuHover(item, event, isEntering));

        // Hauptmenü rendern
        this.radialMenu.render(SKY_DATA.mainMenu);

        // Event Listeners
        this.setupEventListeners();

        // Zeit aktualisieren
        this.updateTime();
        setInterval(() => this.updateTime(), 1000);

        // Resize Handler
        window.addEventListener('resize', () => {
            this.radialMenu.updatePositions();
        });
    }

    setupEventListeners() {
        // Back Buttons
        document.getElementById('backBtn').addEventListener('click', () => this.navigateBack());
        document.getElementById('detailBackBtn').addEventListener('click', () => this.closeDetail());

        // ESC Taste
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                if (this.detailOverlay.classList.contains('active')) {
                    this.closeDetail();
                } else if (this.submenuOverlay.classList.contains('active')) {
                    this.navigateBack();
                }
            }
        });

        // Center Logo Click
        this.centerLogo.addEventListener('click', () => this.resetToHome());

        // Overlay Clicks (außerhalb schließen)
        this.submenuOverlay.addEventListener('click', (e) => {
            if (e.target === this.submenuOverlay) {
                this.navigateBack();
            }
        });

        this.detailOverlay.addEventListener('click', (e) => {
            if (e.target === this.detailOverlay) {
                this.closeDetail();
            }
        });

        // Sidebar Buttons
        document.querySelectorAll('.sidebar-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const action = btn.dataset.action;
                this.handleSidebarAction(action);
            });
        });
    }

    /**
     * Hauptmenü-Klick Handler
     */
    handleMenuClick(item) {
        if (item.children && item.children.length > 0) {
            this.openSubmenu(item);
        } else {
            this.showDetail(item);
        }
    }

    /**
     * Hover Handler für Tooltip
     */
    handleMenuHover(item, event, isEntering) {
        if (isEntering && item.description) {
            this.showTooltip(item.description, event);
        } else {
            this.hideTooltip();
        }
    }

    /**
     * Öffnet ein Submenü
     */
    openSubmenu(item) {
        this.navigationStack.push(item);
        this.currentLevel++;

        this.submenuTitle.textContent = item.label;
        this.renderSubmenuItems(item.children);
        this.updateBreadcrumb();

        this.submenuOverlay.classList.add('active');
    }

    /**
     * Rendert Submenü Items
     */
    renderSubmenuItems(items) {
        this.submenuGrid.innerHTML = '';

        items.forEach((item, index) => {
            const element = this.createSubmenuItem(item, index);
            this.submenuGrid.appendChild(element);
        });
    }

    /**
     * Erzeugt ein Submenü Item
     */
    createSubmenuItem(item, index) {
        const element = document.createElement('div');
        element.className = 'submenu-item';
        element.dataset.id = item.id;
        element.style.animationDelay = `${index * 0.05}s`;

        // Icon
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('viewBox', '0 0 24 24');
        svg.setAttribute('fill', 'none');
        svg.setAttribute('stroke', 'currentColor');
        svg.setAttribute('stroke-width', '2');
        svg.setAttribute('stroke-linecap', 'round');
        svg.setAttribute('stroke-linejoin', 'round');
        svg.innerHTML = ICONS[item.icon] || ICONS['circle'];
        element.appendChild(svg);

        // Label
        const label = document.createElement('span');
        label.className = 'label';
        label.textContent = item.label;
        element.appendChild(label);

        // Kinder-Indikator
        if (item.children && item.children.length > 0) {
            element.classList.add('has-children');
        }

        // Click Handler
        element.addEventListener('click', () => {
            if (item.children && item.children.length > 0) {
                this.navigateDeeper(item);
            } else {
                this.showDetail(item);
            }
        });

        // Hover für Tooltip
        element.addEventListener('mouseenter', (e) => {
            if (item.description) {
                this.showTooltip(item.description, e);
            }
        });

        element.addEventListener('mouseleave', () => {
            this.hideTooltip();
        });

        return element;
    }

    /**
     * Navigiert tiefer in die Hierarchie
     */
    navigateDeeper(item) {
        this.navigationStack.push(item);
        this.currentLevel++;

        this.submenuTitle.textContent = item.label;
        this.renderSubmenuItems(item.children);
        this.updateBreadcrumb();
    }

    /**
     * Navigiert zurück
     */
    navigateBack() {
        if (this.navigationStack.length > 1) {
            this.navigationStack.pop();
            this.currentLevel--;

            const currentItem = this.navigationStack[this.navigationStack.length - 1];
            this.submenuTitle.textContent = currentItem.label;
            this.renderSubmenuItems(currentItem.children);
            this.updateBreadcrumb();
        } else {
            this.closeSubmenu();
        }
    }

    /**
     * Schließt das Submenü komplett
     */
    closeSubmenu() {
        this.submenuOverlay.classList.remove('active');
        this.navigationStack = [];
        this.currentLevel = 0;
        this.updateBreadcrumb();
    }

    /**
     * Zeigt Detail-Ansicht
     */
    showDetail(item) {
        const content = this.generateDetailContent(item);
        this.detailContent.innerHTML = content;
        this.detailOverlay.classList.add('active');
    }

    /**
     * Generiert Detail-Content
     */
    generateDetailContent(item) {
        let content = `<h2>${item.label}</h2>`;

        if (item.description) {
            content += `<p>${item.description}</p>`;
        }

        // Pfad anzeigen
        if (this.navigationStack.length > 0) {
            const path = this.navigationStack.map(i => i.label).join(' → ');
            content += `<p style="color: var(--accent-cyan); font-size: 12px; margin-top: 20px;">Pfad: ${path} → ${item.label}</p>`;
        }

        // Metadaten
        content += `
            <h3>Informationen</h3>
            <ul>
                <li><strong>ID:</strong> ${item.id}</li>
                <li><strong>Icon:</strong> ${item.icon}</li>
                <li><strong>Ebene:</strong> ${this.currentLevel + 1}</li>
            </ul>
        `;

        // Hinweis auf Notion-Integration
        content += `
            <h3>Notion-Daten</h3>
            <p>Diese Ansicht wird mit der Notion API verbunden, um Live-Daten anzuzeigen.</p>
        `;

        return content;
    }

    /**
     * Schließt Detail-Ansicht
     */
    closeDetail() {
        this.detailOverlay.classList.remove('active');
    }

    /**
     * Aktualisiert Breadcrumb
     */
    updateBreadcrumb() {
        let html = '<span class="breadcrumb-item" data-index="-1">Sky Touchscreen</span>';

        this.navigationStack.forEach((item, index) => {
            html += '<span class="breadcrumb-separator">›</span>';
            html += `<span class="breadcrumb-item${index === this.navigationStack.length - 1 ? ' active' : ''}" data-index="${index}">${item.label}</span>`;
        });

        this.breadcrumb.innerHTML = html;

        // Click Handler für Breadcrumb
        this.breadcrumb.querySelectorAll('.breadcrumb-item').forEach(el => {
            el.addEventListener('click', () => {
                const index = parseInt(el.dataset.index);
                this.navigateToBreadcrumb(index);
            });
        });
    }

    /**
     * Navigiert zu Breadcrumb Position
     */
    navigateToBreadcrumb(index) {
        if (index === -1) {
            this.closeSubmenu();
        } else if (index < this.navigationStack.length - 1) {
            // Navigiere zur gewählten Ebene
            while (this.navigationStack.length > index + 1) {
                this.navigationStack.pop();
                this.currentLevel--;
            }

            const currentItem = this.navigationStack[this.navigationStack.length - 1];
            this.submenuTitle.textContent = currentItem.label;
            this.renderSubmenuItems(currentItem.children);
            this.updateBreadcrumb();
        }
    }

    /**
     * Zurück zum Home
     */
    resetToHome() {
        this.closeSubmenu();
        this.closeDetail();
    }

    /**
     * Zeigt Tooltip
     */
    showTooltip(text, event) {
        this.tooltip.textContent = text;
        this.tooltip.classList.add('visible');

        const rect = event.target.getBoundingClientRect();
        const tooltipRect = this.tooltip.getBoundingClientRect();

        let left = rect.left + rect.width / 2 - tooltipRect.width / 2;
        let top = rect.bottom + 10;

        // Bildschirmgrenzen beachten
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
     * Versteckt Tooltip
     */
    hideTooltip() {
        this.tooltip.classList.remove('visible');
    }

    /**
     * Sidebar Action Handler
     */
    handleSidebarAction(action) {
        switch (action) {
            case 'settings':
                console.log('Settings clicked');
                // TODO: Settings Modal öffnen
                break;
            case 'data':
                console.log('Data sources clicked');
                // TODO: Datenquellen anzeigen
                break;
            case 'bookmark':
                console.log('Bookmarks clicked');
                // TODO: Bookmarks anzeigen
                break;
            case 'fullscreen':
                this.toggleFullscreen();
                break;
            case 'info':
                this.showAppInfo();
                break;
            case 'help':
                console.log('Help clicked');
                // TODO: Hilfe anzeigen
                break;
        }
    }

    /**
     * Vollbild Toggle
     */
    toggleFullscreen() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
        } else {
            document.exitFullscreen();
        }
    }

    /**
     * App Info anzeigen
     */
    showAppInfo() {
        const item = {
            id: 'app-info',
            label: 'Sky Touchscreen Dokumentation',
            icon: 'info',
            description: 'Interaktive Visualisierung der Sky Sport Touchscreen Struktur'
        };

        this.detailContent.innerHTML = `
            <h2>Sky Touchscreen Dokumentation</h2>
            <p>Diese Visualisierung dokumentiert die komplette Struktur des Sky Sport Touchscreen Systems.</p>

            <h3>Features</h3>
            <ul>
                <li>Radiales Hauptmenü mit 9 Kategorien</li>
                <li>Mehrstufige Navigation (bis Level 4)</li>
                <li>Notion API Integration (geplant)</li>
                <li>Responsive Design</li>
            </ul>

            <h3>Technologie</h3>
            <ul>
                <li>HTML5, CSS3, JavaScript (ES6+)</li>
                <li>Netlify Functions für API Proxy</li>
                <li>Notion als Datenquelle</li>
            </ul>

            <h3>Workshop</h3>
            <p>Nächster Workshop: <strong>08.01.2026</strong></p>
            <p>Ziel: Phase I - Ablösung RCS für Fußball</p>
        `;

        this.detailOverlay.classList.add('active');
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
}

// App starten wenn DOM geladen
document.addEventListener('DOMContentLoaded', () => {
    window.skyApp = new SkyTouchscreenApp();
});
