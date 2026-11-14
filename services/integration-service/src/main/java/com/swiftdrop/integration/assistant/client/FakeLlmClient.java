package com.swiftdrop.integration.assistant.client;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Fake LLM client providing deterministic, canned responses for unit/integration tests
 * and local demonstrations without requiring external API keys.
 */
@Component
@ConditionalOnProperty(name = "swiftdrop.assistant.llm-provider", havingValue = "fake", matchIfMissing = true)
public class FakeLlmClient implements LlmClient {

    private static final Pattern FEE_PATTERN = Pattern.compile(
            "FeeEstimateResult\\[weightKg=([^,]+), sizeCategory=([^,]+), destinationDistrict=([^,]+), estimatedFee=([^,]+), currency=([^\\]]+)\\]");

    private static final Pattern SINGLE_PARCEL_PATTERN = Pattern.compile(
            "ParcelLookupResult\\[trackingNumber=([^,]+), status=([^,]+), destinationDistrict=([^,]+), courierAssigned=([^,]+), lastUpdated=([^,]+), fee=([^\\]]+)\\]");

    private static final Pattern HISTORY_HEADER_PATTERN = Pattern.compile(
            "ParcelHistoryResult\\[trackingNumber=([^,]+), currentStatus=([^,]+), entries=(\\[.*?\\])\\]");

    private static final Pattern HISTORY_ENTRY_PATTERN = Pattern.compile(
            "HistoryEntry\\[status=([^,]+), occurredAt=([^\\]]+)\\]");

    private static final Pattern DELIVERY_INFO_PATTERN = Pattern.compile(
            "DeliveryInfoResult\\[trackingNumber=([^,]+), status=([^,]+), courierAssigned=([^,]+), destinationDistrict=([^\\]]+)\\]");

    private static final Pattern SUMMARY_PATTERN = Pattern.compile(
            "ParcelSummaryResult\\[total=([^,]+), statusCounts=(\\{.*?\\})\\]");

    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("MMM d, yyyy, h:mm a")
            .withZone(ZoneId.of("Asia/Colombo"));

    @Override
    public String chat(String prompt, String conversationId, String callerToken) {
        int factsStart = prompt == null ? -1 : prompt.indexOf("Retrieved facts: ");
        String facts = factsStart >= 0 ? prompt.substring(factsStart + "Retrieved facts: ".length()).trim() : "";

        if (facts.isBlank()) {
            return "That information is unavailable from SwiftDrop.";
        }
        if (facts.contains("UNKNOWN")) {
            return "I need the pickup district and parcel size before I can calculate a fee.";
        }

        return formatFacts(facts);
    }

    private String formatFacts(String facts) {
        // 1. Fee estimate result
        Matcher feeMatcher = FEE_PATTERN.matcher(facts);
        if (feeMatcher.find()) {
            String weight = feeMatcher.group(1).trim();
            String size = feeMatcher.group(2).trim();
            String dest = feeMatcher.group(3).trim();
            String fee = feeMatcher.group(4).trim();
            String currency = feeMatcher.group(5).trim();
            return String.format(Locale.ROOT,
                    "The estimated fee to deliver a %s kg %s parcel to %s is %s %s.",
                    weight, size, dest, currency, formatCurrency(fee));
        }

        // 2. Single parcel lookup
        if (facts.startsWith("ParcelLookupResult[")) {
            Matcher singleMatcher = SINGLE_PARCEL_PATTERN.matcher(facts);
            if (singleMatcher.matches()) {
                return formatSingleParcel(singleMatcher);
            }
        }

        // 3. List of parcels
        if (facts.startsWith("[") && facts.contains("ParcelLookupResult")) {
            return formatParcelList(facts);
        }

        // 4. Tracking history
        Matcher historyMatcher = HISTORY_HEADER_PATTERN.matcher(facts);
        if (historyMatcher.find()) {
            return formatHistory(historyMatcher);
        }

        // 5. Delivery info
        Matcher deliveryMatcher = DELIVERY_INFO_PATTERN.matcher(facts);
        if (deliveryMatcher.find()) {
            return formatDeliveryInfo(deliveryMatcher);
        }

        // 6. Parcel summary
        Matcher summaryMatcher = SUMMARY_PATTERN.matcher(facts);
        if (summaryMatcher.find()) {
            return formatSummary(summaryMatcher);
        }

        // 7. Empty list
        if ("[]".equals(facts)) {
            return "You currently do not have any registered SwiftDrop parcels.";
        }

        // 8. If already conversational text without record formatting
        if (!facts.contains("[")) {
            return facts;
        }

        // Fallback: strip record headers if any unrecognized record remains
        return facts.replaceAll("[A-Za-z0-9_]+\\[", "").replace("]", "");
    }

