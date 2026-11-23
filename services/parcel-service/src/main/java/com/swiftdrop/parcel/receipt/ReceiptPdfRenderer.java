package com.swiftdrop.parcel.receipt;

import com.swiftdrop.parcel.address.AddressDto;
import org.openpdf.text.Document;
import org.openpdf.text.DocumentException;
import org.openpdf.text.Element;
import org.openpdf.text.Font;
import org.openpdf.text.FontFactory;
import org.openpdf.text.PageSize;
import org.openpdf.text.Paragraph;
import org.openpdf.text.Phrase;
import org.openpdf.text.pdf.PdfPCell;
import org.openpdf.text.pdf.PdfPTable;
import org.openpdf.text.pdf.PdfWriter;
import org.springframework.stereotype.Component;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.Locale;
import java.util.StringJoiner;

/**
 * Builds the one-page receipt PDF with OpenPDF (docs/tracking-design.md section 8).
 * Table cells wrap long text, and missing optional values are shown as a dash.
 * Values in Sinhala or Tamil use the bundled Noto fonts (ReceiptFonts); Latin text stays Helvetica.
 */
@Component
class ReceiptPdfRenderer {

    static final String MISSING = "-";
    /** SwiftDrop's business time zone (same as operations-service). */
    static final ZoneId BUSINESS_ZONE = ZoneId.of("Asia/Colombo");
    private static final DateTimeFormatter DATE_TIME =
            DateTimeFormatter.ofPattern("dd MMM yyyy, HH:mm", Locale.ENGLISH).withZone(BUSINESS_ZONE);

    // SwiftDrop brand palette, matching the web app (terracotta accent on warm neutrals).
    private static final Color BRAND = new Color(0x9B, 0x43, 0x2F);
    private static final Color BRAND_TINT = new Color(0xFA, 0xF0, 0xEC);
    private static final Color INK = new Color(0x21, 0x1F, 0x32);
    private static final Color MUTED = new Color(0x6F, 0x6D, 0x85);
    private static final Color RULE = new Color(0xEE, 0xE7, 0xE0);
    private static final Color ON_BRAND_MUTED = new Color(0xF2, 0xDE, 0xD8);
    private static final Color SURFACE = new Color(0xFA, 0xF8, 0xF6);
    private static final Color SUCCESS = new Color(0x1E, 0x7A, 0x43);
    private static final Color SUCCESS_TINT = new Color(0xE6, 0xF4, 0xEA);

