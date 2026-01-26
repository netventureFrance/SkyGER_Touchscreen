/**
 * Sky Touchscreen - Book View
 * Full-screen paginated screenshot viewer
 */

class BookView {
    constructor(mindmapView) {
        this.mindmapView = mindmapView;
        this.pages = [];
        this.currentPage = 0;
        this.isOpen = false;
        this.thumbnailsOpen = false;

        // Touch/swipe handling
        this.touchStartX = 0;
        this.touchStartY = 0;
        this.swipeThreshold = 50;

        // DOM elements (created on first open)
        this.container = null;
        this.thumbnailsContainer = null;

        // Bind methods
        this.handleKeydown = this.handleKeydown.bind(this);
        this.handleTouchStart = this.handleTouchStart.bind(this);
        this.handleTouchEnd = this.handleTouchEnd.bind(this);
    }

    /**
     * Extract all screenshots from the mindmap tree
     * Returns array of page objects with screenshot info and breadcrumb path
     */
    extractAllScreenshots() {
        const pages = [];
        const data = this.mindmapView.buildData();

        const traverse = (node, breadcrumb = [], inheritedColor = null) => {
            // Inherit color from parent if not set (same as mindmap tree)
            const nodeColor = node.color || inheritedColor;

            const currentBreadcrumb = [...breadcrumb, {
                label: node.label,
                id: node.id,
                color: nodeColor
            }];

            // Add screenshots from this node
            if (node.screenshots && node.screenshots.length > 0) {
                node.screenshots.forEach((screenshot, idx) => {
                    pages.push({
                        image: screenshot.url || screenshot.src || screenshot,
                        label: node.label,
                        description: node.description || '',
                        color: nodeColor,
                        breadcrumb: currentBreadcrumb,
                        nodeId: node.id,
                        screenshotIndex: idx
                    });
                });
            }

            // Traverse children with inherited color
            if (node.children && node.children.length > 0) {
                node.children.forEach(child => {
                    traverse(child, currentBreadcrumb, nodeColor);
                });
            }
        };

        traverse(data);
        return pages;
    }

    /**
     * Find the first page index that belongs to a specific breadcrumb section
     */
    findFirstPageOfSection(sectionId) {
        for (let i = 0; i < this.pages.length; i++) {
            const page = this.pages[i];
            // Check if this page's breadcrumb includes the section
            const inSection = page.breadcrumb.some(crumb => crumb.id === sectionId);
            if (inSection) {
                return i;
            }
        }
        return 0;
    }

    /**
     * Open the book view
     * @param {number} startPage - Optional page to start at (0-indexed)
     */
    open(startPage = 0) {
        // Extract screenshots
        this.pages = this.extractAllScreenshots();

        if (this.pages.length === 0) {
            console.warn('No screenshots found for book view');
            return;
        }

        // Create container if needed
        if (!this.container) {
            this.createContainer();
        }

        // Set starting page
        this.currentPage = Math.max(0, Math.min(startPage, this.pages.length - 1));

        // Render current page
        this.render();

        // Show container
        this.container.classList.add('open');
        this.isOpen = true;

        // Update URL
        this.updateURL();

        // Add event listeners
        document.addEventListener('keydown', this.handleKeydown);
        this.container.addEventListener('touchstart', this.handleTouchStart, { passive: true });
        this.container.addEventListener('touchend', this.handleTouchEnd, { passive: true });

        // Hide mindmap elements
        document.body.classList.add('book-view-active');
    }

    /**
     * Close the book view
     */
    close() {
        if (!this.isOpen) return;

        // Hide thumbnails if open
        this.closeThumbnails();

        // Hide container
        if (this.container) {
            this.container.classList.remove('open');
        }
        this.isOpen = false;

        // Clear URL params
        const url = new URL(window.location);
        url.searchParams.delete('view');
        url.searchParams.delete('page');
        window.history.replaceState({}, '', url);

        // Remove event listeners
        document.removeEventListener('keydown', this.handleKeydown);
        if (this.container) {
            this.container.removeEventListener('touchstart', this.handleTouchStart);
            this.container.removeEventListener('touchend', this.handleTouchEnd);
        }

        // Show mindmap elements
        document.body.classList.remove('book-view-active');
    }

    /**
     * Toggle the book view
     */
    toggle() {
        if (this.isOpen) {
            this.close();
        } else {
            this.open();
        }
    }

    /**
     * Navigate to a specific page
     */
    goToPage(index) {
        if (index < 0 || index >= this.pages.length) return;

        this.currentPage = index;
        this.render();
        this.updateURL();

        // Update thumbnail selection if open
        if (this.thumbnailsOpen) {
            this.updateThumbnailSelection();
        }
    }

