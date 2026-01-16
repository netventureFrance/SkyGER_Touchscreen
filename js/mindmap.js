/**
 * Sky Touchscreen - Mindmap View
 * Radiale Mindmap-Darstellung mit zentralem Node
 */

class MindmapView {
    constructor() {
        this.canvas = document.getElementById('mindmapCanvas');
        this.viewport = document.getElementById('mindmapViewport');
        this.nodesContainer = document.getElementById('mindmapNodes');
        this.linesContainer = document.getElementById('mindmapLines');
        this.detailPanel = document.getElementById('detailPanel');
        this.panelContent = document.getElementById('panelContent');
        this.tooltip = document.getElementById('tooltip');

        // Canvas Größe
        this.canvasWidth = 3000;
        this.canvasHeight = 2000;
        this.centerX = this.canvasWidth / 2;
        this.centerY = this.canvasHeight / 2;

        // State
        this.expandedNodes = new Set();
        this.nodePositions = new Map();
        this.activeNodeId = 'root'; // Track active/selected node
        this.zoom = 1;
        this.minZoom = 0.3;
        this.maxZoom = 1.5;

        // Drag
        this.isDragging = false;
        this.dragStart = { x: 0, y: 0 };
        this.scrollStart = { x: 0, y: 0 };

        // Layout Konfiguration
        this.config = {
            rootRadius: 90,
            level1Distance: 320,
            level2Distance: 280,
            level3Distance: 220,
            level4Distance: 180,
            minNodeSpacing: 80 // Minimum pixels between nodes vertically
        };

        this.init();
    }

    async init() {
        // Try to load notion-data.json
        await this.loadNotionData();

        // Initial erweiterte Nodes
        this.expandedNodes.add('root');

        // Rendern
        this.render();

        // Event Listeners
        this.setupEventListeners();

        // Zentrieren
        this.centerView();

        // Zeit
        this.updateTime();
        setInterval(() => this.updateTime(), 1000);
    }

    async loadNotionData() {
        try {
            const response = await fetch('images/notion-data.json');
            if (response.ok) {
                const data = await response.json();
                // Find "Sky Sport Design Bundesliga" node
                const skyNode = data.children?.find(c => c.label === 'Sky Sport Design Bundesliga');
                if (skyNode) {
                    this.notionData = skyNode;
                    console.log('Loaded Notion data:', skyNode.children?.length, 'items');
                }
            }
        } catch (e) {
            console.log('No notion-data.json found, using fallback data');
        }
    }