    private final Font brandName = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 22, Color.WHITE);
    private final Font brandTagline = FontFactory.getFont(FontFactory.HELVETICA, 9, ON_BRAND_MUTED);
    private final Font docTitle = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 13, Color.WHITE);
    private final Font docReference = FontFactory.getFont(FontFactory.HELVETICA, 9, ON_BRAND_MUTED);
    private final Font eyebrow = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 8, MUTED);
    private final Font headline = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 15, INK);
    private final Font amountFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 20, BRAND);
    private final Font badgeFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 9, SUCCESS);
    private final Font arrowFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 22, BRAND);
    private final Font totalFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 12, BRAND);
    private final Font section = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 12, INK);
    private final Font label = FontFactory.getFont(FontFactory.HELVETICA, 10, MUTED);
    private final Font value = FontFactory.getFont(FontFactory.HELVETICA, 10, INK);
    private final Font strong = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 11, INK);
    private final Font footer = FontFactory.getFont(FontFactory.HELVETICA, 8, MUTED);

    byte[] render(ReceiptData data) {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        Document document = new Document(PageSize.A4, 48, 48, 36, 36);
        try {
            ReceiptFonts fonts = ReceiptFonts.get();
            PdfWriter.getInstance(document, out);
            document.addTitle("SwiftDrop receipt " + data.trackingNumber());
            document.addCreator("SwiftDrop parcel-service");
            document.open();

            document.add(header(data));
            document.add(summary(data));

            addSection(document, "Route", route(fonts, data));

            String size = data.size() != null ? capitalize(data.size().name()) : MISSING;
            PdfPTable parcel = table();
            row(fonts, parcel, "Parcel ID", text(data.parcelId()), value);
            row(fonts, parcel, "Size", size, value);
            row(fonts, parcel, "Weight", weight(data.weightKg()), value);
            row(fonts, parcel, "Created", date(data.createdAt()), value);
            row(fonts, parcel, "Delivered", date(data.deliveredAt()), value);
            addSection(document, "Parcel details", parcel);

            addSection(document, "Charges", charges(data, size));

            Paragraph generated = new Paragraph(
                    "Generated " + date(data.generatedAt()) + " (Sri Lanka time). "
                            + "This receipt confirms the delivery of the parcel above.", footer);
            generated.setSpacingBefore(14);
            document.add(generated);

            document.close();
        } catch (RuntimeException e) {
            // Includes OpenPDF's DocumentException, which is unchecked in OpenPDF 3.
            throw new ReceiptGenerationException(e);
        } finally {
            if (document.isOpen()) {
                document.close();
            }
        }
        return out.toByteArray();
    }

    // ------------------------------------------------------------------ formatting

    static String date(Instant instant) {
        return instant == null ? MISSING : DATE_TIME.format(instant);
    }

    static String fee(BigDecimal fee) {
        return fee == null ? MISSING : "LKR " + String.format(Locale.ENGLISH, "%,.2f", fee.setScale(2, RoundingMode.HALF_UP));
    }

    static String weight(BigDecimal weightKg) {
        return weightKg == null ? MISSING : weightKg.stripTrailingZeros().toPlainString() + " kg";
    }

    static String address(AddressDto address) {
        if (address == null) {
            return MISSING;
        }
        StringJoiner joined = new StringJoiner(", ");
        for (String part : new String[] {address.line1(), address.line2(), address.city(), address.district(), address.postalCode()}) {
            if (part != null && !part.isBlank()) {
                joined.add(part.trim());
            }
        }
        return joined.length() == 0 ? MISSING : joined.toString();
    }

    static String text(String value) {
        return value == null || value.isBlank() ? MISSING : value.trim();
    }

    private static String capitalize(String name) {
        return name.charAt(0) + name.substring(1).toLowerCase(Locale.ENGLISH);
    }

    // ------------------------------------------------------------------ layout

    /** Brand band: name and tagline on the left, document title and tracking number on the right. */
    private PdfPTable header(ReceiptData data) {
        PdfPTable band = new PdfPTable(2);
        band.setWidthPercentage(100);
        band.setWidths(new float[] {1.4f, 1f});

        PdfPCell brand = bandCell(Element.ALIGN_LEFT);
        brand.addElement(new Paragraph("SwiftDrop", brandName));
        brand.addElement(new Paragraph("Parcel delivery across Sri Lanka", brandTagline));
        band.addCell(brand);

        PdfPCell title = bandCell(Element.ALIGN_RIGHT);
        Paragraph heading = new Paragraph("Delivery receipt", docTitle);
        heading.setAlignment(Element.ALIGN_RIGHT);
        title.addElement(heading);
        Paragraph reference = new Paragraph(text(data.trackingNumber()), docReference);
        reference.setAlignment(Element.ALIGN_RIGHT);
        title.addElement(reference);
        band.addCell(title);
        return band;
    }

    /** Two cards under the header: tracking number with the Delivered badge, and the amount paid. */
    private PdfPTable summary(ReceiptData data) {
        PdfPTable cards = new PdfPTable(3);
        cards.setWidthPercentage(100);
        cards.setWidths(new float[] {1f, 0.06f, 1f});
        cards.setSpacingBefore(14);

        PdfPCell tracking = card();
        tracking.addElement(new Paragraph("TRACKING NUMBER", eyebrow));
        Paragraph number = new Paragraph(text(data.trackingNumber()), headline);
        number.setSpacingBefore(4);
        tracking.addElement(number);
        tracking.addElement(statusBadge("Delivered"));
        cards.addCell(tracking);

        cards.addCell(gap());

        PdfPCell amount = card();
        amount.addElement(new Paragraph("AMOUNT PAID", eyebrow));
        Paragraph total = new Paragraph(fee(data.fee()), amountFont);
        total.setSpacingBefore(2);
        amount.addElement(total);
        Paragraph when = new Paragraph("Delivered on " + date(data.deliveredAt()), label);
        when.setSpacingBefore(4);
        amount.addElement(when);
        cards.addCell(amount);
        return cards;
    }

    /**
     * Pickup and drop-off side by side, with the recipient under the drop-off. Each address and the
     * recipient appear once, in the font that matches their script (Sinhala, Tamil or Latin).
     */
    private PdfPTable route(ReceiptFonts fonts, ReceiptData data) {
        PdfPTable route = new PdfPTable(3);
        route.setWidthPercentage(100);
        route.setWidths(new float[] {1f, 0.06f, 1f});

        PdfPCell from = card();
        from.setBackgroundColor(SURFACE);
        from.addElement(new Paragraph("FROM  ·  PICKUP", eyebrow));
        from.addElement(spaced(fonts.phrase(address(data.pickupAddress()), value, false), 4));
        route.addCell(from);

        PdfPCell arrow = gap();
        arrow.setVerticalAlignment(Element.ALIGN_MIDDLE);
        arrow.setHorizontalAlignment(Element.ALIGN_CENTER);
        arrow.setPhrase(new Phrase("›", arrowFont));
        route.addCell(arrow);

        PdfPCell to = card();
        to.setBackgroundColor(SURFACE);
        to.addElement(new Paragraph("TO  ·  DROP-OFF", eyebrow));
        to.addElement(spaced(fonts.phrase(address(data.dropoffAddress()), value, false), 4));
        Paragraph recipientLabel = new Paragraph("RECIPIENT", eyebrow);
        recipientLabel.setSpacingBefore(10);
        to.addElement(recipientLabel);
        // Regular weight, as before: names in Sinhala or Tamil keep using the regular Noto fonts.
        to.addElement(spaced(fonts.phrase(text(data.recipientName()), value, false), 3));
        route.addCell(to);
        return route;
    }

    private static Paragraph spaced(Phrase phrase, float before) {
        Paragraph paragraph = new Paragraph(phrase);
        paragraph.setSpacingBefore(before);
        return paragraph;
    }

    private PdfPTable statusBadge(String status) {
        PdfPTable badge = new PdfPTable(1);
        badge.setHorizontalAlignment(Element.ALIGN_LEFT);
        badge.setTotalWidth(72);
        badge.setLockedWidth(true);
        badge.setSpacingBefore(8);
        PdfPCell cell = new PdfPCell(new Phrase(status, badgeFont));
        cell.setBorder(PdfPCell.NO_BORDER);
        cell.setBackgroundColor(SUCCESS_TINT);
        cell.setHorizontalAlignment(Element.ALIGN_CENTER);
        cell.setPaddingTop(3);
        cell.setPaddingBottom(5);
        badge.addCell(cell);
        return badge;
    }

    private static PdfPCell card() {
        PdfPCell cell = new PdfPCell();
        cell.setBorderColor(RULE);
        cell.setBorderWidth(1);
        cell.setPadding(14);
        cell.setPaddingTop(10);
        return cell;
    }

    private static PdfPCell gap() {
        PdfPCell cell = new PdfPCell();
        cell.setBorder(PdfPCell.NO_BORDER);
        return cell;
    }

    private static PdfPCell bandCell(int alignment) {
        PdfPCell cell = new PdfPCell();
        cell.setBorder(PdfPCell.NO_BORDER);
        cell.setBackgroundColor(BRAND);
        cell.setPadding(16);
        cell.setPaddingTop(12);
        cell.setHorizontalAlignment(alignment);
        cell.setVerticalAlignment(Element.ALIGN_MIDDLE);
        return cell;
    }

    private void addSection(Document document, String heading, PdfPTable table) throws DocumentException {
        Paragraph title = new Paragraph(heading, section);
        title.setSpacingBefore(8);
        title.setSpacingAfter(4);
        document.add(title);
        document.add(table);
    }

    private static PdfPTable table() throws DocumentException {
        PdfPTable table = new PdfPTable(2);
        table.setWidthPercentage(100);
        table.setWidths(new float[] {1.2f, 3f});
        return table;
    }

    /**
     * Labels are fixed English text; values may contain Sinhala or Tamil (names, addresses).
     * Every other row gets a light background so long tables are easy to follow.
     */
    private void row(ReceiptFonts fonts, PdfPTable table, String name, String content, Font font) {
        boolean striped = (table.size() % 2) == 1;
        PdfPCell labelCell = cell(new Phrase(name, label));
        PdfPCell valueCell = cell(fonts.phrase(content, font, font == strong));
        if (striped) {
            labelCell.setBackgroundColor(SURFACE);
            valueCell.setBackgroundColor(SURFACE);
        }
        table.addCell(labelCell);
        table.addCell(valueCell);
    }

    /** Invoice-style charges: the delivery fee line, then a highlighted total. */
    private PdfPTable charges(ReceiptData data, String size) {
        PdfPTable charges = new PdfPTable(2);
        charges.setWidthPercentage(100);
        charges.setWidths(new float[] {3f, 1.2f});

        StringJoiner basis = new StringJoiner(" · ", " (", ")").setEmptyValue("");
        if (data.size() != null) {
            basis.add(size);
        }
        if (data.weightKg() != null) {
            basis.add(weight(data.weightKg()));
        }
        charges.addCell(cell(new Phrase("Delivery fee" + basis, value)));
        PdfPCell feeCell = cell(new Phrase(fee(data.fee()), value));
        feeCell.setHorizontalAlignment(Element.ALIGN_RIGHT);
        charges.addCell(feeCell);

        PdfPCell totalLabel = cell(new Phrase("Total paid", totalFont));
        PdfPCell totalValue = cell(new Phrase(fee(data.fee()), totalFont));
        totalValue.setHorizontalAlignment(Element.ALIGN_RIGHT);
        for (PdfPCell total : new PdfPCell[] {totalLabel, totalValue}) {
            total.setBackgroundColor(BRAND_TINT);
            total.setBorder(PdfPCell.NO_BORDER);
            total.setPaddingTop(8);
            total.setPaddingBottom(9);
            charges.addCell(total);
        }
        return charges;
    }

    private static PdfPCell cell(Phrase phrase) {
        PdfPCell cell = new PdfPCell(phrase);
        cell.setBorder(PdfPCell.BOTTOM);
        cell.setBorderColor(RULE);
        cell.setPaddingTop(5);
        cell.setPaddingBottom(6);
        cell.setVerticalAlignment(Element.ALIGN_TOP);
        cell.setNoWrap(false);
        return cell;
    }

    private static Paragraph spacer(float height) {
        Paragraph spacer = new Paragraph(" ");
        spacer.setSpacingAfter(height);
        return spacer;
    }
}
