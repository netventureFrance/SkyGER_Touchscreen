/**
 * Generate PDF documentation from screenshots
 * Run with: npm run generate-pdf
 */

import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

// Configuration
const OUTPUT_DIR = join(projectRoot, 'pdf');
const MAX_IMAGE_WIDTH = 800; // Resize images to reduce PDF size
const PAGE_WIDTH = 841.89; // A4 landscape
const PAGE_HEIGHT = 595.28;
const MARGIN = 30;

/**
 * Remove emojis and special characters that can't be encoded in WinAnsi
 */
function sanitizeText(text) {
    if (!text) return '';
    // Remove emojis and other non-Latin1 characters
    return text
        .replace(/[\u{1F600}-\u{1F64F}]/gu, '') // Emoticons
        .replace(/[\u{1F300}-\u{1F5FF}]/gu, '') // Misc Symbols and Pictographs
        .replace(/[\u{1F680}-\u{1F6FF}]/gu, '') // Transport and Map
        .replace(/[\u{1F1E0}-\u{1F1FF}]/gu, '') // Flags
        .replace(/[\u{2600}-\u{26FF}]/gu, '')   // Misc symbols
        .replace(/[\u{2700}-\u{27BF}]/gu, '')   // Dingbats
        .replace(/[\u{23E9}-\u{23FA}]/gu, '')   // Media controls
        .replace(/[^\x00-\xFF]/g, '')           // Remove anything not in Latin1
        .trim();
}

/**
 * Extract all screenshots from notion-data.json tree
 */
function extractAllScreenshots(node, breadcrumb = [], inheritedColor = null) {
    const pages = [];
    const nodeColor = node.color || inheritedColor;

    const currentBreadcrumb = [...breadcrumb, node.label];

    if (node.screenshots && node.screenshots.length > 0) {
        node.screenshots.forEach((screenshot, idx) => {
            const imageUrl = screenshot.url || screenshot.src || screenshot;
            pages.push({
                image: imageUrl,
                label: node.label,
                breadcrumb: currentBreadcrumb,
                screenshotIndex: idx,
                totalScreenshots: node.screenshots.length
            });
        });
    }

    if (node.children && node.children.length > 0) {
        node.children.forEach(child => {
            pages.push(...extractAllScreenshots(child, currentBreadcrumb, nodeColor));
        });
    }

    return pages;
}

/**
 * Resize and load image for PDF embedding
 */
async function loadAndResizeImage(imagePath) {
    const fullPath = join(projectRoot, imagePath);

    if (!existsSync(fullPath)) {
        console.log(`  Image not found: ${imagePath}`);
        return null;
    }

    try {
        // Resize image to reduce PDF size
        const resizedBuffer = await sharp(fullPath)
            .resize(MAX_IMAGE_WIDTH, null, {
                withoutEnlargement: true,
                fit: 'inside'
            })
            .png({ quality: 80, compressionLevel: 9 })
            .toBuffer();

        return resizedBuffer;
    } catch (e) {
        console.log(`  Error processing ${imagePath}: ${e.message}`);
        return null;
    }
}

/**
 * Generate the PDF
 */
