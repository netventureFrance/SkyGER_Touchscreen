/**
 * Sky Touchscreen - Mindmap View
 * Radiale Mindmap-Darstellung mit zentralem Node
 */

// HTML escape helper to prevent XSS
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

class MindmapView {
    constructor() {
        this.canvas = document.getElementById('mindmapCanvas');
        this.viewport = document.getElementById('mindmapViewport');
        this.nodesContainer = document.getElementById('mindmapNodes');
        this.linesContainer = document.getElementById('mindmapLines');
        this.detailPanel = document.getElementById('detailPanel');
        this.panelContent = document.getElementById('panelContent');
        this.tooltip = document.getElementById('tooltip');
        this.breadcrumbContainer = document.getElementById('breadcrumbContainer');

        // Canvas Größe (larger to accommodate expanded trees at high zoom)
        this.canvasWidth = 10000;
        this.canvasHeight = 8000;
        this.centerX = this.canvasWidth / 2;
        this.centerY = this.canvasHeight / 2;

        // State
        this.expandedNodes = new Set();
        this.nodePositions = new Map();
        this.activeNodeId = 'root'; // Track active/selected node
        this.zoom = 1;
        this.minZoom = 0.3;
        this.maxZoom = 1.5;
        this.isFullscreen = false;
        this.nodePath = []; // Path from root to current node for breadcrumbs

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
        // Load version number
        await this.loadVersion();

        // Try to load notion-data.json
        await this.loadNotionData();

        // Initial erweiterte Nodes
        this.expandedNodes.add('root');

        // Initialize selected node with root
        this.selectedNode = this.buildData();

        // Rendern
        this.render();

        // Initialize breadcrumbs
        this.updateBreadcrumbs();

        // Event Listeners
        this.setupEventListeners();

        // Zentrieren
        this.centerView();

        // Zeit
        this.updateTime();
        setInterval(() => this.updateTime(), 1000);
    }

    async loadVersion() {
        try {
            const response = await fetch('version.json');
            if (response.ok) {
                const version = await response.json();
                const versionStr = `V. ${version.major}.${version.minor}.${version.patch || 0}`;
                const versionEl = document.getElementById('versionNumber');
                if (versionEl) {
                    versionEl.textContent = versionStr;
                }
            }
        } catch (e) {
            console.log('Could not load version.json');
        }
    }

    async loadNotionData() {
        try {
            const response = await fetch('images/notion-data.json');
            if (response.ok) {
                const data = await response.json();
                // Recursively find "Sky Sport Design Bundesliga" node
                const findNode = (node, label) => {
                    if (node.label === label) return node;
                    if (node.children) {
                        for (const child of node.children) {
                            const found = findNode(child, label);
                            if (found) return found;
                        }
                    }
                    return null;
                };
                const touchNode = findNode(data, 'Touch Sport');
                if (touchNode) {
                    this.notionData = touchNode;
                    console.log('Loaded Notion data:', touchNode.children?.length, 'items');
                } else {
                    // Use root data if specific node not found
                    this.notionData = data;
                    console.log('Using root Notion data');
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
        document.getElementById('centerBtn').addEventListener('click', () => this.resetView());

        // Zoom
        document.getElementById('zoomInBtn').addEventListener('click', () => this.setZoom(this.zoom + 0.1));
        document.getElementById('zoomOutBtn').addEventListener('click', () => this.setZoom(this.zoom - 0.1));

        // Panel
        document.getElementById('panelClose').addEventListener('click', () => this.closePanel());

        // Sidebar toggle button
        const toggleBtn = document.getElementById('toggleSidebarBtn');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => this.toggleSidebar());
        }

        // Fullscreen button
        const fullscreenBtn = document.getElementById('fullscreenBtn');
        if (fullscreenBtn) {
            fullscreenBtn.addEventListener('click', () => this.toggleFullscreen());
        }

        // Keyboard
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                if (this.isFullscreen) this.toggleFullscreen();
                else this.closePanel();
            }
            if (e.key === 'i' || e.key === 'I') this.toggleSidebar();
            if (e.key === 'f' || e.key === 'F') this.toggleFullscreen();
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
            color: notionItem.color || null,
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

        // Render nodes with fixed distances
        this.renderNode(data, this.centerX, this.centerY, 0, null, 0, 360);

        // Draw lines after short delay
        setTimeout(() => this.drawLines(), 50);
    }