    /**
     * Go to next page
     */
    nextPage() {
        if (this.currentPage < this.pages.length - 1) {
            this.goToPage(this.currentPage + 1);
        }
    }

    /**
     * Go to previous page
     */
    prevPage() {
        if (this.currentPage > 0) {
            this.goToPage(this.currentPage - 1);
        }
    }

    /**
     * Go to first page
     */
    firstPage() {
        this.goToPage(0);
    }

    /**
     * Go to last page
     */
    lastPage() {
        this.goToPage(this.pages.length - 1);
    }

    /**
     * Create the main container HTML
     */
    createContainer() {
        this.container = document.createElement('div');
        this.container.id = 'bookView';
        this.container.className = 'book-view';

        this.container.innerHTML = `
            <div class="book-view-header">
                <div class="book-view-header-left">
                    <button class="book-view-close" id="bookViewClose" title="Schliessen (ESC)">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="18" y1="6" x2="6" y2="18"/>
                            <line x1="6" y1="6" x2="18" y2="18"/>
                        </svg>
                        <span>Schliessen</span>
                    </button>
                </div>
                <div class="book-view-header-center">
                    <button class="book-view-nav-btn" id="bookViewPrev" title="Vorherige Seite">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="15 18 9 12 15 6"/>
                        </svg>
                    </button>
                    <div class="book-view-page-info">
                        Seite <span class="current-page" id="bookViewCurrentPage">1</span> / <span id="bookViewTotalPages">1</span>
                    </div>
                    <button class="book-view-nav-btn" id="bookViewNext" title="Naechste Seite">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="9 18 15 12 9 6"/>
                        </svg>
                    </button>
                </div>
                <div class="book-view-header-right">
                    <button class="book-view-grid-btn" id="bookViewGridBtn" title="Uebersicht (G)">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="3" y="3" width="7" height="7"/>
                            <rect x="14" y="3" width="7" height="7"/>
                            <rect x="3" y="14" width="7" height="7"/>
                            <rect x="14" y="14" width="7" height="7"/>
                        </svg>
                        <span>Uebersicht</span>
                    </button>
                </div>
            </div>
            <div class="book-view-content">
                <div class="book-view-image-panel">
                    <div class="book-view-image-container" id="bookViewImageContainer">
                        <!-- Image will be inserted here -->
                    </div>
                </div>
                <div class="book-view-info-panel">
                    <div class="book-view-breadcrumb" id="bookViewBreadcrumb">
                        <!-- Breadcrumb will be inserted here -->
                    </div>
                    <h2 class="book-view-title" id="bookViewTitle">Title</h2>
                    <div class="book-view-description" id="bookViewDescription">
                        Description
                    </div>
                    <div class="book-view-filename">
                        <div class="book-view-filename-label">Bild:</div>
                        <div class="book-view-filename-value" id="bookViewFilename">filename.png</div>
                    </div>
                </div>
            </div>
            <div class="book-view-footer">
                <div class="book-view-progress-container">
                    <div class="book-view-progress-bar" id="bookViewProgressBar"></div>
                </div>
                <div class="book-view-progress-text" id="bookViewProgressText">0%</div>
            </div>
        `;

        document.body.appendChild(this.container);

        // Set up event listeners
        this.setupEventListeners();
    }

    /**
     * Create the thumbnails overlay HTML
     */
    createThumbnailsContainer() {
        this.thumbnailsContainer = document.createElement('div');
        this.thumbnailsContainer.id = 'bookViewThumbnails';
        this.thumbnailsContainer.className = 'book-view-thumbnails';

        this.thumbnailsContainer.innerHTML = `
            <div class="book-view-thumbnails-header">
                <div class="book-view-thumbnails-title">Alle Screenshots (${this.pages.length})</div>
                <button class="book-view-thumbnails-close" id="bookViewThumbnailsClose" title="Schliessen">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="6" x2="6" y2="18"/>
                        <line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                </button>
            </div>
            <div class="book-view-thumbnails-grid" id="bookViewThumbnailsGrid">
                <!-- Thumbnails will be inserted here -->
            </div>
        `;

        document.body.appendChild(this.thumbnailsContainer);

        // Close button
        document.getElementById('bookViewThumbnailsClose').addEventListener('click', () => {
            this.closeThumbnails();
        });

        // Click outside to close
        this.thumbnailsContainer.addEventListener('click', (e) => {
            if (e.target === this.thumbnailsContainer) {
                this.closeThumbnails();
            }
        });
    }