async function generatePDF() {
    console.log('📄 Generating PDF documentation...\n');

    // Load data
    const notionData = JSON.parse(readFileSync(join(projectRoot, 'images/notion-data.json'), 'utf-8'));
    const version = JSON.parse(readFileSync(join(projectRoot, 'version.json'), 'utf-8'));

    // Load metadata if available
    let metadata = {};
    const metadataPath = join(projectRoot, 'images/screenshot-metadata.json');
    if (existsSync(metadataPath)) {
        const metaData = JSON.parse(readFileSync(metadataPath, 'utf-8'));
        metadata = metaData.metadata || {};
    }

    const versionString = `${version.major}.${version.minor}`;
    console.log(`Version: ${versionString}`);

    // Extract all pages
    const pages = extractAllScreenshots(notionData);
    console.log(`Found ${pages.length} screenshots to process\n`);

    // Create PDF
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    // Load and embed netventure logo
    let logoImage = null;
    const logoPath = join(projectRoot, 'images/netventure-logo.png');
    if (existsSync(logoPath)) {
        try {
            const logoBuffer = await sharp(logoPath)
                .resize(120, null, { withoutEnlargement: true, fit: 'inside' })
                .png()
                .toBuffer();
            logoImage = await pdfDoc.embedPng(logoBuffer);
            console.log('Logo loaded successfully');
        } catch (e) {
            console.log('Could not load logo:', e.message);
        }
    }

    // CI Colors
    const orangeColor = rgb(0.91, 0.35, 0.14); // #E85923
    const lightGray = rgb(0.95, 0.95, 0.95);
    const footerGray = rgb(0.88, 0.88, 0.88);

    // Process pages
    for (let i = 0; i < pages.length; i++) {
        const pageData = pages[i];
        const progress = `[${i + 1}/${pages.length}]`;

        process.stdout.write(`\r${progress} Processing: ${pageData.label.substring(0, 50).padEnd(50)}...`);

        // Create page with white background
        const page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);

        // Footer dimensions
        const footerHeight = 22;

        // Draw light gray content background (above footer)
        page.drawRectangle({
            x: MARGIN,
            y: footerHeight + 10,
            width: PAGE_WIDTH - MARGIN * 2,
            height: PAGE_HEIGHT - footerHeight - MARGIN - 50,
            color: lightGray
        });

        // Draw breadcrumb (above gray area)
        const breadcrumbText = sanitizeText(pageData.breadcrumb.join(' > '));
        page.drawText(breadcrumbText.substring(0, 140), {
            x: MARGIN,
            y: PAGE_HEIGHT - 18,
            size: 7,
            font: font,
            color: rgb(0.5, 0.5, 0.5)
        });

        // Draw title (bold, black)
        page.drawText(sanitizeText(pageData.label), {
            x: MARGIN,
            y: PAGE_HEIGHT - 38,
            size: 16,
            font: fontBold,
            color: rgb(0.1, 0.1, 0.1)
        });

        // Load and embed image
        const imageBuffer = await loadAndResizeImage(pageData.image);
        let imageEndX = MARGIN;
        if (imageBuffer) {
            try {
                const pngImage = await pdfDoc.embedPng(imageBuffer);
                const imgDims = pngImage.scale(1);

                // Calculate dimensions - leave space for metadata on right
                const availableWidth = PAGE_WIDTH - MARGIN * 2 - 160;
                const availableHeight = PAGE_HEIGHT - footerHeight - 80;

                let drawWidth = imgDims.width;
                let drawHeight = imgDims.height;

                if (drawWidth > availableWidth) {
                    const scale = availableWidth / drawWidth;
                    drawWidth *= scale;
                    drawHeight *= scale;
                }

                if (drawHeight > availableHeight) {
                    const scale = availableHeight / drawHeight;
                    drawWidth *= scale;
                    drawHeight *= scale;
                }

                const imgX = MARGIN + 5;
                const imgY = footerHeight + 20;
                imageEndX = imgX + drawWidth;

                // Draw blue corner decoration (top-left of image)
                page.drawRectangle({
                    x: imgX - 3,
                    y: imgY + drawHeight - 20,
                    width: 3,
                    height: 20,
                    color: rgb(0, 0.4, 0.7)
                });
                page.drawRectangle({
                    x: imgX - 3,
                    y: imgY + drawHeight - 3,
                    width: 20,
                    height: 3,
                    color: rgb(0, 0.4, 0.7)
                });

                // Draw image
                page.drawImage(pngImage, {
                    x: imgX,
                    y: imgY,
                    width: drawWidth,
                    height: drawHeight
                });
            } catch (e) {
                console.log(`\n  Error embedding image: ${e.message}`);
            }
        }

        // Metadata on right side
        const metaX = PAGE_WIDTH - 145;
        let metaY = PAGE_HEIGHT - 60;

        // Vorlage section
        page.drawText('Vorlage:', {
            x: metaX,
            y: metaY,
            size: 8,
            font: fontBold,
            color: rgb(0.4, 0.4, 0.4)
        });
        metaY -= 12;

        const pageMeta = metadata[pageData.image];
        const vorlageText = pageMeta?.templateGruppe ? sanitizeText(pageMeta.templateGruppe) : 'Sonstige';
        page.drawText(vorlageText.substring(0, 18), {
            x: metaX,
            y: metaY,
            size: 8,
            font: font,
            color: orangeColor
        });
        metaY -= 25;

        // API-Felder section
        page.drawText('API-Felder:', {
            x: metaX,
            y: metaY,
            size: 8,
            font: fontBold,
            color: rgb(0.4, 0.4, 0.4)
        });
        metaY -= 12;

        if (pageMeta?.apiFelder) {
            const apiText = sanitizeText(pageMeta.apiFelder);
            const apiFields = apiText.split(/[,\n]+/).map(s => s.trim()).filter(s => s);
            for (const field of apiFields.slice(0, 8)) {
                page.drawText(field.substring(0, 20), {
                    x: metaX,
                    y: metaY,
                    size: 7,
                    font: font,
                    color: rgb(0.4, 0.4, 0.4)
                });
                metaY -= 10;
            }
        }

        // Footer bar
        const orangeWidth = PAGE_WIDTH * 0.60;
        const diagonalWidth = 30;

        // Gray footer background
        page.drawRectangle({
            x: 0,
            y: 0,
            width: PAGE_WIDTH,
            height: footerHeight,
            color: footerGray
        });

        // Orange section
        page.drawRectangle({
            x: 0,
            y: 0,
            width: orangeWidth,
            height: footerHeight,
            color: orangeColor
        });

        // Diagonal
        const diagonalPath = `M ${orangeWidth} 0 L ${orangeWidth} ${footerHeight} L ${orangeWidth + diagonalWidth} ${footerHeight} Z`;
        page.drawSvgPath(diagonalPath, { x: 0, y: 0, color: orangeColor });

        // Footer title
        page.drawText('SKY SUPER TOUCH - DOKUMENTATION', {
            x: 12,
            y: 7,
            size: 9,
            font: fontBold,
            color: rgb(1, 1, 1)
        });

        // Logo on footer
        if (logoImage) {
            const footerLogoDims = logoImage.scale(0.05);
            page.drawImage(logoImage, {
                x: orangeWidth + diagonalWidth + 15,
                y: (footerHeight - footerLogoDims.height) / 2,
                width: footerLogoDims.width,
                height: footerLogoDims.height
            });
        }

        // netventure.tv
        page.drawText('netventure.tv', {
            x: orangeWidth + diagonalWidth + 45,
            y: 7,
            size: 9,
            font: fontBold,
            color: rgb(0.4, 0.4, 0.4)
        });

        // Page number
        page.drawText(`${i + 1}`, {
            x: PAGE_WIDTH - 20,
            y: 7,
            size: 9,
            font: font,
            color: rgb(0.5, 0.5, 0.5)
        });
    }

    // Add contact page at the end
    console.log('\nAdding contact page...');
    const contactPage = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);

    // KONTAKT heading (right aligned)
    contactPage.drawText('KONTAKT', {
        x: PAGE_WIDTH - MARGIN - 80,
        y: PAGE_HEIGHT - 60,
        size: 20,
        font: fontBold,
        color: rgb(0.2, 0.2, 0.2)
    });

    // Contact 1: Burak Serc
    let contactY = PAGE_HEIGHT - 140;
    contactPage.drawText('Burak Serc', {
        x: PAGE_WIDTH - MARGIN - 180,
        y: contactY,
        size: 14,
        font: fontBold,
        color: orangeColor
    });
    contactY -= 18;
    contactPage.drawText('mobile +172 769 76 33', {
        x: PAGE_WIDTH - MARGIN - 180,
        y: contactY,
        size: 10,
        font: font,
        color: rgb(0.3, 0.3, 0.3)
    });
    contactY -= 14;
    contactPage.drawText('b.serc@netventure.tv', {
        x: PAGE_WIDTH - MARGIN - 180,
        y: contactY,
        size: 10,
        font: font,
        color: rgb(0.3, 0.3, 0.3)
    });

    // Contact 2: Birnur Yildirim
    contactY -= 40;
    contactPage.drawText('Birnur Yildirim', {
        x: PAGE_WIDTH - MARGIN - 180,
        y: contactY,
        size: 14,
        font: fontBold,
        color: orangeColor
    });
    contactY -= 18;
    contactPage.drawText('mobile +49 172 - 829 06 04', {
        x: PAGE_WIDTH - MARGIN - 180,
        y: contactY,
        size: 10,
        font: font,
        color: rgb(0.3, 0.3, 0.3)
    });
    contactY -= 14;
    contactPage.drawText('b.yildirim@netventure.tv', {
        x: PAGE_WIDTH - MARGIN - 180,
        y: contactY,
        size: 10,
        font: font,
        color: rgb(0.3, 0.3, 0.3)
    });

    // Company name (right aligned)
    contactY -= 50;
    contactPage.drawText('netventure production GmbH', {
        x: PAGE_WIDTH - MARGIN - 180,
        y: contactY,
        size: 12,
        font: fontBold,
        color: rgb(0.3, 0.3, 0.3)
    });

    // Footer info line
    const footerInfoY = 100;
    contactPage.drawText('Einsteinufer 63-65 . D-10587 Berlin . office +49 30 34 38 38 30 . www.netventure.tv . mobile +49 170 226 81 02', {
        x: PAGE_WIDTH / 2 - 250,
        y: footerInfoY,
        size: 8,
        font: font,
        color: rgb(0.4, 0.4, 0.4)
    });

    // Orange footer bar
    contactPage.drawRectangle({
        x: 0,
        y: 30,
        width: PAGE_WIDTH,
        height: 50,
        color: orangeColor
    });

    // Footer text on orange bar
    contactPage.drawText('VIELEN DANK FUR IHRE AUFMERKSAMKEIT', {
        x: MARGIN,
        y: 50,
        size: 14,
        font: fontBold,
        color: rgb(1, 1, 1)
    });

    // Logo on orange footer bar (right side)
    if (logoImage) {
        const logoDims = logoImage.scale(0.15);
        contactPage.drawImage(logoImage, {
            x: PAGE_WIDTH - MARGIN - logoDims.width - 50,
            y: 35,
            width: logoDims.width,
            height: logoDims.height
        });
    }

    // netventure.tv text next to logo
    contactPage.drawText('netventure.tv', {
        x: PAGE_WIDTH - MARGIN - 45,
        y: 50,
        size: 12,
        font: fontBold,
        color: rgb(1, 1, 1)
    });

    // Page number on contact page
    contactPage.drawText(`${pages.length + 1}`, {
        x: PAGE_WIDTH - MARGIN - 10,
        y: 50,
        size: 10,
        font: font,
        color: rgb(1, 1, 1)
    });

    console.log('\n\n💾 Saving PDF...');

    // Ensure output directory exists
    if (!existsSync(OUTPUT_DIR)) {
        mkdirSync(OUTPUT_DIR, { recursive: true });
    }

    // Save PDF with version in filename
    const pdfBytes = await pdfDoc.save();
    const outputPath = join(OUTPUT_DIR, `Sky-Touchscreen-Dokumentation-v${versionString}.pdf`);
    writeFileSync(outputPath, pdfBytes);

    // Also save a "latest" version for easy download
    const latestPath = join(OUTPUT_DIR, 'Sky-Touchscreen-Dokumentation-latest.pdf');
    writeFileSync(latestPath, pdfBytes);

    const sizeMB = (pdfBytes.length / (1024 * 1024)).toFixed(2);
    console.log(`\n✅ PDF generated successfully!`);
    console.log(`   File: ${outputPath}`);
    console.log(`   Size: ${sizeMB} MB`);
    console.log(`   Pages: ${pages.length + 1} (including contact page)`);
}

// Run
generatePDF().catch(console.error);