    /**
     * Node rendern
     */
    renderNode(node, x, y, level, parentPos, startAngle, endAngle, parentColor = null, parentId = null) {
        // Generate unique ID to avoid duplicates in Map
        const uniqueId = `${node.id}-${this.nodePositions.size}`;

        // Determine color - inherit from parent if not set
        const nodeColor = node.color || parentColor;

        // Position speichern with unique ID, color, and parent reference
        this.nodePositions.set(uniqueId, { x, y, level, parentPos, color: nodeColor, parentId });

        // Node Element erstellen
        const nodeEl = document.createElement('div');
        nodeEl.className = `mindmap-node level-${level} ${level === 0 ? 'root' : ''}`;
        nodeEl.dataset.id = uniqueId;
        nodeEl.style.left = `${x}px`;
        nodeEl.style.top = `${y}px`;
        nodeEl.style.animationDelay = `${level * 0.1}s`;

        // Node Box
        const boxEl = document.createElement('div');
        boxEl.className = 'mindmap-node-box';

        // Apply color if present (hex or Notion color name)
        if (nodeColor && nodeColor !== 'default') {
            if (nodeColor.startsWith('#')) {
                // Hex color - apply inline styles
                boxEl.style.background = `linear-gradient(135deg, ${nodeColor}CC, ${nodeColor}99)`;
                boxEl.style.borderColor = nodeColor;
                boxEl.style.boxShadow = `0 0 20px ${nodeColor}66`;
                boxEl.classList.add('custom-color');
                // Store color for active state enhancement
                boxEl.dataset.nodeColor = nodeColor;
            } else {
                // Notion color name - use CSS class
                boxEl.classList.add(`notion-${nodeColor}`);
            }
        }

        if (this.expandedNodes.has(node.id)) {
            boxEl.classList.add('expanded');
        }

        // Highlight active node (use uniqueId to avoid duplicate ID issues)
        if (this.activeNodeId === uniqueId) {
            boxEl.classList.add('active');
            // Enhance glow and background for custom-color nodes
            if (nodeColor && nodeColor.startsWith('#')) {
                boxEl.style.background = `linear-gradient(135deg, ${nodeColor}DD, ${nodeColor}BB)`;
                boxEl.style.boxShadow = `0 0 40px ${nodeColor}BB, inset 0 0 25px ${nodeColor}55`;
            }
        }

        // Label (no icon)
        const labelEl = document.createElement('span');
        labelEl.className = 'node-label';
        labelEl.textContent = node.label;

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
            this.handleNodeClick(node, uniqueId);
        });


        nodeEl.appendChild(boxEl);
        this.nodesContainer.appendChild(nodeEl);

        // Kinder rendern (wenn erweitert)
        if (node.children && node.children.length > 0 && this.expandedNodes.has(node.id)) {
            this.renderChildren(node, x, y, level, startAngle, endAngle, nodeColor, uniqueId);
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
    renderChildren(parentNode, parentX, parentY, parentLevel, startAngle, endAngle, parentColor = null, parentId = null) {
        const children = parentNode.children;
        const childLevel = parentLevel + 1;

        // Fixed distance - must be larger than widest node + gap
        const distance = 450;

        // Berechne Höhe jedes Kindes (inkl. Subtree)
        const childHeights = children.map(child => this.calculateSubtreeHeight(child, childLevel));
        const totalHeight = childHeights.reduce((sum, h) => sum + h, 0);

        // Start Y-Position (zentriert um Parent)
        let currentY = parentY - totalHeight / 2;

        // Child X position
        const childX = parentX + distance;

        children.forEach((child, index) => {
            // Y-Position: Mitte des zugewiesenen Bereichs
            const childHeight = childHeights[index];
            const finalY = currentY + childHeight / 2;

            this.renderNode(
                child, childX, finalY, childLevel,
                { x: parentX, y: parentY },
                startAngle, endAngle,
                parentColor, // Pass parent color for inheritance
                parentId // Pass parent ID for line drawing
            );

            // Nächste Y-Position
            currentY += childHeight;
        });
    }

    /**
     * Verbindungslinien zeichnen
     */
    drawLines() {
        // Set SVG viewBox to match canvas size
        this.linesContainer.setAttribute('viewBox', `0 0 ${this.canvasWidth} ${this.canvasHeight}`);
        this.linesContainer.setAttribute('width', this.canvasWidth);
        this.linesContainer.setAttribute('height', this.canvasHeight);

        let pathsHtml = '';

        this.nodePositions.forEach((pos, nodeId) => {
            if (pos.parentId) {
                const parentPos = this.nodePositions.get(pos.parentId);
                if (!parentPos) return;

                // Measure actual parent width from DOM (divide by zoom to get unscaled width)
                const parentEl = this.nodesContainer.querySelector(`[data-id="${pos.parentId}"] .mindmap-node-box`);
                const scaledWidth = parentEl ? parentEl.getBoundingClientRect().width : 180;
                const parentWidth = scaledWidth / this.zoom;

                // Calculate startX based on parent type
                // Root node is centered (transform: translate(-50%, -50%)) so position is CENTER
                // Other nodes have only translateY(-50%) so position is LEFT edge
                let startX;
                if (parentPos.level === 0) {
                    // Root node: position is center, so add half width to get right edge
                    startX = parentPos.x + (parentWidth / 2);
                } else {
                    // Non-root: position is left edge, so add full width to get right edge
                    startX = parentPos.x + parentWidth;
                }

                const startY = parentPos.y;
                const endX = pos.x;
                const endY = pos.y;

                const path = this.createBezierPath(startX, startY, endX, endY);

                // Apply color to path (hex or Notion color)
                let pathAttrs = `d="${path}" data-from="${nodeId}"`;
                if (pos.color && pos.color !== 'default') {
                    if (pos.color.startsWith('#')) {
                        pathAttrs += ` style="stroke: ${escapeHtml(pos.color)}"`;
                    } else {
                        pathAttrs += ` class="notion-${escapeHtml(pos.color)}"`;
                    }
                }
                pathsHtml += `<path ${pathAttrs} />`;
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
    handleNodeClick(node, uniqueId) {
        // Track active node using uniqueId to handle duplicate IDs
        this.activeNodeId = uniqueId;
        this.selectedNode = node; // Store for sidebar toggle

        if (node.children && node.children.length > 0) {
            if (this.expandedNodes.has(node.id)) {
                // Collapse: Auch alle Kinder schließen
                this.collapseNode(node);
            } else {
                this.expandedNodes.add(node.id);
            }
            this.render();
        } else {
            // For leaf nodes, just update the active highlighting
            this.updateActiveHighlight(uniqueId);
        }

        // Only update sidebar content if already open (don't auto-open)
        if (this.detailPanel.classList.contains('open')) {
            this.showDetail(node, uniqueId);
        }

        // Update breadcrumb navigation
        this.updateBreadcrumbs();
    }

    /**
     * Toggle sidebar open/closed
     */
    toggleSidebar() {
        if (this.detailPanel.classList.contains('open')) {
            this.closePanel();
        } else {
            // Open with current selected node
            if (this.selectedNode) {
                this.showDetail(this.selectedNode, this.activeNodeId);
            }
        }
    }

    /**
     * Update active highlight without full re-render
     */
    updateActiveHighlight(uniqueId) {
        // Remove active from all nodes and reset their styles
        this.nodesContainer.querySelectorAll('.mindmap-node-box.active').forEach(el => {
            el.classList.remove('active');
            // Reset to normal style if it has a custom color
            const nodeColor = el.dataset.nodeColor;
            if (nodeColor) {
                el.style.background = `linear-gradient(135deg, ${nodeColor}CC, ${nodeColor}99)`;
                el.style.boxShadow = `0 0 20px ${nodeColor}66`;
            }
        });

        // Add active to the selected node
        const nodeEl = this.nodesContainer.querySelector(`[data-id="${uniqueId}"] .mindmap-node-box`);
        if (nodeEl) {
            nodeEl.classList.add('active');
            // Enhance glow and background for custom-color nodes
            const nodeColor = nodeEl.dataset.nodeColor;
            if (nodeColor) {
                nodeEl.style.background = `linear-gradient(135deg, ${nodeColor}DD, ${nodeColor}BB)`;
                nodeEl.style.boxShadow = `0 0 40px ${nodeColor}BB, inset 0 0 25px ${nodeColor}55`;
            }
        }
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
    showDetail(node, currentUniqueId = null) {
        // Store reference to current node for child navigation
        this.currentDetailNode = node;

        let html = `<h2>${escapeHtml(node.label)}</h2>`;

        // Screenshots Carousel FIRST
        const screenshots = node.screenshots || [];
        if (screenshots.length > 0) {
            html += `
                <div class="screenshot-carousel" data-current="0">
                    <div class="carousel-container">
                        <div class="carousel-slides">
                            ${screenshots.map((img, i) => `
                                <div class="carousel-slide ${i === 0 ? 'active' : ''}" data-index="${i}">
                                    <img src="${escapeHtml(img.url || img)}" alt="${escapeHtml(img.name || node.label)}" loading="lazy">
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

        // Description AFTER screenshots
        if (node.description) {
            html += `<p class="panel-description">${escapeHtml(node.description)}</p>`;
        }

        // Kinder anzeigen
        if (node.children && node.children.length > 0) {
            html += `<h3>Unterelemente</h3><div class="panel-children">`;
            // Get parent color for inheritance
            const parentColor = node.color || null;
            node.children.forEach(child => {
                // Child uses its own color or inherits from parent
                const childColor = child.color || parentColor;
                const colorStyle = childColor ? `border-left: 3px solid ${childColor}; background: linear-gradient(90deg, ${childColor}22 0%, transparent 100%);` : '';
                const colorAttr = childColor ? `data-color="${escapeHtml(childColor)}"` : '';
                html += `
                    <div class="panel-child-item" data-id="${escapeHtml(child.id)}" data-label="${escapeHtml(child.label)}" ${colorAttr} style="${colorStyle}">
                        <span>${escapeHtml(child.label)}</span>
                    </div>
                `;
            });
            html += `</div>`;
        }

        this.panelContent.innerHTML = html;
        this.detailPanel.classList.add('open');

        // Highlight active sidebar item if matches current node
        this.updateSidebarHighlight(currentUniqueId);

        // Re-center mindmap in remaining space after sidebar animation
        setTimeout(() => this.centerView(), 350);

        // Carousel Event Handlers
        this.setupCarousel();

        // Child click handler - navigate to child node
        this.panelContent.querySelectorAll('.panel-child-item').forEach(item => {
            item.addEventListener('click', () => {
                const childId = item.dataset.id;
                const child = node.children.find(c => c.id === childId);
                if (child) {
                    this.navigateToNode(node, child);
                }
            });
        });
    }

    /**
     * Navigate to a child node from sidebar click
     */
    navigateToNode(parentNode, childNode) {
        // Expand parent to show child
        this.expandedNodes.add(parentNode.id);

        // Re-render to create the child nodes in canvas
        this.render();

        // Find the child's uniqueId in the rendered nodes
        const childUniqueId = this.findUniqueIdByNodeId(childNode.id);
        if (childUniqueId) {
            // Update active node
            this.activeNodeId = childUniqueId;

            // Highlight in canvas
            this.updateActiveHighlight(childUniqueId);

            // Show child's detail panel
            this.showDetail(childNode, childUniqueId);

            // Center on the child node
            setTimeout(() => this.centerView(), 100);
        }
    }

    /**
     * Find uniqueId by node.id in nodePositions
     */
    findUniqueIdByNodeId(nodeId) {
        for (const [uniqueId, pos] of this.nodePositions) {
            if (uniqueId.startsWith(nodeId + '-')) {
                return uniqueId;
            }
        }
        return null;
    }

    /**
     * Update sidebar highlight to match active node
     */
    updateSidebarHighlight(uniqueId) {
        // Remove all active states from sidebar items and reset their styles
        this.panelContent.querySelectorAll('.panel-child-item.active').forEach(el => {
            el.classList.remove('active');
            // Reset to normal style
            const color = el.dataset.color;
            if (color) {
                el.style.background = `linear-gradient(90deg, ${color}22 0%, transparent 100%)`;
                el.style.boxShadow = 'none';
            }
        });

        // If we have a uniqueId, try to highlight matching sidebar item
        if (uniqueId) {
            const nodeId = uniqueId.split('-')[0];
            const sidebarItem = this.panelContent.querySelector(`.panel-child-item[data-id="${nodeId}"]`);
            if (sidebarItem) {
                sidebarItem.classList.add('active');
                // Enhance with node's color
                const color = sidebarItem.dataset.color;
                if (color) {
                    sidebarItem.style.background = `linear-gradient(90deg, ${color}44 0%, ${color}11 100%)`;
                    sidebarItem.style.boxShadow = `inset 0 0 10px ${color}33`;
                }
            }
        }
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
                            <img src="${escapeHtml(img.src)}" alt="${escapeHtml(img.alt || '')}">
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
                <div class="lightbox-caption">${escapeHtml(images[startIndex]?.alt || '')}</div>
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
     * Reset view: zoom 100%, collapse all, center on root
     */
    resetView() {
        // Reset zoom to 100%
        this.setZoom(1);

        // Collapse all nodes
        this.collapseAll();

        // Reset active node to root (root is always first, so uniqueId is 'root-0')
        this.activeNodeId = 'root-0';

        // Close sidebar
        this.detailPanel.classList.remove('open');

        // Center on root after a short delay for render
        setTimeout(() => this.centerView(), 100);
    }

    /**
     * View zentrieren auf aktiven Node
     * Berücksichtigt Sidebar wenn offen und Zoom-Level
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

        // Direct lookup using uniqueId
        const activePos = this.nodePositions.get(this.activeNodeId);
        if (activePos) {
            targetX = activePos.x;
            targetY = activePos.y;
        }

        // Verfügbare Breite ist Window minus Sidebar
        const availableWidth = window.innerWidth - sidebarWidth;
        const viewportHeight = this.viewport.clientHeight;

        // Berechne Scroll-Position (transform-origin ist top-left)
        // Target position in scaled coordinates
        const scaledTargetX = targetX * this.zoom;
        const scaledTargetY = targetY * this.zoom;

        // Zentriere auf aktiven Node
        let targetScrollX = scaledTargetX - (availableWidth / 2);
        let targetScrollY = scaledTargetY - (viewportHeight / 2);

        // Berechne maximale Scroll-Werte basierend auf skalierter Canvas-Größe
        const scaledCanvasWidth = this.canvasWidth * this.zoom;
        const scaledCanvasHeight = this.canvasHeight * this.zoom;
        const maxScrollX = Math.max(0, scaledCanvasWidth - availableWidth);
        const maxScrollY = Math.max(0, scaledCanvasHeight - viewportHeight);

        // Clamp scroll values to valid range
        targetScrollX = Math.max(0, Math.min(targetScrollX, maxScrollX));
        targetScrollY = Math.max(0, Math.min(targetScrollY, maxScrollY));

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
        const oldZoom = this.zoom;
        this.zoom = Math.max(this.minZoom, Math.min(this.maxZoom, level));

        // Only update if zoom actually changed
        if (this.zoom !== oldZoom) {
            this.canvas.style.transform = `scale(${this.zoom})`;
            document.getElementById('zoomLevel').textContent = `${Math.round(this.zoom * 100)}%`;

            // Redraw lines with correct measurements for new zoom
            this.drawLines();

            // Recenter view after zoom change
            setTimeout(() => this.centerView(), 50);
        }
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

    /**
     * Toggle fullscreen mode
     */
    toggleFullscreen() {
        this.isFullscreen = !this.isFullscreen;
        document.body.classList.toggle('fullscreen', this.isFullscreen);

        // Update button icon
        const btn = document.getElementById('fullscreenBtn');
        if (btn) {
            const span = btn.querySelector('span');
            if (span) {
                span.textContent = this.isFullscreen ? 'Beenden' : 'Vollbild';
            }
        }

        // Recenter after layout change
        setTimeout(() => this.centerView(), 350);
    }

    /**
     * Find path from root to a node
     */
    findPathToNode(targetId, node = null, path = []) {
        if (!node) {
            node = this.buildData();
        }

        const currentPath = [...path, { id: node.id, label: node.label, node: node }];

        if (node.id === targetId || this.activeNodeId?.startsWith(node.id + '-')) {
            return currentPath;
        }

        if (node.children) {
            for (const child of node.children) {
                const result = this.findPathToNode(targetId, child, currentPath);
                if (result) return result;
            }
        }

        return null;
    }

    /**
     * Update breadcrumb navigation
     */
    updateBreadcrumbs() {
        if (!this.breadcrumbContainer || !this.selectedNode) return;

        // Find path to selected node
        const nodeId = this.selectedNode.id;
        const path = this.findPathToNode(nodeId);

        if (!path || path.length === 0) return;

        this.nodePath = path;

        // Build breadcrumb HTML
        let html = '';
        path.forEach((item, index) => {
            const isLast = index === path.length - 1;
            const isFirst = index === 0;

            if (!isFirst) {
                html += '<span class="breadcrumb-separator">›</span>';
            }

            html += `<span class="breadcrumb-item${isLast ? ' active' : ''}" data-id="${escapeHtml(item.id)}" data-index="${index}">${escapeHtml(item.label)}</span>`;
        });

        this.breadcrumbContainer.innerHTML = html;

        // Add click handlers
        this.breadcrumbContainer.querySelectorAll('.breadcrumb-item:not(.active)').forEach(item => {
            item.addEventListener('click', () => {
                const index = parseInt(item.dataset.index);
                const pathItem = this.nodePath[index];
                if (pathItem && pathItem.node) {
                    // Navigate to this node
                    this.selectedNode = pathItem.node;
                    this.activeNodeId = pathItem.id + '-0';

                    // Expand path to this node, collapse everything else
                    this.expandedNodes.clear();
                    for (let i = 0; i <= index; i++) {
                        this.expandedNodes.add(this.nodePath[i].id);
                    }

                    this.render();
                    this.updateBreadcrumbs();

                    // Center view on the selected node
                    setTimeout(() => this.centerView(), 100);

                    // Update sidebar if open
                    if (this.detailPanel.classList.contains('open')) {
                        this.showDetail(pathItem.node, this.activeNodeId);
                    }
                }
            });
        });
    }
}

// Additional icons
ICONS['tool'] = '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>';

// Start
document.addEventListener('DOMContentLoaded', () => {
    window.mindmapView = new MindmapView();
});
