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
        this.breadcrumbBar = document.getElementById('breadcrumbBar');
        this.breadcrumbContainer = document.getElementById('breadcrumbContainer');

        // Minimap elements
        this.minimap = document.getElementById('minimap');
        this.minimapCanvas = document.getElementById('minimapCanvas');
        this.minimapCtx = this.minimapCanvas ? this.minimapCanvas.getContext('2d') : null;
        this.minimapViewport = document.getElementById('minimapViewport');
        this.minimapContent = document.getElementById('minimapContent');

        // Search elements
        this.searchInput = document.getElementById('searchInput');
        this.searchResults = document.getElementById('searchResults');
        this.searchClear = document.getElementById('searchClear');
        this.searchSelectedIndex = -1;

        // Canvas Größe (will be adjusted dynamically based on content)
        this.canvasWidth = 20000;
        this.canvasHeight = 16000;
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
        this.isMobile = window.innerWidth <= 768;
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

        // Minimap setup
        this.setupMinimap();

        // Search setup
        this.setupSearch();

        // Deep linking setup
        this.setupDeepLinking();

        // Zentrieren
        this.centerView();

        // Mobile detection and initial zoom
        this.isMobile = window.innerWidth <= 768;
        if (this.isMobile) {
            this.setZoom(0.6);
        }

        // Zeit
        this.updateTime();
        setInterval(() => this.updateTime(), 1000);

        // Version check every 60 seconds
        setInterval(() => this.checkForNewVersion(), 60000);
    }

    async loadVersion() {
        try {
            const response = await fetch('version.json');
            if (response.ok) {
                const version = await response.json();
                // Store current version for comparison
                this.currentVersion = {
                    major: version.major,
                    minor: version.minor
                };
                const versionStr = `V. ${version.major}.${version.minor}`;
                const versionEl = document.getElementById('versionNumber');
                if (versionEl) {
                    versionEl.textContent = versionStr;
                }
            }
        } catch (e) {
            console.log('Could not load version.json');
        }
    }

    async checkForNewVersion() {
        if (!this.currentVersion) return;

        try {
            // Add cache-busting parameter to ensure fresh fetch
            const response = await fetch(`version.json?t=${Date.now()}`);
            if (response.ok) {
                const serverVersion = await response.json();

                // Compare versions
                const isNewer =
                    serverVersion.major > this.currentVersion.major ||
                    (serverVersion.major === this.currentVersion.major &&
                     serverVersion.minor > this.currentVersion.minor);

                if (isNewer) {
                    this.showVersionNotification(serverVersion);
                }
            }
        } catch (e) {
            // Silent fail - don't disrupt user
        }
    }

    showVersionNotification(newVersion) {
        // Don't show multiple times
        if (document.getElementById('versionNotification')) return;

        const notification = document.createElement('div');
        notification.id = 'versionNotification';
        notification.className = 'version-notification';
        notification.innerHTML = `
            <div class="version-notification-content">
                <span class="version-notification-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"/>
                        <line x1="12" y1="8" x2="12" y2="12"/>
                        <line x1="12" y1="16" x2="12.01" y2="16"/>
                    </svg>
                </span>
                <span class="version-notification-text">
                    Neue Version ${newVersion.major}.${newVersion.minor} verfügbar!
                </span>
                <button class="version-notification-btn" onclick="location.reload()">
                    Neu laden
                </button>
                <button class="version-notification-close" onclick="this.parentElement.parentElement.remove()">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="6" x2="6" y2="18"/>
                        <line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                </button>
            </div>
        `;
        document.body.appendChild(notification);
    }

    async loadNotionData() {
        try {
            const response = await fetch('images/notion-data.json');
            if (response.ok) {
                const data = await response.json();
                // Use first child as root (skips the Notion page title level)
                if (data.children && data.children.length > 0) {
                    this.notionData = data.children[0];
                    console.log('Loaded Notion data:', this.notionData.label, '-', this.notionData.children?.length, 'items');
                } else {
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

        // Fullscreen floating controls
        const fsZoomIn = document.getElementById('fsZoomInBtn');
        const fsZoomOut = document.getElementById('fsZoomOutBtn');
        const fsCenter = document.getElementById('fsCenterBtn');
        const fsExit = document.getElementById('fsExitBtn');
        if (fsZoomIn) fsZoomIn.addEventListener('click', () => this.setZoom(this.zoom + 0.1));
        if (fsZoomOut) fsZoomOut.addEventListener('click', () => this.setZoom(this.zoom - 0.1));
        if (fsCenter) fsCenter.addEventListener('click', () => this.centerView());
        if (fsExit) fsExit.addEventListener('click', () => this.toggleFullscreen());

        // Mobile floating controls
        const mobileZoomIn = document.getElementById('mobileZoomInBtn');
        const mobileZoomOut = document.getElementById('mobileZoomOutBtn');
        const mobileCenter = document.getElementById('mobileCenterBtn');
        if (mobileZoomIn) mobileZoomIn.addEventListener('click', () => this.setZoom(this.zoom + 0.1));
        if (mobileZoomOut) mobileZoomOut.addEventListener('click', () => this.setZoom(this.zoom - 0.1));
        if (mobileCenter) mobileCenter.addEventListener('click', () => this.resetView());

        // Keyboard
        document.addEventListener('keydown', (e) => {
            // Ignore shortcuts when typing in input fields
            const isTyping = e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA';

            if (e.key === 'Escape') {
                // Browser handles ESC for fullscreen, just close panel if not fullscreen
                if (!document.fullscreenElement) this.closePanel();
            }
            // Only trigger shortcuts when not typing
            if (!isTyping) {
                if (e.key === 'i' || e.key === 'I') this.toggleSidebar();
                if (e.key === 'f' || e.key === 'F') this.toggleFullscreen();
                if (e.key === 'm' || e.key === 'M') this.toggleMinimap();
            }
        });

        // Sync state when browser exits fullscreen (e.g., user presses ESC)
        document.addEventListener('fullscreenchange', () => {
            if (!document.fullscreenElement && this.isFullscreen) {
                this.isFullscreen = false;
                document.body.classList.remove('fullscreen');
                this.updateFullscreenButton();
                setTimeout(() => this.centerView(), 350);
            }
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
        window.addEventListener('resize', () => {
            this.isMobile = window.innerWidth <= 768;
            this.render();
        });
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
            direction: notionItem.direction || null, // 'left', 'right', or null
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

        // Fade out for smooth transition
        this.canvas.classList.add('transitioning');

        // Wait for fade out, then render everything together
        requestAnimationFrame(() => {
            // Clear
            this.nodesContainer.innerHTML = '';
            this.linesContainer.innerHTML = '';
            this.nodePositions.clear();
            if (this.nodeWidthCache) this.nodeWidthCache.clear();

            // Render nodes with fixed distances
            this.renderNode(data, this.centerX, this.centerY, 0, null, 0, 360);

            // Adjust canvas size if needed
            this.adjustCanvasSize();

            // Draw lines immediately after nodes
            requestAnimationFrame(() => {
                this.drawLines();

                // Fade in together
                requestAnimationFrame(() => {
                    this.canvas.classList.remove('transitioning');
                    // Update minimap after visible
                    this.updateMinimap();
                });
            });
        });
    }

    /**
     * Adjust canvas size to fit all nodes with padding
     */
    adjustCanvasSize() {
        if (this.nodePositions.size === 0) return;

        // Find bounds of all nodes
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        this.nodePositions.forEach((pos) => {
            minX = Math.min(minX, pos.x);
            minY = Math.min(minY, pos.y);
            maxX = Math.max(maxX, pos.x);
            maxY = Math.max(maxY, pos.y);
        });

        // Add padding (nodes need space for their width/height)
        const padding = 1000;
        const requiredWidth = (maxX - minX) + padding * 2;
        const requiredHeight = (maxY - minY) + padding * 2;

        // Only resize if content exceeds current size
        // We need the center to stay at centerX, centerY
        const neededLeft = this.centerX - (this.centerX - minX) - padding;
        const neededTop = this.centerY - (this.centerY - minY) - padding;
        const neededRight = maxX + padding;
        const neededBottom = maxY + padding;

        let needsResize = false;

        if (neededLeft < 0 || neededTop < 0 || neededRight > this.canvasWidth || neededBottom > this.canvasHeight) {
            // Calculate new canvas size to fit all content
            const newWidth = Math.max(this.canvasWidth, neededRight - Math.min(0, neededLeft) + padding);
            const newHeight = Math.max(this.canvasHeight, neededBottom - Math.min(0, neededTop) + padding);

            this.canvasWidth = newWidth;
            this.canvasHeight = newHeight;

            // Update CSS
            this.canvas.style.minWidth = `${newWidth}px`;
            this.canvas.style.minHeight = `${newHeight}px`;

            needsResize = true;
        }

        return needsResize;
    }

    /**
     * Smooth render with fade transition
     * Returns a Promise that resolves when render and centering are complete
     * @param {string} pathId - Path-based unique ID to center on after render
     */
    smoothRender(pathId = null) {
        return new Promise((resolve) => {
            // Fade out
            this.canvas.classList.add('transitioning');

            // Wait for fade out, then render
            setTimeout(() => {
                // Update activeNodeId if provided (before render so centering works)
                if (pathId) {
                    this.activeNodeId = pathId;
                }

                // Render nodes (this populates nodePositions)
                const data = this.buildData();
                this.nodesContainer.innerHTML = '';
                this.linesContainer.innerHTML = '';
                this.nodePositions.clear();
                if (this.nodeWidthCache) this.nodeWidthCache.clear();
                this.renderNode(data, this.centerX, this.centerY, 0, null, 0, 360);

                // Adjust canvas size if needed
                this.adjustCanvasSize();

                // Draw lines after nodes are in DOM
                requestAnimationFrame(() => {
                    this.drawLines();

                    // Center view
                    this.centerViewInstant();

                    // Update minimap
                    this.updateMinimap();

                    // Fade back in
                    requestAnimationFrame(() => {
                        this.canvas.classList.remove('transitioning');
                        resolve();
                    });
                });
            }, 150); // Match CSS transition time
        });
    }

    /**
     * Center view instantly (no smooth scroll) - used during transitions
     */
    centerViewInstant() {
        const sidebarOpen = this.detailPanel.classList.contains('open');

        let sidebarWidth = 0;
        if (sidebarOpen) {
            if (window.innerWidth <= 768) {
                sidebarWidth = 0;
            } else if (window.innerWidth <= 900) {
                sidebarWidth = 320;
            } else if (window.innerWidth <= 1200) {
                sidebarWidth = 350;
            } else {
                sidebarWidth = 380;
            }
        }

        let targetX = this.centerX;
        let targetY = this.centerY;

        const activePos = this.nodePositions.get(this.activeNodeId);
        if (activePos) {
            targetX = activePos.x;
            targetY = activePos.y;
        }

        const availableWidth = window.innerWidth - sidebarWidth;
        const viewportHeight = this.viewport.clientHeight;

        const scaledTargetX = targetX * this.zoom;
        const scaledTargetY = targetY * this.zoom;

        let targetScrollX = scaledTargetX - (availableWidth / 2);
        let targetScrollY = scaledTargetY - (viewportHeight / 2);

        const scaledCanvasWidth = this.canvasWidth * this.zoom;
        const scaledCanvasHeight = this.canvasHeight * this.zoom;
        const maxScrollX = Math.max(0, scaledCanvasWidth - availableWidth);
        const maxScrollY = Math.max(0, scaledCanvasHeight - viewportHeight);

        targetScrollX = Math.max(0, Math.min(targetScrollX, maxScrollX));
        targetScrollY = Math.max(0, Math.min(targetScrollY, maxScrollY));

        // Instant scroll (no animation - the fade handles the visual transition)
        this.viewport.scrollLeft = targetScrollX;
        this.viewport.scrollTop = targetScrollY;
    }

    /**
     * Node rendern
     * @param {string} pathId - Stable path-based ID (e.g., "root", "root-0", "root-0-2")
     * @param {string} direction - 'left' or null (right is default)
     */
    renderNode(node, x, y, level, parentPos, startAngle, endAngle, parentColor = null, parentId = null, pathId = 'root', direction = null) {
        // Use path-based ID for stable identification across renders
        const uniqueId = pathId;

        // Determine color - inherit from parent if not set
        const nodeColor = node.color || parentColor;

        // Determine direction - use node's own direction or passed direction
        const nodeDirection = node.direction || direction;

        // Position speichern with unique ID, color, direction, and parent reference
        this.nodePositions.set(uniqueId, { x, y, level, parentPos, color: nodeColor, parentId, direction: nodeDirection });

        // Node Element erstellen
        const nodeEl = document.createElement('div');
        nodeEl.className = `mindmap-node level-${level} ${level === 0 ? 'root' : ''} ${nodeDirection === 'left' ? 'direction-left' : ''}`;
        nodeEl.dataset.id = uniqueId;
        nodeEl.style.left = `${x}px`;
        nodeEl.style.top = `${y}px`;

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

        if (this.expandedNodes.has(uniqueId)) {
            boxEl.classList.add('expanded');
        }
        // Side-specific expansion classes for dual-side nodes
        if (this.expandedNodes.has(uniqueId + ':L')) {
            boxEl.classList.add('expanded-left');
        }
        if (this.expandedNodes.has(uniqueId + ':R')) {
            boxEl.classList.add('expanded-right');
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

        // Check if node has children on both sides
        if (node.children && node.children.length > 0) {
            // Count left and right children (children inherit parent direction unless specified)
            let leftCount = 0;
            let rightCount = 0;
            node.children.forEach(child => {
                const childDir = child.direction || nodeDirection;
                if (childDir === 'left') {
                    leftCount++;
                } else {
                    rightCount++;
                }
            });

            const hasBothSides = leftCount > 0 && rightCount > 0;

            if (hasBothSides) {
                // Mark as dual-side node for special handling
                boxEl.dataset.dualSide = 'true';

                // Show indicators on both sides
                // Left indicator
                const leftToggle = document.createElement('div');
                leftToggle.className = 'node-toggle left-indicator';
                leftToggle.innerHTML = `<svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/></svg>`;

                // Left toggle click handler - on mobile toggle both, on desktop toggle left only
                leftToggle.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (this.isMobile) {
                        this.handleDualSideToggle(node, uniqueId);
                    } else {
                        this.handleSideToggle(node, uniqueId, 'left');
                    }
                });

                const leftCountEl = document.createElement('span');
                leftCountEl.className = 'node-count left-indicator';
                leftCountEl.textContent = leftCount;

                // Left count click handler - on mobile toggle both, on desktop toggle left only
                leftCountEl.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (this.isMobile) {
                        this.handleDualSideToggle(node, uniqueId);
                    } else {
                        this.handleSideToggle(node, uniqueId, 'left');
                    }
                });

                // Left count hover - highlight left indicator
                leftCountEl.addEventListener('mouseenter', () => {
                    leftToggle.classList.add('hover-highlight');
                });
                leftCountEl.addEventListener('mouseleave', () => {
                    leftToggle.classList.remove('hover-highlight');
                });

                boxEl.appendChild(leftToggle);
                boxEl.appendChild(leftCountEl);
                boxEl.appendChild(labelEl);

                // Right indicator
                const rightCountEl = document.createElement('span');
                rightCountEl.className = 'node-count';
                rightCountEl.textContent = rightCount;

                const rightToggle = document.createElement('div');
                rightToggle.className = 'node-toggle';
                rightToggle.innerHTML = `<svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/></svg>`;

                // Right toggle click handler - on mobile toggle both, on desktop toggle right only
                rightToggle.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (this.isMobile) {
                        this.handleDualSideToggle(node, uniqueId);
                    } else {
                        this.handleSideToggle(node, uniqueId, 'right');
                    }
                });

                // Right count click handler - on mobile toggle both, on desktop toggle right only
                rightCountEl.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (this.isMobile) {
                        this.handleDualSideToggle(node, uniqueId);
                    } else {
                        this.handleSideToggle(node, uniqueId, 'right');
                    }
                });

                // Right count hover - highlight right indicator
                rightCountEl.addEventListener('mouseenter', () => {
                    rightToggle.classList.add('hover-highlight');
                });
                rightCountEl.addEventListener('mouseleave', () => {
                    rightToggle.classList.remove('hover-highlight');
                });

                boxEl.appendChild(rightCountEl);
                boxEl.appendChild(rightToggle);

                // Store toggle references for hover effects
                boxEl._leftToggle = leftToggle;
                boxEl._rightToggle = rightToggle;
            } else {
                // Single side - show indicator on appropriate side
                const countEl = document.createElement('span');
                countEl.className = 'node-count';
                countEl.textContent = node.children.length;

                const toggleEl = document.createElement('div');
                toggleEl.className = 'node-toggle';
                toggleEl.innerHTML = `<svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/></svg>`;

                // For left-side nodes, prepend indicator before label
                if (nodeDirection === 'left') {
                    toggleEl.classList.add('left-indicator');
                    countEl.classList.add('left-indicator');
                    boxEl.appendChild(toggleEl);
                    boxEl.appendChild(countEl);
                    boxEl.appendChild(labelEl);
                } else {
                    boxEl.appendChild(labelEl);
                    boxEl.appendChild(countEl);
                    boxEl.appendChild(toggleEl);
                }
            }
        } else {
            // Leaf nodes: just the label
            boxEl.appendChild(labelEl);
        }

        // Events - for dual-side nodes, box click toggles both sides
        boxEl.addEventListener('click', (e) => {
            e.stopPropagation();
            if (boxEl.dataset.dualSide === 'true') {
                this.handleDualSideToggle(node, uniqueId);
            } else {
                this.handleNodeClick(node, uniqueId);
            }
        });

        // Hover effects for dual-side nodes - highlight both toggles
        if (boxEl.dataset.dualSide === 'true') {
            boxEl.addEventListener('mouseenter', () => {
                if (boxEl._leftToggle) boxEl._leftToggle.classList.add('hover-highlight');
                if (boxEl._rightToggle) boxEl._rightToggle.classList.add('hover-highlight');
            });
            boxEl.addEventListener('mouseleave', () => {
                if (boxEl._leftToggle) boxEl._leftToggle.classList.remove('hover-highlight');
                if (boxEl._rightToggle) boxEl._rightToggle.classList.remove('hover-highlight');
            });
        }

        nodeEl.appendChild(boxEl);
        this.nodesContainer.appendChild(nodeEl);

        // Kinder rendern (wenn erweitert)
        // For dual-side nodes, check if either side is expanded
        const isDualSide = boxEl.dataset.dualSide === 'true';
        const isExpanded = isDualSide
            ? (this.expandedNodes.has(uniqueId + ':L') || this.expandedNodes.has(uniqueId + ':R'))
            : this.expandedNodes.has(uniqueId);

        if (node.children && node.children.length > 0 && isExpanded) {
            this.renderChildren(node, x, y, level, startAngle, endAngle, nodeColor, uniqueId, nodeDirection, isDualSide);
        }
    }

    /**
     * Berechne die Höhe eines Subtrees (für Spacing)
     * @param {string} pathId - Path-based ID for this node
     */
    calculateSubtreeHeight(node, level, pathId = 'root') {
        if (!node.children || node.children.length === 0 || !this.expandedNodes.has(pathId)) {
            return this.config.minNodeSpacing;
        }

        let totalHeight = 0;
        for (let i = 0; i < node.children.length; i++) {
            const child = node.children[i];
            const childPathId = `${pathId}-${i}`;
            totalHeight += this.calculateSubtreeHeight(child, level + 1, childPathId);
        }

        return Math.max(totalHeight, this.config.minNodeSpacing);
    }

    /**
     * Kinder-Nodes rendern - Links oder Rechts basierend auf direction
     * @param {string} parentPathId - Parent's path-based ID for generating child pathIds
     * @param {string} inheritedDirection - Direction inherited from parent ('left' or null)
     * @param {boolean} isDualSide - Whether parent is a dual-side node
     */
    renderChildren(parentNode, parentX, parentY, parentLevel, startAngle, endAngle, parentColor = null, parentId = null, inheritedDirection = null, isDualSide = false) {
        const children = parentNode.children;
        const childLevel = parentLevel + 1;

        // Extract parentPathId from parentId (which is now the uniqueId/pathId)
        const parentPathId = parentId;

        // Fixed distance - must be larger than widest node + gap
        const distance = 450;

        // For dual-side nodes, check which sides are expanded
        const renderLeft = isDualSide ? this.expandedNodes.has(parentId + ':L') : true;
        const renderRight = isDualSide ? this.expandedNodes.has(parentId + ':R') : true;

        // Separate children by direction
        // Children inherit parent's direction unless they specify their own
        const leftChildren = [];
        const rightChildren = [];
        children.forEach((child, index) => {
            const childDirection = child.direction || inheritedDirection;
            if (childDirection === 'left') {
                leftChildren.push({ child, index, direction: 'left' });
            } else {
                rightChildren.push({ child, index, direction: null });
            }
        });

        // Render right children (only if right side is expanded for dual-side nodes)
        if (rightChildren.length > 0 && renderRight) {
            const rightHeights = rightChildren.map(({ child, index }) => {
                const childPathId = `${parentPathId}-${index}`;
                return this.calculateSubtreeHeight(child, childLevel, childPathId);
            });
            const rightTotalHeight = rightHeights.reduce((sum, h) => sum + h, 0);
            let rightCurrentY = parentY - rightTotalHeight / 2;

            rightChildren.forEach(({ child, index }, i) => {
                const childHeight = rightHeights[i];
                const finalY = rightCurrentY + childHeight / 2;
                const childPathId = `${parentPathId}-${index}`;
                const childX = parentX + distance;

                this.renderNode(
                    child, childX, finalY, childLevel,
                    { x: parentX, y: parentY },
                    startAngle, endAngle,
                    parentColor,
                    parentId,
                    childPathId
                );
                rightCurrentY += childHeight;
            });
        }

        // Render left children (only if left side is expanded for dual-side nodes)
        if (leftChildren.length > 0 && renderLeft) {
            const leftHeights = leftChildren.map(({ child, index }) => {
                const childPathId = `${parentPathId}-${index}`;
                return this.calculateSubtreeHeight(child, childLevel, childPathId);
            });
            const leftTotalHeight = leftHeights.reduce((sum, h) => sum + h, 0);
            let leftCurrentY = parentY - leftTotalHeight / 2;

            leftChildren.forEach(({ child, index }, i) => {
                const childHeight = leftHeights[i];
                const finalY = leftCurrentY + childHeight / 2;
                const childPathId = `${parentPathId}-${index}`;
                const childX = parentX - distance; // Left side

                this.renderNode(
                    child, childX, finalY, childLevel,
                    { x: parentX, y: parentY },
                    startAngle, endAngle,
                    parentColor,
                    parentId,
                    childPathId,
                    'left' // Pass direction for line drawing
                );
                leftCurrentY += childHeight;
            });
        }
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

                // Get node widths - use cached values or measure from DOM
                // Cache prevents issues during zoom/transitions where getBoundingClientRect returns intermediate values
                let parentWidth = this.nodeWidthCache?.get(pos.parentId);
                let childWidth = this.nodeWidthCache?.get(nodeId);

                if (!parentWidth || !childWidth) {
                    // Initialize cache if needed
                    if (!this.nodeWidthCache) this.nodeWidthCache = new Map();

                    const parentEl = this.nodesContainer.querySelector(`[data-id="${pos.parentId}"] .mindmap-node-box`);
                    const childEl = this.nodesContainer.querySelector(`[data-id="${nodeId}"] .mindmap-node-box`);

                    if (parentEl && !parentWidth) {
                        parentWidth = parentEl.getBoundingClientRect().width / this.zoom;
                        this.nodeWidthCache.set(pos.parentId, parentWidth);
                    }
                    if (childEl && !childWidth) {
                        childWidth = childEl.getBoundingClientRect().width / this.zoom;
                        this.nodeWidthCache.set(nodeId, childWidth);
                    }
                }

                // Fallback to default width
                parentWidth = parentWidth || 180;
                childWidth = childWidth || 180;

                // Check if this is a left-positioned node
                const isLeft = pos.direction === 'left';
                const isParentLeft = parentPos.direction === 'left';

                // Calculate startX and endX based on direction
                // With translateX(-100%), left-side nodes have their right edge at pos.x
                let startX, endX;
                if (parentPos.level === 0) {
                    // Root node: position is center
                    if (isLeft) {
                        startX = parentPos.x - (parentWidth / 2); // Left edge of root
                    } else {
                        startX = parentPos.x + (parentWidth / 2); // Right edge of root
                    }
                } else if (isParentLeft) {
                    // Parent is a left-side node (uses translateX(-100%))
                    // Right edge is at parentPos.x, left edge is at parentPos.x - parentWidth
                    if (isLeft) {
                        startX = parentPos.x - parentWidth; // Left edge of left parent
                    } else {
                        startX = parentPos.x; // Right edge of left parent
                    }
                } else {
                    // Parent is a right-side node (position is left edge)
                    if (isLeft) {
                        startX = parentPos.x; // Left edge
                    } else {
                        startX = parentPos.x + parentWidth; // Right edge
                    }
                }

                // Child endpoint: right edge for left nodes, left edge for right nodes
                // With translateX(-100%), left-side nodes have right edge at pos.x
                endX = pos.x;

                const startY = parentPos.y;
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
        // Track active node using uniqueId (path-based) to handle duplicate node.ids
        this.activeNodeId = uniqueId;
        this.selectedNode = node; // Store for sidebar toggle

        // Update URL for deep linking
        this.updateUrl(uniqueId);

        if (node.children && node.children.length > 0) {
            if (this.expandedNodes.has(uniqueId)) {
                // Collapse: Auch alle Kinder schließen (use path-based ID)
                this.collapseNodeByPath(uniqueId);
            } else {
                this.expandedNodes.add(uniqueId);
            }

            // Use smooth render with fade transition
            this.smoothRender(uniqueId).then(() => {
                // Update sidebar and breadcrumbs after render completes
                if (this.detailPanel.classList.contains('open')) {
                    this.showDetail(node, this.activeNodeId);
                }
                this.updateBreadcrumbs();
            });
        } else {
            // For leaf nodes, just update the active highlighting and center smoothly
            this.updateActiveHighlight(uniqueId);

            // Update minimap to show new active node
            this.updateMinimap();

            // Update sidebar content if already open
            if (this.detailPanel.classList.contains('open')) {
                this.showDetail(node, this.activeNodeId);
            }

            // Update breadcrumb navigation
            this.updateBreadcrumbs();

            // Smooth center for leaf nodes
            setTimeout(() => this.centerView(), 50);
        }
    }

    /**
     * Handle side-specific toggle for dual-side nodes
     * @param {string} side - 'left' or 'right'
     */
    handleSideToggle(node, uniqueId, side) {
        // Track active node
        this.activeNodeId = uniqueId;
        this.selectedNode = node;
        this.updateUrl(uniqueId);

        const sideKey = uniqueId + ':' + (side === 'left' ? 'L' : 'R');

        if (this.expandedNodes.has(sideKey)) {
            // Collapse this side - also collapse children on this side
            this.collapseSide(uniqueId, side);
        } else {
            // Expand this side
            this.expandedNodes.add(sideKey);
        }

        // Use smooth render with fade transition
        this.smoothRender(uniqueId).then(() => {
            if (this.detailPanel.classList.contains('open')) {
                this.showDetail(node, this.activeNodeId);
            }
            this.updateBreadcrumbs();
        });
    }

    /**
     * Handle dual-side toggle (label click) - toggles both sides together
     */
    handleDualSideToggle(node, uniqueId) {
        // Track active node
        this.activeNodeId = uniqueId;
        this.selectedNode = node;
        this.updateUrl(uniqueId);

        const leftKey = uniqueId + ':L';
        const rightKey = uniqueId + ':R';
        const leftExpanded = this.expandedNodes.has(leftKey);
        const rightExpanded = this.expandedNodes.has(rightKey);

        if (leftExpanded || rightExpanded) {
            // At least one side is expanded - collapse both
            this.collapseSide(uniqueId, 'left');
            this.collapseSide(uniqueId, 'right');
        } else {
            // Both collapsed - expand both
            this.expandedNodes.add(leftKey);
            this.expandedNodes.add(rightKey);
        }

        // Use smooth render with fade transition
        this.smoothRender(uniqueId).then(() => {
            if (this.detailPanel.classList.contains('open')) {
                this.showDetail(node, this.activeNodeId);
            }
            this.updateBreadcrumbs();
        });
    }

    /**
     * Collapse a specific side of a dual-side node and its children
     */
    collapseSide(uniqueId, side) {
        const sideKey = uniqueId + ':' + (side === 'left' ? 'L' : 'R');
        this.expandedNodes.delete(sideKey);

        // Also collapse any children that were on this side
        // Children of a dual-side node will have paths starting with uniqueId-X
        // We need to identify which children are on which side
        const toRemove = [];
        for (const id of this.expandedNodes) {
            if (id.startsWith(uniqueId + '-') && !id.includes(':')) {
                // This is a child path - check if it's on the side being collapsed
                // We need to know the child index and check the direction
                // For simplicity, we'll remove all child expansions and let re-render handle it
                toRemove.push(id);
            }
            // Also remove any side-specific keys for children
            if (id.startsWith(uniqueId + '-') && id.includes(':')) {
                toRemove.push(id);
            }
        }
        toRemove.forEach(id => this.expandedNodes.delete(id));
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
     * Node und alle Kinder schließen (by path-based ID)
     * Removes all paths that start with the given pathId
     */
    collapseNodeByPath(pathId) {
        // Remove this node and all descendants (paths starting with this pathId)
        const toRemove = [];
        for (const id of this.expandedNodes) {
            if (id === pathId || id.startsWith(pathId + '-')) {
                toRemove.push(id);
            }
        }
        toRemove.forEach(id => this.expandedNodes.delete(id));
    }

    /**
     * Node und alle Kinder schließen (legacy - kept for compatibility)
     */
    collapseNode(node) {
        // This method is kept for compatibility but should use path-based collapse
        // Find all expanded paths that correspond to this node
        const toRemove = [];
        for (const id of this.expandedNodes) {
            // Check if this is a path for the given node (ends with the node.id segment)
            const segments = id.split('-');
            if (segments.includes(node.id)) {
                toRemove.push(id);
            }
        }
        toRemove.forEach(id => this.expandedNodes.delete(id));
    }

    /**
     * Generate breadcrumb HTML for given path
     * For sidebar: excludes current node (shown as title) and truncates from left
     */
    buildBreadcrumbHtml(path, forSidebar = false) {
        if (!path || path.length === 0) return '';

        let itemsToShow = path;
        let showEllipsis = false;

        if (forSidebar) {
            // Exclude last item (current node) - it's shown as the title
            itemsToShow = path.slice(0, -1);
            if (itemsToShow.length === 0) return ''; // Only root, no breadcrumb needed

            // Truncate from left if more than 3 parent items
            if (itemsToShow.length > 3) {
                itemsToShow = itemsToShow.slice(-3);
                showEllipsis = true;
            }
        }

        let html = '';

        // Add ellipsis if truncated
        if (showEllipsis) {
            html += '<span class="breadcrumb-ellipsis">...</span>';
            html += '<span class="breadcrumb-separator">›</span>';
        }

        itemsToShow.forEach((item, index) => {
            // Calculate original index for click handling
            const originalIndex = forSidebar
                ? (showEllipsis ? path.length - 4 + index : index)
                : (showEllipsis ? path.length - 3 + index : index);
            const isLast = index === itemsToShow.length - 1;
            const isFirst = index === 0 && !showEllipsis;

            if (!isFirst && index > 0) {
                html += '<span class="breadcrumb-separator">›</span>';
            }

            // Add color styling if available
            let colorStyle = '';
            if (item.color && item.color.startsWith('#')) {
                colorStyle = `style="color: ${item.color};"`;
            }

            html += `<span class="breadcrumb-item${isLast && !forSidebar ? ' active' : ''}" data-id="${escapeHtml(item.id)}" data-index="${originalIndex}" ${colorStyle}>${escapeHtml(item.label)}</span>`;
        });

        return html;
    }

    /**
     * Detail Panel anzeigen
     */
    showDetail(node, currentUniqueId = null) {
        // Store reference to current node for child navigation
        this.currentDetailNode = node;
        // Store current pathId for generating child pathIds
        this.currentDetailPathId = currentUniqueId;

        // Hide top breadcrumb bar when sidebar is open
        this.breadcrumbBar.classList.add('hidden');

        // Build breadcrumb path for sidebar (exclude current node)
        const nodeId = node.id;
        const path = this.findPathToNode(nodeId);
        this.nodePath = path;
        const breadcrumbHtml = this.buildBreadcrumbHtml(path, true);

        // Get node color for title
        const nodeColor = path && path.length > 0 ? path[path.length - 1].color : null;
        const titleStyle = nodeColor ? `style="color: ${nodeColor};"` : '';

        let html = '';

        // Screenshots Carousel FIRST (above navigation)
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

        // Breadcrumb (showing path to current node)
        if (breadcrumbHtml) {
            html += `<nav class="panel-breadcrumb" aria-label="Navigationspfad">${breadcrumbHtml}</nav>`;
        }

        // Title with node color
        html += `<h2 ${titleStyle}>${escapeHtml(node.label)}</h2>`;

        // Kinder anzeigen
        if (node.children && node.children.length > 0) {
            html += `<h3>Unterelemente</h3><div class="panel-children">`;
            // Get parent color for inheritance
            const parentColor = node.color || null;
            const parentPathId = currentUniqueId || 'root';
            node.children.forEach((child, index) => {
                // Child uses its own color or inherits from parent
                const childColor = child.color || parentColor;
                const colorStyle = childColor ? `border-left: 3px solid ${childColor}; background: linear-gradient(90deg, ${childColor}22 0%, transparent 100%);` : '';
                const colorAttr = childColor ? `data-color="${escapeHtml(childColor)}"` : '';
                // Include path-based ID for the child
                const childPathId = `${parentPathId}-${index}`;
                html += `
                    <div class="panel-child-item" data-id="${escapeHtml(child.id)}" data-path-id="${escapeHtml(childPathId)}" data-index="${index}" data-label="${escapeHtml(child.label)}" ${colorAttr} style="${colorStyle}">
                        <span>${escapeHtml(child.label)}</span>
                    </div>
                `;
            });
            html += `</div>`;
        }

        // Description at the end
        if (node.description) {
            html += `<p class="panel-description">${escapeHtml(node.description)}</p>`;
        }

        this.panelContent.innerHTML = html;
        this.detailPanel.classList.add('open');

        // Highlight active sidebar item if matches current node
        this.updateSidebarHighlight(currentUniqueId);

        // Update minimap after sidebar opens (don't re-center, user controls the view)
        setTimeout(() => this.updateMinimapViewport(), 350);

        // Carousel Event Handlers
        this.setupCarousel();

        // Child click handler - navigate to child node
        this.panelContent.querySelectorAll('.panel-child-item').forEach(item => {
            item.addEventListener('click', () => {
                const childIndex = parseInt(item.dataset.index);
                const childPathId = item.dataset.pathId;
                const child = node.children[childIndex];
                if (child) {
                    this.navigateToNode(node, child, currentUniqueId, childPathId);
                }
            });
        });

        // Sidebar breadcrumb click handler
        this.panelContent.querySelectorAll('.panel-breadcrumb .breadcrumb-item:not(.active)').forEach(item => {
            item.addEventListener('click', () => {
                const index = parseInt(item.dataset.index);
                const pathItem = this.nodePath[index];
                if (pathItem && pathItem.node) {
                    // Navigate to this node
                    this.selectedNode = pathItem.node;

                    // Expand path to this node (keep other expanded nodes)
                    for (let i = 0; i <= index; i++) {
                        this.expandedNodes.add(this.nodePath[i].uniqueId);
                    }

                    // Smooth render and center on selected node (use path-based uniqueId)
                    this.smoothRender(pathItem.uniqueId).then(() => {
                        this.updateBreadcrumbs();
                        // Update sidebar with the selected node
                        this.showDetail(pathItem.node, this.activeNodeId);
                    });
                }
            });
        });
    }

    /**
     * Navigate to a child node from sidebar click
     * @param {string} parentPathId - Parent's path-based ID
     * @param {string} childPathId - Child's path-based ID
     */
    navigateToNode(parentNode, childNode, parentPathId, childPathId) {
        // Expand parent to show child (use path-based ID)
        this.expandedNodes.add(parentPathId);

        // Smooth render and center on child (use path-based ID)
        this.smoothRender(childPathId).then(() => {
            // Show child's detail panel
            this.showDetail(childNode, this.activeNodeId);
        });
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

        // Collect all images for lightbox (works for single or multiple images)
        const allImages = [];
        slides.forEach((slide, i) => {
            const img = slide.querySelector('img');
            if (img) {
                allImages.push({ src: img.src, alt: img.alt });
                img.addEventListener('click', () => {
                    this.openLightbox(allImages, i);
                });
                img.style.cursor = 'pointer';
            }
        });

        // Skip carousel navigation setup if only one image
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
            <img src="images/netventure-logo.png" alt="netventure" class="lightbox-logo">
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
        // Show top breadcrumb bar when sidebar closes
        this.breadcrumbBar.classList.remove('hidden');
        // Update minimap after sidebar closes (don't re-center, user controls the view)
        setTimeout(() => this.updateMinimapViewport(), 350);
    }

    /**
     * Reset view: zoom 100%, collapse all, center on root
     */
    resetView() {
        // Reset zoom to 100%
        this.setZoom(1);

        // Close sidebar
        this.detailPanel.classList.remove('open');

        // Collapse all nodes and center on root (smoothRender handles centering)
        this.expandedNodes.clear();
        this.expandedNodes.add('root');
        this.smoothRender('root');
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
        // Recursively add all path-based IDs
        const addAll = (node, pathId = 'root', inheritedDirection = null) => {
            if (node.children && node.children.length > 0) {
                // Check if this is a dual-side node
                let leftCount = 0, rightCount = 0;
                node.children.forEach(child => {
                    const childDir = child.direction || inheritedDirection;
                    if (childDir === 'left') leftCount++;
                    else rightCount++;
                });

                if (leftCount > 0 && rightCount > 0) {
                    // Dual-side node - add both side keys
                    this.expandedNodes.add(pathId + ':L');
                    this.expandedNodes.add(pathId + ':R');
                } else {
                    // Single-side node - add regular key
                    this.expandedNodes.add(pathId);
                }

                // Process children
                node.children.forEach((child, index) => {
                    const childDir = child.direction || inheritedDirection;
                    addAll(child, `${pathId}-${index}`, childDir);
                });
            }
        };
        addAll(this.buildData());
        this.smoothRender();
    }

    collapseAll() {
        this.expandedNodes.clear();
        this.expandedNodes.add('root');
        this.smoothRender('root');
    }

    setZoom(level) {
        const oldZoom = this.zoom;
        this.zoom = Math.max(this.minZoom, Math.min(this.maxZoom, level));

        // Only update if zoom actually changed
        if (this.zoom !== oldZoom) {
            // Calculate center point before zoom to maintain position
            const viewportCenterX = this.viewport.scrollLeft + this.viewport.clientWidth / 2;
            const viewportCenterY = this.viewport.scrollTop + this.viewport.clientHeight / 2;
            const canvasCenterX = viewportCenterX / oldZoom;
            const canvasCenterY = viewportCenterY / oldZoom;

            // Disable transition for instant zoom
            this.canvas.style.transition = 'none';

            // Apply zoom transform
            this.canvas.style.transform = `scale(${this.zoom})`;

            // Adjust scroll to keep the same canvas point centered (before reflow)
            const newScrollX = canvasCenterX * this.zoom - this.viewport.clientWidth / 2;
            const newScrollY = canvasCenterY * this.zoom - this.viewport.clientHeight / 2;
            this.viewport.scrollLeft = Math.max(0, newScrollX);
            this.viewport.scrollTop = Math.max(0, newScrollY);

            // Force reflow then restore transition
            this.canvas.offsetHeight;
            this.canvas.style.transition = '';

            // Update zoom display
            const zoomText = `${Math.round(this.zoom * 100)}%`;
            document.getElementById('zoomLevel').textContent = zoomText;
            const fsZoomLevel = document.getElementById('fsZoomLevel');
            if (fsZoomLevel) fsZoomLevel.textContent = zoomText;

            // Redraw lines with correct measurements for new zoom
            this.drawLines();

            // Update minimap viewport
            this.updateMinimapViewport();
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
     * Toggle fullscreen mode (uses browser Fullscreen API)
     */
    toggleFullscreen() {
        if (!document.fullscreenElement) {
            // Enter fullscreen
            document.documentElement.requestFullscreen().then(() => {
                this.isFullscreen = true;
                document.body.classList.add('fullscreen');
                this.updateFullscreenButton();
                this.showFullscreenHint();
                setTimeout(() => this.centerView(), 350);
            }).catch(err => {
                console.warn('Fullscreen not available:', err);
                // Fallback to CSS-only fullscreen
                this.isFullscreen = true;
                document.body.classList.add('fullscreen');
                this.updateFullscreenButton();
                this.showFullscreenHint();
                setTimeout(() => this.centerView(), 350);
            });
        } else {
            // Exit fullscreen
            document.exitFullscreen().then(() => {
                this.isFullscreen = false;
                document.body.classList.remove('fullscreen');
                this.updateFullscreenButton();
                setTimeout(() => this.centerView(), 350);
            });
        }
    }

    /**
     * Show fullscreen hint briefly
     */
    showFullscreenHint() {
        const hint = document.getElementById('fullscreenHint');
        if (hint) {
            hint.style.display = 'block';
            // Force reflow to restart animation
            hint.offsetHeight;
            setTimeout(() => {
                hint.style.display = 'none';
            }, 2000);
        }
    }

    /**
     * Update fullscreen button text
     */
    updateFullscreenButton() {
        const btn = document.getElementById('fullscreenBtn');
        if (btn) {
            const span = btn.querySelector('span');
            if (span) {
                span.textContent = this.isFullscreen ? 'Beenden' : 'Vollbild';
            }
        }
    }

    /**
     * Find path from root to a node, including inherited colors
     * Uses path-based IDs for stable identification
     * Only traverses expanded nodes to match render traversal order
     */
    findPathToNode(targetId, node = null, path = [], parentColor = null, pathId = 'root') {
        if (!node) {
            node = this.buildData();
        }

        // Use path-based uniqueId (same as renderNode)
        const uniqueId = pathId;

        // Inherit color from parent if not set
        const nodeColor = node.color || parentColor;
        const currentPath = [...path, { id: node.id, label: node.label, node: node, color: nodeColor, uniqueId: uniqueId }];

        // Check for exact uniqueId match
        if (uniqueId === this.activeNodeId) {
            return currentPath;
        }

        // Only recurse into expanded nodes (same as renderNode)
        if (node.children && this.expandedNodes.has(uniqueId)) {
            for (let i = 0; i < node.children.length; i++) {
                const child = node.children[i];
                const childPathId = `${pathId}-${i}`;
                const result = this.findPathToNode(targetId, child, currentPath, nodeColor, childPathId);
                if (result) return result;
            }
        }

        return null;
    }

    /**
     * Update breadcrumb navigation (top bar only)
     */
    updateBreadcrumbs() {
        if (!this.breadcrumbContainer || !this.selectedNode) return;

        // Find path to selected node
        const nodeId = this.selectedNode.id;
        const path = this.findPathToNode(nodeId);

        if (!path || path.length === 0) return;

        this.nodePath = path;

        // Build and update top bar breadcrumb using shared method
        this.breadcrumbContainer.innerHTML = this.buildBreadcrumbHtml(path);

        // Add click handlers for top bar breadcrumb
        this.breadcrumbContainer.querySelectorAll('.breadcrumb-item:not(.active)').forEach(item => {
            item.addEventListener('click', () => {
                const index = parseInt(item.dataset.index);
                const pathItem = this.nodePath[index];
                if (pathItem && pathItem.node) {
                    // Navigate to this node
                    this.selectedNode = pathItem.node;

                    // Expand path to this node (keep other expanded nodes)
                    for (let i = 0; i <= index; i++) {
                        this.expandedNodes.add(this.nodePath[i].uniqueId);
                    }

                    // Smooth render and center on selected node (use path-based uniqueId)
                    this.smoothRender(pathItem.uniqueId).then(() => {
                        this.updateBreadcrumbs();

                        // Update sidebar if open
                        if (this.detailPanel.classList.contains('open')) {
                            this.showDetail(pathItem.node, this.activeNodeId);
                        }
                    });
                }
            });
        });
    }

    // ==================== MINIMAP ====================

    /**
     * Setup minimap canvas and event listeners
     */
    setupMinimap() {
        if (!this.minimapCanvas) return;

        // Toggle button
        const toggleBtn = document.getElementById('minimapToggle');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => this.toggleMinimap());
        }

        // Click on minimap to navigate
        this.minimapContent.addEventListener('click', (e) => this.handleMinimapClick(e));

        // Drag on minimap viewport
        this.minimapViewport.addEventListener('mousedown', (e) => this.startMinimapDrag(e));
        document.addEventListener('mousemove', (e) => this.handleMinimapDrag(e));
        document.addEventListener('mouseup', () => this.endMinimapDrag());

        // Update on scroll
        this.viewport.addEventListener('scroll', () => this.updateMinimapViewport());

        // Only initialize canvas if not collapsed
        if (!this.minimap.classList.contains('collapsed')) {
            this.initMinimapCanvas();
            setTimeout(() => this.updateMinimap(), 100);
        }
    }

    /**
     * Toggle minimap visibility
     */
    toggleMinimap() {
        if (!this.minimap) return;

        const isCollapsed = this.minimap.classList.toggle('collapsed');
        const toggleBtn = document.getElementById('minimapToggle');
        if (toggleBtn) {
            toggleBtn.textContent = isCollapsed ? '+' : '−';
        }

        // Reinitialize and update minimap when expanding
        if (!isCollapsed) {
            setTimeout(() => {
                this.initMinimapCanvas();
                this.updateMinimap();
            }, 150);
        }
    }

    /**
     * Initialize minimap canvas size and scale
     */
    initMinimapCanvas() {
        if (!this.minimapCanvas || !this.minimapContent) return;

        const rect = this.minimapContent.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return;

        // Reset canvas
        this.minimapCanvas.width = rect.width * 2; // 2x for retina
        this.minimapCanvas.height = rect.height * 2;
        this.minimapCtx = this.minimapCanvas.getContext('2d');
        this.minimapCtx.scale(2, 2);
    }

    /**
     * Render the minimap canvas
     */
    updateMinimap() {
        if (!this.minimapCtx || !this.minimapContent) return;

        const ctx = this.minimapCtx;
        const rect = this.minimapContent.getBoundingClientRect();
        const width = rect.width;
        const height = rect.height;

        // Reinitialize canvas if size changed
        if (this.minimapCanvas.width !== rect.width * 2 || this.minimapCanvas.height !== rect.height * 2) {
            this.initMinimapCanvas();
        }

        // Clear entire canvas (use canvas dimensions, not logical)
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, this.minimapCanvas.width, this.minimapCanvas.height);
        ctx.restore();

        // Calculate bounds based on node positions (matches canvas scroll coordinates)
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        this.nodePositions.forEach((pos) => {
            minX = Math.min(minX, pos.x - 150);
            minY = Math.min(minY, pos.y - 30);
            maxX = Math.max(maxX, pos.x + 150);
            maxY = Math.max(maxY, pos.y + 30);
        });

        // Add padding
        const padding = 50;
        minX -= padding;
        minY -= padding;
        maxX += padding;
        maxY += padding;

        // Calculate scale to fit all nodes
        const nodesWidth = maxX - minX;
        const nodesHeight = maxY - minY;
        const scale = Math.min(width / nodesWidth, height / nodesHeight);

        // Calculate offset to center
        const offsetX = (width - nodesWidth * scale) / 2 - minX * scale;
        const offsetY = (height - nodesHeight * scale) / 2 - minY * scale;

        // Store for viewport calculations
        this.minimapBounds = { minX, minY, maxX, maxY, scale, offsetX, offsetY, width, height };

        // Draw lines (using pos.x for consistency with viewport coordinates)
        ctx.lineWidth = 1;
        this.nodePositions.forEach((pos, nodeId) => {
            if (pos.parentId) {
                const parentPos = this.nodePositions.get(pos.parentId);
                if (parentPos) {
                    const lineColor = pos.color || '#00a0d2';
                    ctx.strokeStyle = this.hexToRgba(lineColor, 0.5);
                    ctx.beginPath();
                    ctx.moveTo(parentPos.x * scale + offsetX, parentPos.y * scale + offsetY);
                    ctx.lineTo(pos.x * scale + offsetX, pos.y * scale + offsetY);
                    ctx.stroke();
                }
            }
        });

        // Draw nodes (using pos.x for consistency with viewport)
        this.nodePositions.forEach((pos, nodeId) => {
            const x = pos.x * scale + offsetX;
            const y = pos.y * scale + offsetY;
            const nodeColor = pos.color || '#00a0d2';

            // Node dot - size based on level (root bigger)
            const radius = pos.level === 0 ? 4 : 3;
            ctx.beginPath();
            ctx.arc(x, y, radius, 0, Math.PI * 2);
            ctx.fillStyle = nodeColor;
            ctx.fill();
        });

        // Update viewport rectangle
        this.updateMinimapViewport();
    }

    /**
     * Update the viewport rectangle on the minimap
     */
    updateMinimapViewport() {
        if (!this.minimapViewport || !this.minimapBounds) return;

        const bounds = this.minimapBounds;
        const viewportWidth = this.viewport.clientWidth;
        const viewportHeight = this.viewport.clientHeight;

        // Current scroll position in canvas coordinates (accounting for zoom)
        const scrollX = this.viewport.scrollLeft / this.zoom;
        const scrollY = this.viewport.scrollTop / this.zoom;
        const visibleWidth = viewportWidth / this.zoom;
        const visibleHeight = viewportHeight / this.zoom;

        // Convert scroll position to minimap coordinates (relative to node bounds)
        // The minimap shows nodes from minX to maxX, scaled to fit in minimap width
        const x = (scrollX - bounds.minX) * bounds.scale + (bounds.width - (bounds.maxX - bounds.minX) * bounds.scale) / 2;
        const y = (scrollY - bounds.minY) * bounds.scale + (bounds.height - (bounds.maxY - bounds.minY) * bounds.scale) / 2;
        const w = visibleWidth * bounds.scale;
        const h = visibleHeight * bounds.scale;

        // Apply to viewport element (clamp to minimap bounds)
        this.minimapViewport.style.left = `${Math.max(0, x)}px`;
        this.minimapViewport.style.top = `${Math.max(0, y)}px`;
        this.minimapViewport.style.width = `${Math.min(w, bounds.width - Math.max(0, x))}px`;
        this.minimapViewport.style.height = `${Math.min(h, bounds.height - Math.max(0, y))}px`;
    }

    /**
     * Convert hex color to rgba
     */
    hexToRgba(hex, alpha) {
        // Handle shorthand hex
        let r, g, b;
        if (hex.length === 4) {
            r = parseInt(hex[1] + hex[1], 16);
            g = parseInt(hex[2] + hex[2], 16);
            b = parseInt(hex[3] + hex[3], 16);
        } else {
            r = parseInt(hex.slice(1, 3), 16);
            g = parseInt(hex.slice(3, 5), 16);
            b = parseInt(hex.slice(5, 7), 16);
        }
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    /**
     * Handle click on minimap to navigate
     */
    handleMinimapClick(e) {
        if (!this.minimapBounds) return;
        if (e.target === this.minimapViewport) return; // Don't handle viewport clicks

        const rect = this.minimapContent.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const clickY = e.clientY - rect.top;

        // Convert minimap click to canvas coordinates (reverse of viewport calculation)
        const bounds = this.minimapBounds;
        const centerOffsetX = (bounds.width - (bounds.maxX - bounds.minX) * bounds.scale) / 2;
        const centerOffsetY = (bounds.height - (bounds.maxY - bounds.minY) * bounds.scale) / 2;
        const canvasX = (clickX - centerOffsetX) / bounds.scale + bounds.minX;
        const canvasY = (clickY - centerOffsetY) / bounds.scale + bounds.minY;

        // Scroll to center this point
        const targetScrollX = (canvasX * this.zoom) - (this.viewport.clientWidth / 2);
        const targetScrollY = (canvasY * this.zoom) - (this.viewport.clientHeight / 2);

        this.viewport.scrollTo({
            left: targetScrollX,
            top: targetScrollY,
            behavior: 'smooth'
        });
    }

    /**
     * Start dragging the minimap viewport
     */
    startMinimapDrag(e) {
        e.preventDefault();
        e.stopPropagation();
        this.isMinimapDragging = true;
        this.minimapDragStart = { x: e.clientX, y: e.clientY };
        this.minimapScrollStart = { x: this.viewport.scrollLeft, y: this.viewport.scrollTop };
        this.minimapViewport.style.cursor = 'grabbing';
    }

    /**
     * Handle minimap viewport drag
     */
    handleMinimapDrag(e) {
        if (!this.isMinimapDragging || !this.minimapBounds) return;

        const bounds = this.minimapBounds;
        const dx = e.clientX - this.minimapDragStart.x;
        const dy = e.clientY - this.minimapDragStart.y;

        // Convert minimap movement to canvas movement
        const canvasDx = (dx / bounds.scale) * this.zoom;
        const canvasDy = (dy / bounds.scale) * this.zoom;

        this.viewport.scrollLeft = this.minimapScrollStart.x + canvasDx;
        this.viewport.scrollTop = this.minimapScrollStart.y + canvasDy;
    }

    /**
     * End minimap viewport drag
     */
    endMinimapDrag() {
        this.isMinimapDragging = false;
        if (this.minimapViewport) {
            this.minimapViewport.style.cursor = 'move';
        }
    }

    // ==================== SEARCH ====================

    /**
     * Setup search functionality
     */
    setupSearch() {
        if (!this.searchInput) return;

        // Build search index
        this.buildSearchIndex();

        // Input handler with debounce
        let debounceTimer;
        this.searchInput.addEventListener('input', (e) => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => this.handleSearch(e.target.value), 150);
        });

        // Clear button
        if (this.searchClear) {
            this.searchClear.addEventListener('click', () => {
                this.searchInput.value = '';
                this.closeSearch();
                this.searchInput.focus();
            });
        }

        // Keyboard navigation
        this.searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                this.selectSearchResult(this.searchSelectedIndex + 1);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                this.selectSearchResult(this.searchSelectedIndex - 1);
            } else if (e.key === 'Enter') {
                e.preventDefault();
                this.activateSearchResult();
            } else if (e.key === 'Escape') {
                this.closeSearch();
                this.searchInput.blur();
            }
        });

        // Focus/blur
        this.searchInput.addEventListener('focus', () => {
            if (this.searchInput.value.length >= 2) {
                this.handleSearch(this.searchInput.value);
            }
        });

        // Close on click outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.search-container')) {
                this.closeSearch();
            }
        });

        // Global shortcut Ctrl+K
        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                this.searchInput.focus();
                this.searchInput.select();
            }
        });
    }

    /**
     * Build search index from all nodes
     */
    buildSearchIndex() {
        this.searchIndex = [];
        const data = this.buildData();

        const indexNode = (node, path = [], pathIds = ['root'], parentColor = null) => {
            const nodeColor = node.color || parentColor;
            const pathId = pathIds[pathIds.length - 1];

            this.searchIndex.push({
                id: node.id,
                pathId: pathId,
                label: node.label,
                path: [...path],
                pathLabels: path.map(p => p.label),
                color: nodeColor,
                node: node
            });

            if (node.children) {
                node.children.forEach((child, index) => {
                    const childPathId = `${pathId}-${index}`;
                    indexNode(
                        child,
                        [...path, { id: node.id, label: node.label }],
                        [...pathIds, childPathId],
                        nodeColor
                    );
                });
            }
        };

        indexNode(data);
    }

    /**
     * Handle search input
     */
    handleSearch(query) {
        query = query.trim().toLowerCase();

        if (query.length < 2) {
            this.closeSearch();
            return;
        }

        // Filter results
        const results = this.searchIndex.filter(item =>
            item.label.toLowerCase().includes(query)
        ).slice(0, 10); // Limit to 10 results

        this.displaySearchResults(results, query);
    }

    /**
     * Display search results
     */
    displaySearchResults(results, query) {
        if (results.length === 0) {
            this.searchResults.innerHTML = `
                <div class="search-no-results">Keine Ergebnisse für "${escapeHtml(query)}"</div>
            `;
            this.searchResults.classList.add('active');
            return;
        }

        let html = '';
        results.forEach((result, index) => {
            const pathStr = result.pathLabels.length > 0
                ? result.pathLabels.join(' › ')
                : 'Root';

            const colorDot = result.color
                ? `<span class="color-dot" style="background: ${escapeHtml(result.color)}"></span>`
                : '';

            // Highlight matching text
            const highlightedLabel = result.label.replace(
                new RegExp(`(${escapeHtml(query)})`, 'gi'),
                '<mark>$1</mark>'
            );

            html += `
                <div class="search-result-item" data-index="${index}" data-path-id="${escapeHtml(result.pathId)}">
                    <div class="search-result-title">${colorDot}${highlightedLabel}</div>
                    <div class="search-result-path">${escapeHtml(pathStr)}</div>
                </div>
            `;
        });

        html += `
            <div class="search-hint">
                <kbd>↑</kbd> <kbd>↓</kbd> Navigieren · <kbd>Enter</kbd> Auswählen · <kbd>Esc</kbd> Schließen
            </div>
        `;

        this.searchResults.innerHTML = html;
        this.searchResults.classList.add('active');
        this.searchSelectedIndex = -1;
        this.currentSearchResults = results;

        // Click handlers
        this.searchResults.querySelectorAll('.search-result-item').forEach(item => {
            item.addEventListener('click', () => {
                const index = parseInt(item.dataset.index);
                this.searchSelectedIndex = index;
                this.activateSearchResult();
            });
        });
    }

    /**
     * Select a search result by index
     */
    selectSearchResult(index) {
        const items = this.searchResults.querySelectorAll('.search-result-item');
        if (items.length === 0) return;

        // Wrap around
        if (index < 0) index = items.length - 1;
        if (index >= items.length) index = 0;

        // Update selection
        items.forEach((item, i) => {
            item.classList.toggle('selected', i === index);
        });

        this.searchSelectedIndex = index;

        // Scroll into view
        items[index].scrollIntoView({ block: 'nearest' });
    }

    /**
     * Activate the selected search result
     */
    activateSearchResult() {
        if (!this.currentSearchResults || this.searchSelectedIndex < 0) {
            // If nothing selected but we have results, select first
            if (this.currentSearchResults && this.currentSearchResults.length > 0) {
                this.searchSelectedIndex = 0;
            } else {
                return;
            }
        }

        const result = this.currentSearchResults[this.searchSelectedIndex];
        if (!result) return;

        // Close search
        this.closeSearch();

        // Navigate to the node
        this.navigateToSearchResult(result);
    }

    /**
     * Navigate to a search result
     */
    navigateToSearchResult(result) {
        // Expand path to this node
        this.expandedNodes.clear();

        // Build path of pathIds to expand, handling dual-side nodes
        const pathParts = result.pathId.split('-');
        const data = this.buildData();

        // Helper to check if a node is dual-side and get the side for a child index
        const getDualSideKey = (node, childIndex, inheritedDirection) => {
            if (!node.children || node.children.length === 0) return null;

            // Count left and right children
            let leftCount = 0, rightCount = 0;
            node.children.forEach(child => {
                const childDir = child.direction || inheritedDirection;
                if (childDir === 'left') leftCount++;
                else rightCount++;
            });

            // If dual-side, determine which side this child is on
            if (leftCount > 0 && rightCount > 0) {
                const child = node.children[childIndex];
                const childDir = child.direction || inheritedDirection;
                return childDir === 'left' ? ':L' : ':R';
            }
            return null;
        };

        // Traverse the path and expand each parent correctly
        let currentNode = data;
        let currentPath = 'root';
        let inheritedDirection = null;

        for (let i = 1; i < pathParts.length; i++) {
            const childIndex = parseInt(pathParts[i]);

            // Check if current node is dual-side
            const sideKey = getDualSideKey(currentNode, childIndex, inheritedDirection);

            if (sideKey) {
                // Dual-side node - add both sides to ensure proper expansion
                this.expandedNodes.add(currentPath + ':L');
                this.expandedNodes.add(currentPath + ':R');
            } else {
                // Regular node
                this.expandedNodes.add(currentPath);
            }

            // Move to child
            currentNode = currentNode.children[childIndex];
            inheritedDirection = currentNode.direction || inheritedDirection;
            currentPath += '-' + childIndex;
        }

        // Set active node and selected node
        this.activeNodeId = result.pathId;
        this.selectedNode = result.node;

        // Render and center
        this.smoothRender(result.pathId).then(() => {
            this.updateBreadcrumbs();
            // Open sidebar with this node
            this.showDetail(result.node, this.activeNodeId);
        });
    }

    /**
     * Close search results
     */
    closeSearch() {
        this.searchResults.classList.remove('active');
        this.searchSelectedIndex = -1;
    }

    // ==================== DEEP LINKING ====================

    /**
     * Setup deep linking (URL parameters)
     */
    setupDeepLinking() {
        // Handle initial URL parameters
        this.handleUrlParams();

        // Handle browser back/forward
        window.addEventListener('popstate', (e) => {
            if (e.state && e.state.nodeId) {
                this.navigateToPathId(e.state.nodeId, false); // Don't push state again
            } else {
                // Go back to root
                this.navigateToPathId('root', false);
            }
        });
    }

    /**
     * Handle URL parameters on page load
     */
    handleUrlParams() {
        const params = new URLSearchParams(window.location.search);
        const nodeParam = params.get('node');

        if (nodeParam) {
            // Delay to ensure everything is loaded
            setTimeout(() => {
                this.navigateToPathId(nodeParam, false);
            }, 300);
        }
    }

    /**
     * Navigate to a node by its pathId
     */
    navigateToPathId(pathId, pushState = true) {
        // Find the node data for this pathId
        const nodeData = this.findNodeByPathId(pathId);
        if (!nodeData) {
            console.warn('Node not found for pathId:', pathId);
            return;
        }

        // Expand path to this node
        this.expandedNodes.clear();
        this.expandedNodes.add('root');

        // Build path of pathIds to expand
        const pathParts = pathId.split('-');
        let currentPath = 'root';
        for (let i = 1; i < pathParts.length; i++) {
            currentPath += '-' + pathParts[i];
            // Expand parent nodes
            const parentPath = pathParts.slice(0, i + 1).join('-');
            if (i < pathParts.length - 1) {
                this.expandedNodes.add(parentPath);
            }
        }
        // Expand direct parent
        if (pathParts.length > 1) {
            const parentPath = pathParts.slice(0, -1).join('-');
            this.expandedNodes.add(parentPath);
        }

        // Set active node
        this.activeNodeId = pathId;
        this.selectedNode = nodeData.node;

        // Update URL if requested
        if (pushState) {
            this.updateUrl(pathId);
        }

        // Render and center
        this.smoothRender(pathId).then(() => {
            this.updateBreadcrumbs();
        });
    }

    /**
     * Find a node by its pathId
     */
    findNodeByPathId(pathId, node = null, currentPathId = 'root') {
        if (!node) {
            node = this.buildData();
        }

        if (currentPathId === pathId) {
            return { node, pathId: currentPathId };
        }

        if (node.children) {
            for (let i = 0; i < node.children.length; i++) {
                const childPathId = `${currentPathId}-${i}`;
                const result = this.findNodeByPathId(pathId, node.children[i], childPathId);
                if (result) return result;
            }
        }

        return null;
    }

    /**
     * Update URL with current node
     */
    updateUrl(pathId) {
        const url = new URL(window.location);

        if (pathId && pathId !== 'root') {
            url.searchParams.set('node', pathId);
        } else {
            url.searchParams.delete('node');
        }

        // Push to history
        window.history.pushState(
            { nodeId: pathId },
            '',
            url.toString()
        );
    }
}

// Additional icons
ICONS['tool'] = '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>';

// Start
document.addEventListener('DOMContentLoaded', () => {
    window.mindmapView = new MindmapView();
});
