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

    init() {
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
     */
    buildData() {
        return {
            id: 'root',
            label: 'Sky Touchscreen',
            icon: 'grid',
            description: 'Komplettes RCS Touch System',
            children: [
                {
                    id: 'rcs-touch',
                    label: 'RCS Touch',
                    icon: 'layout',
                    description: 'Hauptsystem für Live-TV',
                    children: SKY_DATA.mainMenu.slice(0, 5) // Erste 5 Items
                },
                {
                    id: 'rcs-tools',
                    label: 'Tools',
                    icon: 'tool',
                    description: 'Weitere RCS Tools',
                    children: SKY_DATA.mainMenu.slice(5) // Rest der Items
                },
                {
                    id: 'shows',
                    label: 'Shows',
                    icon: 'flag',
                    description: 'Wettbewerbe',
                    children: SKY_DATA.shows
                },
                {
                    id: 'aki-paint',
                    label: 'AKI Paint',
                    icon: 'edit-2',
                    description: SKY_DATA.akiPaint.description,
                    children: SKY_DATA.akiPaint.sports
                },
                {
                    id: 'data-sources',
                    label: 'Daten',
                    icon: 'database',
                    description: 'Datenquellen',
                    children: SKY_DATA.dataSources
                }
            ]
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

        // Seite bestimmen (links oder rechts vom Center)
        if (x < this.centerX) {
            nodeEl.classList.add('left');
        }

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
     * Kinder-Nodes rendern - Horizontales Layout
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

        // Vertikaler Abstand zwischen Kindern
        const verticalSpacing = this.config.minNodeSpacing;

        // Berechne die Gesamthöhe aller Kinder
        const totalHeight = (children.length - 1) * verticalSpacing;
        const startY = parentY - totalHeight / 2;

        // Bestimme ob links oder rechts vom Parent
        const isRightSide = parentX >= this.centerX || parentLevel === 0;
        const direction = isRightSide ? 1 : -1;

        children.forEach((child, index) => {
            // Position berechnen
            const x = parentX + distance * direction;
            const y = startY + index * verticalSpacing;

            // Für Level 1: Abwechselnd links und rechts
            let finalX = x;
            let finalY = y;

            if (parentLevel === 0) {
                // Root-Kinder: Verteile auf beide Seiten
                const halfCount = Math.ceil(children.length / 2);
                if (index < halfCount) {
                    // Rechte Seite
                    finalX = parentX + distance;
                    finalY = parentY - ((halfCount - 1) * verticalSpacing / 2) + index * verticalSpacing;
                } else {
                    // Linke Seite
                    finalX = parentX - distance;
                    const leftIndex = index - halfCount;
                    const leftCount = children.length - halfCount;
                    finalY = parentY - ((leftCount - 1) * verticalSpacing / 2) + leftIndex * verticalSpacing;
                }
            }

            this.renderNode(
                child, finalX, finalY, childLevel,
                { x: parentX, y: parentY },
                startAngle, endAngle
            );
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
            html += `<p>${node.description}</p>`;
        }

        html += `
            <h3>Informationen</h3>
            <ul>
                <li><strong>ID:</strong> ${node.id}</li>
                <li><strong>Icon:</strong> ${node.icon}</li>
                ${node.children ? `<li><strong>Unterelemente:</strong> ${node.children.length}</li>` : ''}
            </ul>
        `;

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

        // Child click handler
        this.panelContent.querySelectorAll('.panel-child-item').forEach(item => {
            item.addEventListener('click', () => {
                this.expandedNodes.add(node.id);
                this.render();
            });
        });
    }

    closePanel() {
        this.detailPanel.classList.remove('open');
    }

    /**
     * View zentrieren
     */
    centerView() {
        const viewportWidth = this.viewport.clientWidth;
        const viewportHeight = this.viewport.clientHeight;

        this.viewport.scrollLeft = (this.centerX * this.zoom) - viewportWidth / 2;
        this.viewport.scrollTop = (this.centerY * this.zoom) - viewportHeight / 2;
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
