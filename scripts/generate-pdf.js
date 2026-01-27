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

    // Process pages
    for (let i = 0; i < pages.length; i++) {
        const pageData = pages[i];
        const progress = `[${i + 1}/${pages.length}]`;

        process.stdout.write(`\r${progress} Processing: ${pageData.label.substring(0, 50).padEnd(50)}...`);

        // Create page
        const page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);

        // Draw breadcrumb
        const breadcrumbText = sanitizeText(pageData.breadcrumb.join(' > '));
        page.drawText(breadcrumbText.substring(0, 120), {
            x: MARGIN,
            y: PAGE_HEIGHT - MARGIN,
            size: 8,
            font: font,
            color: rgb(0.5, 0.5, 0.5)
        });

        // Draw title
        page.drawText(sanitizeText(pageData.label), {
            x: MARGIN,
            y: PAGE_HEIGHT - MARGIN - 18,
            size: 14,
            font: fontBold,
            color: rgb(0.1, 0.1, 0.1)
        });

        // Load and embed image
        const imageBuffer = await loadAndResizeImage(pageData.image);
        if (imageBuffer) {
            try {
                const pngImage = await pdfDoc.embedPng(imageBuffer);
                const imgDims = pngImage.scale(1);

                // Calculate dimensions to fit in available space
                const availableWidth = PAGE_WIDTH - MARGIN * 2 - 150; // Leave space for metadata
                const availableHeight = PAGE_HEIGHT - MARGIN * 2 - 40;

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

                // Draw image
                page.drawImage(pngImage, {
                    x: MARGIN,
                    y: PAGE_HEIGHT - MARGIN - 35 - drawHeight,
                    width: drawWidth,
                    height: drawHeight
                });
            } catch (e) {
                console.log(`\n  Error embedding image: ${e.message}`);
            }
        }

        // Draw metadata on right side
        const metaX = PAGE_WIDTH - 140;
        let metaY = PAGE_HEIGHT - MARGIN - 40;

        // Screenshot info
        if (pageData.totalScreenshots > 1) {
            page.drawText(`Bild ${pageData.screenshotIndex + 1} / ${pageData.totalScreenshots}`, {
                x: metaX,
                y: metaY,
                size: 9,
                font: font,
                color: rgb(0.4, 0.4, 0.4)
            });
            metaY -= 15;
        }

        // Metadata from Notion
        const pageMeta = metadata[pageData.image];
        if (pageMeta) {
            if (pageMeta.templateGruppe) {
                page.drawText('Vorlage:', {
                    x: metaX,
                    y: metaY,
                    size: 8,
                    font: fontBold,
                    color: rgb(0.3, 0.3, 0.3)
                });
                metaY -= 12;
                page.drawText(sanitizeText(pageMeta.templateGruppe).substring(0, 20), {
                    x: metaX,
                    y: metaY,
                    size: 8,
                    font: font,
                    color: rgb(0.4, 0.4, 0.4)
                });
                metaY -= 20;
            }

            if (pageMeta.apiFelder) {
                page.drawText('API-Felder:', {
                    x: metaX,
                    y: metaY,
                    size: 8,
                    font: fontBold,
                    color: rgb(0.3, 0.3, 0.3)
                });
                metaY -= 12;

                // Split API fields into lines
                const apiText = sanitizeText(pageMeta.apiFelder);
                const words = apiText.split(/[,\s]+/);
                let line = '';
                for (const word of words) {
                    if ((line + word).length > 18) {
                        page.drawText(line.trim(), {
                            x: metaX,
                            y: metaY,
                            size: 7,
                            font: font,
                            color: rgb(0.4, 0.4, 0.4)
                        });
                        metaY -= 10;
                        line = word + ' ';
                    } else {
                        line += word + ' ';
                    }
                }
                if (line.trim()) {
                    page.drawText(line.trim(), {
                        x: metaX,
                        y: metaY,
                        size: 7,
                        font: font,
                        color: rgb(0.4, 0.4, 0.4)
                    });
                }
            }
        }

        // Draw page number
        page.drawText(`Seite ${i + 1} / ${pages.length}`, {
            x: PAGE_WIDTH - MARGIN - 60,
            y: MARGIN,
            size: 8,
            font: font,
            color: rgb(0.6, 0.6, 0.6)
        });

        // Draw version
        page.drawText(`V. ${versionString}`, {
            x: MARGIN,
            y: MARGIN,
            size: 8,
            font: font,
            color: rgb(0.6, 0.6, 0.6)
        });
    }

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
    console.log(`   Pages: ${pages.length}`);
}

// Run
generatePDF().catch(console.error);
