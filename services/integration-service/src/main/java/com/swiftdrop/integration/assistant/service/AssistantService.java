package com.swiftdrop.integration.assistant.service;

import com.swiftdrop.integration.assistant.client.LlmClient;
import com.swiftdrop.integration.assistant.tools.AssistantTools;
import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClientException;

@Service
public class AssistantService {

    private static final Pattern TRACKING = Pattern.compile("SD-\\d{8}-[A-Z0-9]{6}", Pattern.CASE_INSENSITIVE);
    private static final Pattern WEIGHT = Pattern.compile("(\\d+(?:\\.\\d+)?)\\s*kg", Pattern.CASE_INSENSITIVE);
    private static final Pattern DISTRICTS = Pattern.compile(
            "\\bfrom\\s+([A-Za-z][A-Za-z -]{1,40}?)\\s+to\\s+([A-Za-z][A-Za-z -]{1,40}?)(?=[?!.,;]*\\s*(?:for|at|with|$))",
            Pattern.CASE_INSENSITIVE);
    private static final Pattern DISTRICTS_TO_FROM = Pattern.compile(
            "\\bto\\s+([A-Za-z][A-Za-z -]{1,40}?)\\s+from\\s+([A-Za-z][A-Za-z -]{1,40}?)(?=[?!.,;]*\\s*(?:for|at|with|$))",
            Pattern.CASE_INSENSITIVE);
    private static final Pattern SIZE = Pattern.compile("\\b(small|medium|large)\\b", Pattern.CASE_INSENSITIVE);
    private final LlmClient llmClient;
    private final AssistantTools tools;

    public AssistantService(LlmClient llmClient, AssistantTools tools) {
        this.llmClient = llmClient;
        this.tools = tools;
    }

    private static final String OUT_OF_SCOPE_MESSAGE =
            "I am your SwiftDrop Delivery Assistant. I can only answer questions regarding your own SwiftDrop parcels, shipment tracking, delivery status, or shipping fee estimates. Please ask a question related to your parcel deliveries.";

    public String answer(String message, String conversationId, String callerToken) {
        String question = message.trim();
        String lower = question.toLowerCase(Locale.ROOT);
        String tracking = trackingNumber(question);
        String facts;

        if (isUnsupported(lower)) {
            return OUT_OF_SCOPE_MESSAGE;
        }
        if (isGreetingOrHelp(lower)) {
            return "Hello! I am your SwiftDrop Delivery Assistant. I can help you check the status of your parcels, view tracking history, look up courier delivery details, or calculate shipping fees. How can I help with your deliveries today?";
        }

        try {
            if (isFeeQuestion(lower)) {
                facts = feeFacts(question, callerToken);
            } else if (tracking != null) {
                if (lower.contains("history") || lower.contains("timeline") || lower.contains("updated")) {
                    facts = String.valueOf(tools.getTrackingHistory(tracking, callerToken));
                } else if (lower.contains("courier") || lower.contains("assigned") || lower.contains("delivery")) {
                    facts = String.valueOf(tools.getDeliveryInformation(tracking, callerToken));
                } else {
                    facts = String.valueOf(tools.getParcelByTrackingNumber(tracking, callerToken));
                }
            } else if (isParcelListQuestion(lower)) {
                facts = String.valueOf(tools.getCustomerParcels(null, 0, 20, callerToken));
            } else if (isSummaryQuestion(lower)) {
                facts = String.valueOf(tools.getParcelSummary(callerToken));
            } else if (isParcelQuestion(lower)) {
                return "Please provide the tracking number so I can check the correct parcel.";
            } else {
                return OUT_OF_SCOPE_MESSAGE;
            }
        } catch (com.swiftdrop.integration.assistant.tools.AssistantToolsImpl.ParcelNotFoundException ex) {
            return "I could not find that parcel among your SwiftDrop parcels.";
        } catch (IllegalArgumentException ex) {
            return ex.getMessage();
        } catch (RestClientException | IllegalStateException ex) {
            return "SwiftDrop parcel information is temporarily unavailable. Please try again later.";
        }

        try {
            return llmClient.chat(
                    "Answer the SwiftDrop customer question using only these retrieved facts. "
                            + "If a fact is absent, say it is unavailable. Never invent statuses, people, dates, or prices.\n"
                            + "Question: " + question + "\nRetrieved facts: " + facts,
                    conversationId, callerToken);
        } catch (RestClientException | IllegalStateException ex) {
            return "The SwiftDrop assistant is temporarily unavailable. Please try again later.";
        }
    }

    private String feeFacts(String question, String token) {
        Matcher weight = WEIGHT.matcher(question);
        Matcher districts = DISTRICTS.matcher(question);
        Matcher districtsToFrom = DISTRICTS_TO_FROM.matcher(question);
        Matcher size = SIZE.matcher(question);

        String pickup;
        String destination;
        if (districts.find()) {
            pickup = districts.group(1).trim();
            destination = districts.group(2).trim();
        } else if (districtsToFrom.find()) {
            destination = districtsToFrom.group(1).trim();
            pickup = districtsToFrom.group(2).trim();
        } else {
            return "A fee quote needs pickup district, destination district, weight in kg, and parcel size.";
        }

        double weightKg = weight.find() ? Double.parseDouble(weight.group(1)) : 1.0;
        String sizeCategory = size.find() ? size.group(1).toUpperCase(Locale.ROOT) : "MEDIUM";

        return String.valueOf(tools.estimateFee(
                pickup, destination, weightKg, sizeCategory, token));
    }

    private static boolean isGreetingOrHelp(String lower) {
        return lower.equals("hello") || lower.equals("hi") || lower.equals("hey")
                || lower.equals("help") || lower.contains("what can you do")
                || lower.contains("who are you") || lower.contains("how can you help");
    }

    private static boolean isParcelListQuestion(String lower) {
        return lower.contains("my parcels") || lower.contains("all parcel") || lower.contains("list parcel")
                || lower.contains("show parcel") || lower.contains("recent parcel") || lower.contains("shipment")
                || lower.contains("my deliveries") || lower.contains("all deliveries") || lower.contains("my orders")
                || lower.contains("all orders") || lower.contains("what parcels") || lower.contains("show all")
                || lower.contains("list all");
    }

    private static boolean isFeeQuestion(String lower) {
        return lower.contains("fee") || lower.contains("price") || lower.contains("cost") || lower.contains("quote")
                || lower.contains("how much") || lower.contains("rate") || lower.contains("estimate");
    }

    private static boolean isSummaryQuestion(String lower) {
        return lower.contains("recent") || lower.contains("delivered") || lower.contains("delayed")
                || lower.contains("summary");
    }

    private static boolean isParcelQuestion(String lower) {
        return lower.contains("parcel") || lower.contains("track") || lower.contains("status")
                || lower.contains("where") || lower.contains("courier") || lower.contains("updated")
                || lower.contains("delivery") || lower.contains("package");
    }

    private static boolean isUnsupported(String lower) {
        return lower.contains("password") || lower.contains("refund") || lower.contains("weather")
                || lower.contains("politics") || lower.contains("shell") || lower.contains("sql");
    }

    private static String trackingNumber(String question) {
        Matcher matcher = TRACKING.matcher(question);
        return matcher.find() ? matcher.group().toUpperCase(Locale.ROOT) : null;
    }

}
