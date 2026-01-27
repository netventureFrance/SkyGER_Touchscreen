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
        const footerHeight = 25;
        const contentTop = PAGE_HEIGHT - 50;
        const contentBottom = footerHeight + 5;

        // Draw light gray content background (full width, above footer)
        page.drawRectangle({
            x: MARGIN,
            y: contentBottom,
            width: PAGE_WIDTH - MARGIN * 2,
            height: contentTop - contentBottom,
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

        // Metadata on right side (inside gray area)
        const metaX = PAGE_WIDTH - MARGIN - 110;
        let metaY = contentTop - 15;

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

        // Footer bar layout matching PDF template
        const fh = footerHeight;
        const orangeEnd = PAGE_WIDTH * 0.62;
        const diag1Width = 35;  // Diagonal width for orange->gray transition
        const grayEnd = PAGE_WIDTH - 60;
        const diag2Width = 25;  // Diagonal width for gray->white transition

        // 1. White/light background (full width)
        page.drawRectangle({
            x: 0, y: 0,
            width: PAGE_WIDTH,
            height: fh,
            color: rgb(1, 1, 1)
        });

        // 2. Gray section
        page.drawRectangle({
            x: orangeEnd - diag1Width, y: 0,
            width: grayEnd - orangeEnd + diag1Width + diag2Width,
            height: fh,
            color: footerGray
        });

        // 3. Orange section (main rectangle)
        page.drawRectangle({
            x: 0, y: 0,
            width: orangeEnd,
            height: fh,
            color: orangeColor
        });

        // 4. Orange diagonal extension (triangle pointing right-up)
        const orangeDiag = `M ${orangeEnd} 0 L ${orangeEnd} ${fh} L ${orangeEnd + diag1Width} ${fh} Z`;
        page.drawSvgPath(orangeDiag, { x: 0, y: 0, color: orangeColor });

        // 5. White diagonal cut over gray (creates second angled edge)
        const whiteDiag = `M ${grayEnd} 0 L ${grayEnd + diag2Width} ${fh} L ${PAGE_WIDTH} ${fh} L ${PAGE_WIDTH} 0 Z`;
        page.drawSvgPath(whiteDiag, { x: 0, y: 0, color: rgb(1, 1, 1) });

        // 6. White diagonal line (thin separator)
        page.drawLine({
            start: { x: grayEnd + 2, y: 0 },
            end: { x: grayEnd + diag2Width + 2, y: fh },
            thickness: 2,
            color: rgb(1, 1, 1)
        });

        // Footer title
        page.drawText('SKY SUPER TOUCH', {
            x: 15,
            y: 9,
            size: 11,
            font: fontBold,
            color: rgb(1, 1, 1)
        });

        // Logo + netventure.tv tightly together (no gap)
        const logoX = orangeEnd + diag1Width + 10;
        if (logoImage) {
            const footerLogoDims = logoImage.scale(0.055);
            page.drawImage(logoImage, {
                x: logoX,
                y: (fh - footerLogoDims.height) / 2,
                width: footerLogoDims.width,
                height: footerLogoDims.height
            });
            // Text touching logo (no gap)
            page.drawText('netventure.tv', {
                x: logoX + footerLogoDims.width - 1,
                y: 8,
                size: 10,
                font: fontBold,
                color: rgb(0.45, 0.45, 0.45)
            });
        }

        // Page number
        page.drawText(`${i + 1}`, {
            x: PAGE_WIDTH - 25,
            y: 9,
            size: 10,
            font: font,
            color: rgb(0.5, 0.5, 0.5)
        });
    }

    // Add contact page at the end
    console.log('\nAdding contact page...');
    const contactPage = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);

    // Contact page footer height
    const contactFooterH = 55;

    // Light gray background for content area
    contactPage.drawRectangle({
        x: MARGIN,
        y: contactFooterH + 10,
        width: PAGE_WIDTH - MARGIN * 2,
        height: PAGE_HEIGHT - contactFooterH - MARGIN - 20,
        color: lightGray
    });

    // KONTAKT heading (right aligned)
    contactPage.drawText('KONTAKT', {
        x: PAGE_WIDTH - MARGIN - 85,
        y: PAGE_HEIGHT - 70,
        size: 22,
        font: fontBold,
        color: rgb(0.25, 0.25, 0.25)
    });

    // Contact 1: Burak Serc (right aligned)
    const contactX = PAGE_WIDTH - MARGIN - 30;
    let contactY = PAGE_HEIGHT - 160;

    contactPage.drawText('Burak Serc', {
        x: contactX - 120,
        y: contactY,
        size: 13,
        font: fontBold,
        color: orangeColor
    });
    contactY -= 16;
    contactPage.drawText('mobile +172 769 76 33', {
        x: contactX - 120,
        y: contactY,
        size: 9,
        font: font,
        color: rgb(0.4, 0.4, 0.4)
    });
    contactY -= 13;
    contactPage.drawText('b.serc@netventure.tv', {
        x: contactX - 120,
        y: contactY,
        size: 9,
        font: font,
        color: rgb(0.4, 0.4, 0.4)
    });

    // Contact 2: Birnur Yildirim
    contactY -= 35;
    contactPage.drawText('Birnur Yildirim', {
        x: contactX - 120,
        y: contactY,
        size: 13,
        font: fontBold,
        color: orangeColor
    });
    contactY -= 16;
    contactPage.drawText('mobile +49 172 - 829 06 04', {
        x: contactX - 120,
        y: contactY,
        size: 9,
        font: font,
        color: rgb(0.4, 0.4, 0.4)
    });
    contactY -= 13;
    contactPage.drawText('b.yildirim@netventure.tv', {
        x: contactX - 120,
        y: contactY,
        size: 9,
        font: font,
        color: rgb(0.4, 0.4, 0.4)
    });

    // Company name
    contactY -= 45;
    contactPage.drawText('netventure production GmbH', {
        x: contactX - 175,
        y: contactY,
        size: 11,
        font: fontBold,
        color: orangeColor
    });

    // Footer info line (centered)
    contactPage.drawText('Einsteinufer 63-65 . D-10587 Berlin . office +49 30 34 38 38 30 . www.netventure.tv . mobile +49 170 226 81 02', {
        x: PAGE_WIDTH / 2 - 220,
        y: contactFooterH + 30,
        size: 7,
        font: font,
        color: rgb(0.45, 0.45, 0.45)
    });

    // Contact page footer - same style as regular pages but with different text
    const cfOrangeEnd = PAGE_WIDTH * 0.62;
    const cfDiag1 = 35;
    const cfGrayEnd = PAGE_WIDTH - 60;
    const cfDiag2 = 25;

    // White background
    contactPage.drawRectangle({ x: 0, y: 0, width: PAGE_WIDTH, height: contactFooterH, color: rgb(1, 1, 1) });

    // Gray section
    contactPage.drawRectangle({
        x: cfOrangeEnd - cfDiag1, y: 0,
        width: cfGrayEnd - cfOrangeEnd + cfDiag1 + cfDiag2,
        height: contactFooterH,
        color: footerGray
    });

    // Orange section
    contactPage.drawRectangle({ x: 0, y: 0, width: cfOrangeEnd, height: contactFooterH, color: orangeColor });

    // Orange diagonal
    const cfOrangeDiag = `M ${cfOrangeEnd} 0 L ${cfOrangeEnd} ${contactFooterH} L ${cfOrangeEnd + cfDiag1} ${contactFooterH} Z`;
    contactPage.drawSvgPath(cfOrangeDiag, { x: 0, y: 0, color: orangeColor });

    // White diagonal cut
    const cfWhiteDiag = `M ${cfGrayEnd} 0 L ${cfGrayEnd + cfDiag2} ${contactFooterH} L ${PAGE_WIDTH} ${contactFooterH} L ${PAGE_WIDTH} 0 Z`;
    contactPage.drawSvgPath(cfWhiteDiag, { x: 0, y: 0, color: rgb(1, 1, 1) });

    // Footer text
    contactPage.drawText('VIELEN DANK FUR IHRE AUFMERKSAMKEIT', {
        x: 15,
        y: 20,
        size: 13,
        font: fontBold,
        color: rgb(1, 1, 1)
    });

    // Logo + netventure.tv on gray section (no gap)
    const cfLogoX = cfOrangeEnd + cfDiag1 + 10;
    if (logoImage) {
        const cfLogoDims = logoImage.scale(0.07);
        contactPage.drawImage(logoImage, {
            x: cfLogoX,
            y: (contactFooterH - cfLogoDims.height) / 2,
            width: cfLogoDims.width,
            height: cfLogoDims.height
        });
        contactPage.drawText('netventure.tv', {
            x: cfLogoX + cfLogoDims.width - 1,
            y: 20,
            size: 12,
            font: fontBold,
            color: rgb(0.45, 0.45, 0.45)
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
    console.log(`   Pages: ${pages.length + 1} (including contact page)`);
}

// Run
generatePDF().catch(console.error);
