package com.swiftdrop.auth.user;

import java.util.Base64;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Validates profile pictures / business logos before they are stored on a user.
 * Only raster PNG, JPEG and WebP data URLs are accepted (SVG is rejected because it can carry script),
 * the decoded payload must not exceed {@link #MAX_BYTES}, and the file signature must match the
 * declared type so a renamed file cannot slip through.
 */
public final class AvatarImagePolicy {

    public static final int MAX_BYTES = 200 * 1024;

    private static final Pattern DATA_URL =
            Pattern.compile("^data:image/(png|jpeg|webp);base64,([A-Za-z0-9+/]+={0,2})$");

    private AvatarImagePolicy() {
    }

    /**
     * @return the normalized data URL to persist
     * @throws IllegalArgumentException with a user-facing message when the image is not acceptable
     */
    public static String validate(String dataUrl) {
        if (dataUrl == null || dataUrl.isBlank()) {
            throw new IllegalArgumentException("Image is required");
        }
        String trimmed = dataUrl.trim();
        // Reject absurd payloads before running the regex or decoding.
        if (trimmed.length() > (MAX_BYTES / 3 + 1) * 4 + 64) {
            throw new IllegalArgumentException("Image must be 200 KB or smaller");
        }
        Matcher matcher = DATA_URL.matcher(trimmed);
        if (!matcher.matches()) {
            throw new IllegalArgumentException("Image must be a PNG, JPEG or WebP file");
        }
        String type = matcher.group(1);
        byte[] bytes;
        try {
            bytes = Base64.getDecoder().decode(matcher.group(2));
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Image data is not valid base64");
        }
        if (bytes.length == 0) {
            throw new IllegalArgumentException("Image is required");
        }
        if (bytes.length > MAX_BYTES) {
            throw new IllegalArgumentException("Image must be 200 KB or smaller");
        }
        if (!signatureMatches(type, bytes)) {
            throw new IllegalArgumentException("Image content does not match its file type");
        }
        return trimmed;
    }

    private static boolean signatureMatches(String type, byte[] b) {
        return switch (type) {
            case "png" -> b.length >= 8
                    && (b[0] & 0xFF) == 0x89 && b[1] == 'P' && b[2] == 'N' && b[3] == 'G'
                    && b[4] == 0x0D && b[5] == 0x0A && b[6] == 0x1A && b[7] == 0x0A;
            case "jpeg" -> b.length >= 3
                    && (b[0] & 0xFF) == 0xFF && (b[1] & 0xFF) == 0xD8 && (b[2] & 0xFF) == 0xFF;
            case "webp" -> b.length >= 12
                    && b[0] == 'R' && b[1] == 'I' && b[2] == 'F' && b[3] == 'F'
                    && b[8] == 'W' && b[9] == 'E' && b[10] == 'B' && b[11] == 'P';
            default -> false;
        };
    }
}