    /**
     * Set up button event listeners
     */
    setupEventListeners() {
        // Close button
        document.getElementById('bookViewClose').addEventListener('click', () => {
            this.close();
        });

        // Navigation buttons
        document.getElementById('bookViewPrev').addEventListener('click', () => {
            this.prevPage();
        });

        document.getElementById('bookViewNext').addEventListener('click', () => {
            this.nextPage();
        });

        // Grid button
        document.getElementById('bookViewGridBtn').addEventListener('click', () => {
            this.toggleThumbnails();
        });
    }

    /**
     * Handle keyboard events
     */
    handleKeydown(e) {
        if (!this.isOpen) return;

        // Thumbnails keyboard handling
        if (this.thumbnailsOpen) {
            if (e.key === 'Escape' || e.key === 'g' || e.key === 'G') {
                e.preventDefault();
                this.closeThumbnails();
            }
            return;
        }

        switch (e.key) {
            case 'Escape':
                e.preventDefault();
                this.close();
                break;
            case 'ArrowLeft':
                e.preventDefault();
                this.prevPage();
                break;
            case 'ArrowRight':
                e.preventDefault();
                this.nextPage();
                break;
            case 'Home':
                e.preventDefault();
                this.firstPage();
                break;
            case 'End':
                e.preventDefault();
                this.lastPage();
                break;
            case 'g':
            case 'G':
                e.preventDefault();
                this.toggleThumbnails();
                break;
        }
    }

    /**
     * Handle touch start
     */
    handleTouchStart(e) {
        this.touchStartX = e.changedTouches[0].screenX;
        this.touchStartY = e.changedTouches[0].screenY;
    }