    setupEventListeners() {
        // Controls
        document.getElementById('expandAllBtn').addEventListener('click', () => this.expandAll());
        document.getElementById('collapseAllBtn').addEventListener('click', () => this.collapseAll());
        document.getElementById('centerBtn').addEventListener('click', () => this.centerView());

        // Zoom
        document.getElementById('zoomInBtn').addEventListener('click', () => this.setZoom(this.zoom + 0.1));
        document.getElementById('zoomOutBtn').addEventListener('click', () => this.setZoom(this.zoom - 0.1));

        // Panel
        document.getElementById('panelClose').addEventListener('click', () => this.closePanel());

        // Keyboard
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') this.closePanel();
        });

        // Drag
        this.viewport.addEventListener('mousedown', (e) => this.startDrag(e));
        document.addEventListener('mousemove', (e) => this.drag(e));
        document.addEventListener('mouseup', () => this.endDrag());

        // Wheel zoom
        this.viewport.addEventListener('wheel', (e) => {
            if (e.ctrlKey) {
                e.preventDefault();
                const delta = e.deltaY > 0 ? -0.1 : 0.1;
                this.setZoom(this.zoom + delta);
            }
        }, { passive: false });

        // Resize
        window.addEventListener('resize', () => this.render());
    }

    /**
     * Datenstruktur aufbauen
     * Verwendet Notion-Daten wenn verfügbar, sonst SKY_DATA
     */
    buildData() {
        // Wenn Notion-Daten geladen wurden, diese verwenden
        if (this.notionData) {
            return this.convertNotionToMindmap(this.notionData);
        }

        // Fallback: Statische Daten - direkt aus mainMenu
        return {
            id: 'root',
            label: 'Sky Sport Design Bundesliga',
            icon: 'grid',
            description: 'Komplettes RCS Touch System für Live-TV Produktion',
            screenshots: SKY_DATA.rootScreenshots || [],
            children: SKY_DATA.mainMenu
        };
    }

    /**
     * Konvertiert Notion-Daten zum Mindmap-Format
     */
    convertNotionToMindmap(notionItem) {
        // Map emoji to icon name
        const emojiToIcon = {
            '📱': 'smartphone',
            '🎮': 'grid',
            '⚽': 'target',
            '📊': 'bar-chart',
            '📺': 'video',
            '🏆': 'trophy',
            '📁': 'folder',
            '📄': 'file',
            '🗂️': 'database',
            '💾': 'database'
        };

        const icon = emojiToIcon[notionItem.icon] || notionItem.icon || 'circle';

        return {
            id: notionItem.id || notionItem.notionId,
            label: notionItem.label || 'Untitled',
            icon: icon,
            description: notionItem.description || '',
            screenshots: notionItem.screenshots || [],
            children: (notionItem.children || []).map(child => this.convertNotionToMindmap(child))
        };
    }

    /**
     * Mindmap rendern
     */
    render() {
        const data = this.buildData();

        // Clear
        this.nodesContainer.innerHTML = '';
        this.linesContainer.innerHTML = '';
        this.nodePositions.clear();

        // Root Node
        this.renderNode(data, this.centerX, this.centerY, 0, null, 0, 360);

        // Linien zeichnen
        this.drawLines();
    }

    /**
     * Node rendern
     */
    renderNode(node, x, y, level, parentPos, startAngle, endAngle) {
        // Position speichern
        this.nodePositions.set(node.id, { x, y, level, parentPos });

        // Node Element erstellen
        const nodeEl = document.createElement('div');
        nodeEl.className = `mindmap-node level-${level} ${level === 0 ? 'root' : ''}`;
        nodeEl.dataset.id = node.id;
        nodeEl.style.left = `${x}px`;
        nodeEl.style.top = `${y}px`;
        nodeEl.style.animationDelay = `${level * 0.1}s`;

        // Node Box
        const boxEl = document.createElement('div');
        boxEl.className = 'mindmap-node-box';

        if (this.expandedNodes.has(node.id)) {
            boxEl.classList.add('expanded');
        }

        // Icon
        const iconEl = document.createElement('div');
        iconEl.className = 'node-icon';
        iconEl.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICONS[node.icon] || ICONS['circle']}</svg>`;

        // Label
        const labelEl = document.createElement('span');
        labelEl.className = 'node-label';
        labelEl.textContent = node.label;

        boxEl.appendChild(iconEl);
        boxEl.appendChild(labelEl);

        // Count Badge (wenn Kinder vorhanden)
        if (node.children && node.children.length > 0) {
            const countEl = document.createElement('span');
            countEl.className = 'node-count';
            countEl.textContent = node.children.length;
            boxEl.appendChild(countEl);

            // Toggle Icon
            const toggleEl = document.createElement('div');
            toggleEl.className = 'node-toggle';
            toggleEl.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>`;
            boxEl.appendChild(toggleEl);
        }

        // Events
        boxEl.addEventListener('click', (e) => {
            e.stopPropagation();
            this.handleNodeClick(node);
        });

        boxEl.addEventListener('mouseenter', (e) => {
            if (node.description) this.showTooltip(node.description, e);
        });

        boxEl.addEventListener('mouseleave', () => this.hideTooltip());

        nodeEl.appendChild(boxEl);
        this.nodesContainer.appendChild(nodeEl);

        // Kinder rendern (wenn erweitert)
        if (node.children && node.children.length > 0 && this.expandedNodes.has(node.id)) {
            this.renderChildren(node, x, y, level, startAngle, endAngle);
        }
    }

    /**
     * Berechne die Höhe eines Subtrees (für Spacing)
     */
    calculateSubtreeHeight(node, level) {
        if (!node.children || node.children.length === 0 || !this.expandedNodes.has(node.id)) {
            return this.config.minNodeSpacing;
        }

        let totalHeight = 0;
        for (const child of node.children) {
            totalHeight += this.calculateSubtreeHeight(child, level + 1);
        }

        return Math.max(totalHeight, this.config.minNodeSpacing);
    }

    /**
     * Kinder-Nodes rendern - Alle nach rechts, kein Überlappen
     */
    renderChildren(parentNode, parentX, parentY, parentLevel, startAngle, endAngle) {
        const children = parentNode.children;
        const childLevel = parentLevel + 1;

        // Distanz basierend auf Level
        let distance;
        switch (childLevel) {
            case 1: distance = this.config.level1Distance; break;
            case 2: distance = this.config.level2Distance; break;
            case 3: distance = this.config.level3Distance; break;
            default: distance = this.config.level4Distance;
        }

        // Berechne Höhe jedes Kindes (inkl. Subtree)
        const childHeights = children.map(child => this.calculateSubtreeHeight(child, childLevel));
        const totalHeight = childHeights.reduce((sum, h) => sum + h, 0);

        // Start Y-Position (zentriert um Parent)
        let currentY = parentY - totalHeight / 2;

        // Alle Kinder nach RECHTS positionieren
        const childX = parentX + distance;

        children.forEach((child, index) => {
            // Y-Position: Mitte des zugewiesenen Bereichs
            const childHeight = childHeights[index];
            const finalY = currentY + childHeight / 2;

            this.renderNode(
                child, childX, finalY, childLevel,
                { x: parentX, y: parentY },
                startAngle, endAngle
            );

            // Nächste Y-Position
            currentY += childHeight;
        });
    }

    /**
     * Verbindungslinien zeichnen
     */
    drawLines() {
        let pathsHtml = '';

        this.nodePositions.forEach((pos, nodeId) => {
            if (pos.parentPos) {
                const path = this.createBezierPath(
                    pos.parentPos.x, pos.parentPos.y,
                    pos.x, pos.y
                );
                pathsHtml += `<path d="${path}" data-from="${nodeId}" />`;
            }
        });

        this.linesContainer.innerHTML = pathsHtml;
    }

    /**
     * Bezier-Kurve erstellen
     */
    createBezierPath(x1, y1, x2, y2) {
        const dx = x2 - x1;
        const dy = y2 - y1;

        // Control Points für sanfte Kurve
        const cx1 = x1 + dx * 0.5;
        const cy1 = y1;
        const cx2 = x1 + dx * 0.5;
        const cy2 = y2;

        return `M ${x1} ${y1} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${x2} ${y2}`;
    }

    /**
     * Node Click Handler
     */
    handleNodeClick(node) {
        // Track active node for centering
        this.activeNodeId = node.id;

        if (node.children && node.children.length > 0) {
            if (this.expandedNodes.has(node.id)) {
                // Collapse: Auch alle Kinder schließen
                this.collapseNode(node);
            } else {
                this.expandedNodes.add(node.id);
            }
            this.render();
        }

        this.showDetail(node);
    }

    /**
     * Node und alle Kinder schließen
     */
    collapseNode(node) {
        this.expandedNodes.delete(node.id);
        if (node.children) {
            node.children.forEach(child => this.collapseNode(child));
        }
    }

    /**
     * Detail Panel anzeigen
     */
    showDetail(node) {
        let html = `<h2>${node.label}</h2>`;

        if (node.description) {
            html += `<p class="panel-description">${node.description}</p>`;
        }

        // Screenshots Carousel
        const screenshots = node.screenshots || [];
        if (screenshots.length > 0) {
            html += `
                <div class="screenshot-carousel" data-current="0">
                    <div class="carousel-container">
                        <div class="carousel-slides">
                            ${screenshots.map((img, i) => `
                                <div class="carousel-slide ${i === 0 ? 'active' : ''}" data-index="${i}">
                                    <img src="${img.url || img}" alt="${img.name || node.label}" loading="lazy">
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    ${screenshots.length > 1 ? `
                        <button class="carousel-btn carousel-prev" title="Vorheriges Bild">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="15 18 9 12 15 6"/>
                            </svg>
                        </button>
                        <button class="carousel-btn carousel-next" title="Nächstes Bild">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="9 18 15 12 9 6"/>
                            </svg>
                        </button>
                        <div class="carousel-dots">
                            ${screenshots.map((_, i) => `
                                <button class="carousel-dot ${i === 0 ? 'active' : ''}" data-index="${i}"></button>
                            `).join('')}
                        </div>
                    ` : ''}
                </div>
            `;
        }
        // No placeholder when no screenshots - just hide the section

        // Kinder anzeigen
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

        // Re-center mindmap in remaining space after sidebar animation
        setTimeout(() => this.centerView(), 350);

        // Carousel Event Handlers
        this.setupCarousel();

        // Child click handler
        this.panelContent.querySelectorAll('.panel-child-item').forEach(item => {
            item.addEventListener('click', () => {
                this.expandedNodes.add(node.id);
                this.render();
            });
        });
    }

    /**
     * Carousel Setup
     */
    setupCarousel() {
        const carousel = this.panelContent.querySelector('.screenshot-carousel');
        if (!carousel) return;

        const slides = carousel.querySelectorAll('.carousel-slide');
        const dots = carousel.querySelectorAll('.carousel-dot');
        const prevBtn = carousel.querySelector('.carousel-prev');
        const nextBtn = carousel.querySelector('.carousel-next');

        if (slides.length <= 1) return;

        let currentIndex = 0;

        const showSlide = (index) => {
            // Wrap around
            if (index < 0) index = slides.length - 1;
            if (index >= slides.length) index = 0;

            currentIndex = index;

            slides.forEach((slide, i) => {
                slide.classList.toggle('active', i === index);
            });

            dots.forEach((dot, i) => {
                dot.classList.toggle('active', i === index);
            });
        };

        if (prevBtn) {
            prevBtn.addEventListener('click', () => showSlide(currentIndex - 1));
        }

        if (nextBtn) {
            nextBtn.addEventListener('click', () => showSlide(currentIndex + 1));
        }

        dots.forEach((dot, i) => {
            dot.addEventListener('click', () => showSlide(i));
        });

        // Keyboard navigation
        carousel.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowLeft') showSlide(currentIndex - 1);
            if (e.key === 'ArrowRight') showSlide(currentIndex + 1);
        });

        // Touch swipe support
        let touchStartX = 0;
        carousel.addEventListener('touchstart', (e) => {
            touchStartX = e.touches[0].clientX;
        }, { passive: true });

        carousel.addEventListener('touchend', (e) => {
            const touchEndX = e.changedTouches[0].clientX;
            const diff = touchStartX - touchEndX;

            if (Math.abs(diff) > 50) {
                if (diff > 0) showSlide(currentIndex + 1);
                else showSlide(currentIndex - 1);
            }
        }, { passive: true });

        // Collect all images for lightbox carousel
        const allImages = [];
        slides.forEach((slide, i) => {
            const img = slide.querySelector('img');
            if (img) {
                allImages.push({ src: img.src, alt: img.alt });
                img.addEventListener('click', () => {
                    this.openLightbox(allImages, i);
                });
            }
        });
    }

    /**
     * Lightbox mit Carousel öffnen
     */
    openLightbox(images, startIndex = 0) {
        // Remove existing lightbox
        let lightbox = document.getElementById('imageLightbox');
        if (lightbox) {
            lightbox.remove();
        }

        // Create new lightbox with carousel if multiple images
        lightbox = document.createElement('div');
        lightbox.id = 'imageLightbox';
        lightbox.className = 'image-lightbox';

        const hasMultiple = images.length > 1;

        lightbox.innerHTML = `
            <div class="lightbox-backdrop"></div>
            <div class="lightbox-content">
                <div class="lightbox-carousel">
                    ${images.map((img, i) => `
                        <div class="lightbox-slide ${i === startIndex ? 'active' : ''}" data-index="${i}">
                            <img src="${img.src}" alt="${img.alt || ''}">
                        </div>
                    `).join('')}
                </div>
                ${hasMultiple ? `
                    <button class="lightbox-prev" title="Vorheriges Bild">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="15 18 9 12 15 6"/>
                        </svg>
                    </button>
                    <button class="lightbox-next" title="Nächstes Bild">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="9 18 15 12 9 6"/>
                        </svg>
                    </button>
                ` : ''}
                <div class="lightbox-caption">${images[startIndex]?.alt || ''}</div>
                ${hasMultiple ? `
                    <div class="lightbox-dots">
                        ${images.map((_, i) => `
                            <button class="lightbox-dot ${i === startIndex ? 'active' : ''}" data-index="${i}"></button>
                        `).join('')}
                    </div>
                ` : ''}
                <button class="lightbox-close" title="Schließen (ESC)">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="6" x2="6" y2="18"/>
                        <line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                </button>
            </div>
        `;

        document.body.appendChild(lightbox);

        // State
        let currentIndex = startIndex;
        const slides = lightbox.querySelectorAll('.lightbox-slide');
        const dots = lightbox.querySelectorAll('.lightbox-dot');
        const caption = lightbox.querySelector('.lightbox-caption');

        const showSlide = (index) => {
            if (index < 0) index = images.length - 1;
            if (index >= images.length) index = 0;
            currentIndex = index;

            slides.forEach((s, i) => s.classList.toggle('active', i === index));
            dots.forEach((d, i) => d.classList.toggle('active', i === index));
            caption.textContent = images[index]?.alt || '';
        };

        // Navigation handlers
        if (hasMultiple) {
            lightbox.querySelector('.lightbox-prev').addEventListener('click', (e) => {
                e.stopPropagation();
                showSlide(currentIndex - 1);
            });
            lightbox.querySelector('.lightbox-next').addEventListener('click', (e) => {
                e.stopPropagation();
                showSlide(currentIndex + 1);
            });
            dots.forEach((dot, i) => {
                dot.addEventListener('click', (e) => {
                    e.stopPropagation();
                    showSlide(i);
                });
            });
        }

        // Close handlers
        lightbox.querySelector('.lightbox-backdrop').addEventListener('click', () => this.closeLightbox());
        lightbox.querySelector('.lightbox-close').addEventListener('click', () => this.closeLightbox());

        // Keyboard navigation
        const keyHandler = (e) => {
            if (!lightbox.classList.contains('open')) return;
            if (e.key === 'Escape') this.closeLightbox();
            if (e.key === 'ArrowLeft' && hasMultiple) showSlide(currentIndex - 1);
            if (e.key === 'ArrowRight' && hasMultiple) showSlide(currentIndex + 1);
        };
        document.addEventListener('keydown', keyHandler);
        lightbox._keyHandler = keyHandler;

        // Open
        lightbox.classList.add('open');
        document.body.style.overflow = 'hidden';
    }

    /**
     * Lightbox schließen
     */
    closeLightbox() {
        const lightbox = document.getElementById('imageLightbox');
        if (lightbox) {
            lightbox.classList.remove('open');
            document.body.style.overflow = '';
            // Clean up key handler
            if (lightbox._keyHandler) {
                document.removeEventListener('keydown', lightbox._keyHandler);
            }
        }
    }

    closePanel() {
        this.detailPanel.classList.remove('open');
        // Re-center after sidebar closes
        setTimeout(() => this.centerView(), 350);
    }

    /**
     * View zentrieren auf aktiven Node
     * Berücksichtigt Sidebar wenn offen
     */
    centerView() {
        const sidebarOpen = this.detailPanel.classList.contains('open');

        // Responsive sidebar width
        let sidebarWidth = 0;
        if (sidebarOpen) {
            if (window.innerWidth <= 768) {
                sidebarWidth = 0; // Full overlay on mobile, don't adjust
            } else if (window.innerWidth <= 900) {
                sidebarWidth = 320;
            } else if (window.innerWidth <= 1200) {
                sidebarWidth = 350;
            } else {
                sidebarWidth = 380;
            }
        }

        // Get active node position, fallback to canvas center
        let targetX = this.centerX;
        let targetY = this.centerY;

        const activePos = this.nodePositions.get(this.activeNodeId);
        if (activePos) {
            targetX = activePos.x;
            targetY = activePos.y;
        }

        // Verfügbare Breite ist Window minus Sidebar
        const availableWidth = window.innerWidth - sidebarWidth;
        const viewportHeight = this.viewport.clientHeight;

        // Zentriere auf aktiven Node im verfügbaren Bereich
        const targetScrollX = (targetX * this.zoom) - (availableWidth / 2);
        const targetScrollY = (targetY * this.zoom) - (viewportHeight / 2);

        // Smooth scroll
        this.viewport.scrollTo({
            left: targetScrollX,
            top: targetScrollY,
            behavior: 'smooth'
        });
    }

    expandAll() {
        const addAll = (node) => {
            this.expandedNodes.add(node.id);
            if (node.children) {
                node.children.forEach(child => addAll(child));
            }
        };
        addAll(this.buildData());
        this.render();
    }

    collapseAll() {
        this.expandedNodes.clear();
        this.expandedNodes.add('root');
        this.render();
    }

    setZoom(level) {
        this.zoom = Math.max(this.minZoom, Math.min(this.maxZoom, level));
        this.canvas.style.transform = `scale(${this.zoom})`;
        document.getElementById('zoomLevel').textContent = `${Math.round(this.zoom * 100)}%`;
    }

    // Drag handlers
    startDrag(e) {
        if (e.target.closest('.mindmap-node-box') || e.target.closest('.control-btn')) return;
        this.isDragging = true;
        this.dragStart = { x: e.clientX, y: e.clientY };
        this.scrollStart = { x: this.viewport.scrollLeft, y: this.viewport.scrollTop };
        this.viewport.style.cursor = 'grabbing';
    }

    drag(e) {
        if (!this.isDragging) return;
        this.viewport.scrollLeft = this.scrollStart.x - (e.clientX - this.dragStart.x);
        this.viewport.scrollTop = this.scrollStart.y - (e.clientY - this.dragStart.y);
    }

    endDrag() {
        this.isDragging = false;
        this.viewport.style.cursor = 'grab';
    }

    // Tooltip
    showTooltip(text, event) {
        this.tooltip.textContent = text;
        this.tooltip.classList.add('visible');
        const rect = event.target.getBoundingClientRect();
        this.tooltip.style.left = `${rect.left + rect.width / 2 - this.tooltip.offsetWidth / 2}px`;
        this.tooltip.style.top = `${rect.bottom + 10}px`;
    }

    hideTooltip() {
        this.tooltip.classList.remove('visible');
    }

    updateTime() {
        const now = new Date();
        document.getElementById('currentTime').textContent = now.toLocaleTimeString('de-DE', {
            hour: '2-digit', minute: '2-digit', second: '2-digit'
        });
    }
}

// Additional icons
ICONS['tool'] = '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>';

// Start
document.addEventListener('DOMContentLoaded', () => {
    window.mindmapView = new MindmapView();
});