    private String formatSingleParcel(Matcher m) {
        String tracking = m.group(1).trim();
        String status = m.group(2).trim();
        String dest = m.group(3).trim();
        boolean courierAssigned = "true".equalsIgnoreCase(m.group(4).trim());
        String lastUpdated = m.group(5).trim();
        String fee = m.group(6).trim();

        StringBuilder sb = new StringBuilder();
        sb.append("Here are the details for parcel **").append(tracking).append("**:\n");
        sb.append("• **Status:** ").append(status).append("\n");
        if (!"null".equalsIgnoreCase(dest)) {
            sb.append("• **Destination:** ").append(dest).append("\n");
        }
        sb.append("• **Courier Assigned:** ").append(courierAssigned ? "Yes" : "No").append("\n");
        if (!"null".equalsIgnoreCase(fee)) {
            sb.append("• **Fee:** LKR ").append(formatCurrency(fee)).append("\n");
        }
        if (!"null".equalsIgnoreCase(lastUpdated)) {
            sb.append("• **Last Updated:** ").append(formatDate(lastUpdated));
        }
        return sb.toString().trim();
    }

    private String formatParcelList(String facts) {
        Matcher m = SINGLE_PARCEL_PATTERN.matcher(facts);
        StringBuilder sb = new StringBuilder();
        sb.append("Here are your recent SwiftDrop parcels:\n\n");
        int count = 0;
        while (m.find()) {
            count++;
            String tracking = m.group(1).trim();
            String status = m.group(2).trim();
            String dest = m.group(3).trim();
            boolean courierAssigned = "true".equalsIgnoreCase(m.group(4).trim());
            String fee = m.group(6).trim();

            sb.append("• **").append(tracking).append("** — Status: **").append(status).append("**");
            if (!"null".equalsIgnoreCase(dest)) {
                sb.append(", Destination: ").append(dest);
            }
            if (!"null".equalsIgnoreCase(fee)) {
                sb.append(", Fee: LKR ").append(formatCurrency(fee));
            }
            if (courierAssigned) {
                sb.append(" (Courier assigned)");
            }
            sb.append("\n");
        }
        if (count == 0) {
            return "You currently do not have any registered SwiftDrop parcels.";
        }
        return sb.toString().trim();
    }

    private String formatHistory(Matcher m) {
        String tracking = m.group(1).trim();
        String currentStatus = m.group(2).trim();
        String entriesStr = m.group(3).trim();

        StringBuilder sb = new StringBuilder();
        sb.append("Here is the tracking history for parcel **").append(tracking)
                .append("** (Current Status: **").append(currentStatus).append("**):\n\n");

        Matcher em = HISTORY_ENTRY_PATTERN.matcher(entriesStr);
        int count = 0;
        while (em.find()) {
            count++;
            String status = em.group(1).trim();
            String time = em.group(2).trim();
            sb.append("• **").append(status).append("** — ").append(formatDate(time)).append("\n");
        }
        if (count == 0) {
            sb.append("No tracking events recorded yet.\n");
        }
        return sb.toString().trim();
    }

    private String formatDeliveryInfo(Matcher m) {
        String tracking = m.group(1).trim();
        String status = m.group(2).trim();
        boolean courierAssigned = "true".equalsIgnoreCase(m.group(3).trim());
        String dest = m.group(4).trim();

        StringBuilder sb = new StringBuilder();
        sb.append("Here is the delivery information for parcel **").append(tracking).append("**:\n");
        sb.append("• **Status:** ").append(status).append("\n");
        sb.append("• **Courier Assigned:** ").append(courierAssigned ? "Yes" : "No").append("\n");
        if (!"null".equalsIgnoreCase(dest)) {
            sb.append("• **Destination District:** ").append(dest).append("\n");
        }
        return sb.toString().trim();
    }

    private String formatSummary(Matcher m) {
        String total = m.group(1).trim();
        String countsStr = m.group(2).trim();

        StringBuilder sb = new StringBuilder();
        sb.append("Here is a summary of your SwiftDrop parcels:\n");
        sb.append("• **Total Parcels:** ").append(total).append("\n");

        String counts = countsStr.replace("{", "").replace("}", "").trim();
        if (!counts.isEmpty()) {
            for (String part : counts.split(",")) {
                String[] kv = part.trim().split("=");
                if (kv.length == 2) {
                    sb.append("• **").append(kv[0].trim()).append(":** ").append(kv[1].trim()).append("\n");
                }
            }
        }
        return sb.toString().trim();
    }

    private String formatCurrency(String fee) {
        try {
            double val = Double.parseDouble(fee);
            return String.format(Locale.US, "%,.2f", val);
        } catch (Exception e) {
            return fee;
        }
    }

    private String formatDate(String iso) {
        try {
            Instant instant = Instant.parse(iso);
            return DATE_FORMATTER.format(instant);
        } catch (Exception e) {
            return iso;
        }
    }
}