    /**
     * Handle touch end (swipe detection)
     */
    handleTouchEnd(e) {
        if (this.thumbnailsOpen) return;

        const touchEndX = e.changedTouches[0].screenX;
        const touchEndY = e.changedTouches[0].screenY;

        const deltaX = touchEndX - this.touchStartX;
        const deltaY = touchEndY - this.touchStartY;

        // Only trigger if horizontal swipe is larger than vertical
        if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > this.swipeThreshold) {
            if (deltaX > 0) {
                this.prevPage();
            } else {
                this.nextPage();
            }
        }
    }

    /**
     * Render the current page
     */
    render() {
        if (!this.container || this.pages.length === 0) return;

        const page = this.pages[this.currentPage];

        // Update page counter
        document.getElementById('bookViewCurrentPage').textContent = this.currentPage + 1;
        document.getElementById('bookViewTotalPages').textContent = this.pages.length;

        // Update navigation buttons
        document.getElementById('bookViewPrev').disabled = this.currentPage === 0;
        document.getElementById('bookViewNext').disabled = this.currentPage === this.pages.length - 1;

        // Update image
        const imageContainer = document.getElementById('bookViewImageContainer');
        if (page.image) {
            const imageSrc = page.image.startsWith('http') || page.image.startsWith('images/') ? page.image : `images/${page.image}`;
            imageContainer.innerHTML = `
                <img src="${escapeHtml(imageSrc)}"
                     alt="${escapeHtml(page.label)}"
                     class="book-view-image"
                     id="bookViewImage">
            `;

            // Add click handler to open in lightbox
            const img = document.getElementById('bookViewImage');
            img.addEventListener('click', () => {
                this.openInLightbox();
            });
        } else {
            imageContainer.innerHTML = `
                <div class="book-view-no-image">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                        <circle cx="8.5" cy="8.5" r="1.5"/>
                        <polyline points="21 15 16 10 5 21"/>
                    </svg>
                    <span>Kein Bild verfuegbar</span>
                </div>
            `;
        }

        // Update breadcrumb
        this.renderBreadcrumb(page.breadcrumb);

        // Update title
        const titleEl = document.getElementById('bookViewTitle');
        titleEl.textContent = page.label;
        if (page.color) {
            titleEl.style.color = page.color.startsWith('#') ? page.color : 'var(--accent-cyan)';
            titleEl.classList.add('colored');
        } else {
            titleEl.style.color = '';
            titleEl.classList.remove('colored');
        }

        // Update description
        const descEl = document.getElementById('bookViewDescription');
        if (page.description) {
            descEl.textContent = page.description;
            descEl.style.display = 'block';
        } else {
            descEl.style.display = 'none';
        }

        // Update filename
        const filename = page.image ? page.image.split('/').pop() : '-';
        document.getElementById('bookViewFilename').textContent = filename;

        // Update progress bar
        const progress = ((this.currentPage + 1) / this.pages.length) * 100;
        document.getElementById('bookViewProgressBar').style.width = `${progress}%`;
        document.getElementById('bookViewProgressText').textContent = `${Math.round(progress)}%`;
    }

    /**
     * Render breadcrumb navigation
     */
    renderBreadcrumb(breadcrumb) {
        const container = document.getElementById('bookViewBreadcrumb');
        container.innerHTML = '';

        breadcrumb.forEach((item, index) => {
            if (index > 0) {
                const separator = document.createElement('span');
                separator.className = 'book-view-breadcrumb-separator';
                separator.textContent = '>';
                container.appendChild(separator);
            }

            const crumb = document.createElement('span');
            crumb.className = 'book-view-breadcrumb-item';
            crumb.textContent = item.label;

            // Apply color if available
            if (item.color && item.color.startsWith('#')) {
                crumb.style.color = item.color;
            }

            // Add click handler to navigate to first screenshot of this section
            crumb.addEventListener('click', () => {
                const pageIndex = this.findFirstPageOfSection(item.id);
                this.goToPage(pageIndex);
            });

            container.appendChild(crumb);
        });
    }

    /**
     * Toggle thumbnail grid overlay
     */
    toggleThumbnails() {
        if (this.thumbnailsOpen) {
            this.closeThumbnails();
        } else {
            this.openThumbnails();
        }
    }

    /**
     * Open thumbnail grid overlay
     */
    openThumbnails() {
        if (!this.thumbnailsContainer) {
            this.createThumbnailsContainer();
        }

        // Render thumbnails
        this.renderThumbnails();

        // Show overlay
        this.thumbnailsContainer.classList.add('open');
        this.thumbnailsOpen = true;

        // Scroll to current page
        setTimeout(() => {
            const activeThumbnail = this.thumbnailsContainer.querySelector('.book-view-thumbnail.active');
            if (activeThumbnail) {
                activeThumbnail.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }, 100);
    }

    /**
     * Close thumbnail grid overlay
     */
    closeThumbnails() {
        if (this.thumbnailsContainer) {
            this.thumbnailsContainer.classList.remove('open');
        }
        this.thumbnailsOpen = false;
    }

    /**
     * Render thumbnail grid
     */
    renderThumbnails() {
        const grid = document.getElementById('bookViewThumbnailsGrid');
        grid.innerHTML = '';

        this.pages.forEach((page, index) => {
            const thumb = document.createElement('div');
            thumb.className = 'book-view-thumbnail';
            if (index === this.currentPage) {
                thumb.classList.add('active');
            }
            thumb.dataset.index = index;

            const imageSrc = page.image ?
                (page.image.startsWith('http') ? page.image : `images/${page.image}`) :
                '';

            thumb.innerHTML = `
                ${imageSrc ? `<img src="${escapeHtml(imageSrc)}" alt="${escapeHtml(page.label)}" loading="lazy">` : ''}
                <div class="book-view-thumbnail-label">${escapeHtml(page.label)}</div>
                <div class="book-view-thumbnail-number">${index + 1}</div>
            `;

            thumb.addEventListener('click', () => {
                this.goToPage(index);
                this.closeThumbnails();
            });

            grid.appendChild(thumb);
        });
    }

    /**
     * Update thumbnail selection
     */
    updateThumbnailSelection() {
        if (!this.thumbnailsContainer) return;

        const thumbs = this.thumbnailsContainer.querySelectorAll('.book-view-thumbnail');
        thumbs.forEach((thumb, index) => {
            if (index === this.currentPage) {
                thumb.classList.add('active');
            } else {
                thumb.classList.remove('active');
            }
        });
    }

    /**
     * Open current image in lightbox
     */
    openInLightbox() {
        const page = this.pages[this.currentPage];
        if (!page || !page.image) return;

        const imageSrc = page.image.startsWith('http') || page.image.startsWith('images/') ? page.image : `images/${page.image}`;

        // Use mindmap's lightbox method
        this.mindmapView.openLightbox([{
            src: imageSrc,
            alt: page.label
        }], 0);
    }

    /**
     * Update URL with current view state
     */
    updateURL() {
        const url = new URL(window.location);
        url.searchParams.set('view', 'book');
        url.searchParams.set('page', this.currentPage + 1);
        window.history.replaceState({}, '', url);
    }

    /**
     * Check URL for book view params and open if present
     */
    checkURLParams() {
        const params = new URLSearchParams(window.location.search);
        const view = params.get('view');
        const page = parseInt(params.get('page'), 10);

        if (view === 'book') {
            // Delay to ensure mindmap is fully loaded
            setTimeout(() => {
                const startPage = (page && !isNaN(page)) ? page - 1 : 0;
                this.open(startPage);
            }, 100);
        }
    }
}

// Export for use in mindmap.js
window.BookView = BookView;
