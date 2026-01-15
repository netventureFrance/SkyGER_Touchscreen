/**
 * Sky Touchscreen - Radiales Menü Komponente
 * Erzeugt und verwaltet das kreisförmige Hauptmenü
 */

class RadialMenu {
    constructor(containerId, options = {}) {
        this.container = document.getElementById(containerId);
        this.options = {
            radius: options.radius || 220,
            startAngle: options.startAngle || -90, // Start oben (12 Uhr)
            itemSize: options.itemSize || 90,
            ...options
        };
        this.items = [];
        this.onItemClick = null;
        this.onItemHover = null;
    }

    /**
     * Erzeugt ein SVG Icon Element
     */
    createIcon(iconName) {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('viewBox', '0 0 24 24');
        svg.setAttribute('fill', 'none');
        svg.setAttribute('stroke', 'currentColor');
        svg.setAttribute('stroke-width', '2');
        svg.setAttribute('stroke-linecap', 'round');
        svg.setAttribute('stroke-linejoin', 'round');

        const iconPath = ICONS[iconName] || ICONS['circle'];
        svg.innerHTML = iconPath;

        return svg;
    }

    /**
     * Berechnet Position auf dem Kreis
     */
    calculatePosition(index, total) {
        const angleStep = 360 / total;
        const angle = this.options.startAngle + (index * angleStep);
        const radian = (angle * Math.PI) / 180;

        const centerX = this.container.offsetWidth / 2;
        const centerY = this.container.offsetHeight / 2;

        const x = centerX + this.options.radius * Math.cos(radian);
        const y = centerY + this.options.radius * Math.sin(radian);

        return { x, y, angle };
    }

    /**
     * Rendert das Menü mit den übergebenen Items
     */
    render(menuItems) {
        this.items = menuItems;
        this.container.innerHTML = '';

        const total = menuItems.length;

        menuItems.forEach((item, index) => {
            const position = this.calculatePosition(index, total);
            const element = this.createMenuItem(item, position, index);
            this.container.appendChild(element);
        });
    }

    /**
     * Erzeugt ein einzelnes Menü-Element
     */
    createMenuItem(item, position, index) {
        const element = document.createElement('div');
        element.className = 'icon-box';
        element.dataset.id = item.id;
        element.dataset.index = index;

        // Position setzen
        element.style.left = `${position.x}px`;
        element.style.top = `${position.y}px`;

        // Animation Delay
        element.style.animationDelay = `${index * 0.05}s`;

        // Icon
        const icon = this.createIcon(item.icon);
        element.appendChild(icon);

        // Label
        const label = document.createElement('span');
        label.className = 'label';
        label.textContent = item.label;
        element.appendChild(label);

        // Event Listeners
        element.addEventListener('click', (e) => {
            e.stopPropagation();
            if (this.onItemClick) {
                this.onItemClick(item, index);
            }
        });

        element.addEventListener('mouseenter', (e) => {
            if (this.onItemHover) {
                this.onItemHover(item, e, true);
            }
        });

        element.addEventListener('mouseleave', (e) => {
            if (this.onItemHover) {
                this.onItemHover(item, e, false);
            }
        });

        // Indikator für Kinder
        if (item.children && item.children.length > 0) {
            const indicator = document.createElement('div');
            indicator.className = 'children-indicator';
            indicator.style.cssText = `
                position: absolute;
                bottom: 6px;
                right: 6px;
                width: 6px;
                height: 6px;
                background: var(--accent-cyan);
                border-radius: 50%;
                opacity: 0.8;
            `;
            element.appendChild(indicator);
        }

        return element;
    }

    /**
     * Aktualisiert die Positionen (z.B. bei Resize)
     */
    updatePositions() {
        const elements = this.container.querySelectorAll('.icon-box');
        const total = elements.length;

        elements.forEach((element, index) => {
            const position = this.calculatePosition(index, total);
            element.style.left = `${position.x}px`;
            element.style.top = `${position.y}px`;
        });
    }

    /**
     * Setzt den Click Handler
     */
    setClickHandler(handler) {
        this.onItemClick = handler;
    }

    /**
     * Setzt den Hover Handler
     */
    setHoverHandler(handler) {
        this.onItemHover = handler;
    }

    /**
     * Hebt ein Item hervor
     */
    highlightItem(itemId) {
        const elements = this.container.querySelectorAll('.icon-box');
        elements.forEach(el => {
            if (el.dataset.id === itemId) {
                el.classList.add('highlighted');
            } else {
                el.classList.remove('highlighted');
            }
        });
    }

    /**
     * Entfernt alle Hervorhebungen
     */
    clearHighlights() {
        const elements = this.container.querySelectorAll('.icon-box');
        elements.forEach(el => el.classList.remove('highlighted'));
    }
}

// Export für Module
if (typeof module !== 'undefined' && module.exports) {
    module.exports = RadialMenu;
}
