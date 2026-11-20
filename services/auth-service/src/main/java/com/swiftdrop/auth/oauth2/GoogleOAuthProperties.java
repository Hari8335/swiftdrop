package com.swiftdrop.auth.oauth2;

import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import java.io.BufferedReader;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;

@Component
@ConfigurationProperties(prefix = "swiftdrop.security.oauth2.google")
public class GoogleOAuthProperties {

    private static final Logger log = LoggerFactory.getLogger(GoogleOAuthProperties.class);

    private String clientId;
    private String clientSecret;
    private String redirectUri = "http://localhost:8081/api/v1/auth/oauth2/callback/google";
    private String authUrl = "https://accounts.google.com/o/oauth2/v2/auth";
    private String tokenUrl = "https://oauth2.googleapis.com/token";
    private String frontendCallbackUrl = "http://localhost:4200/auth/callback";

    @PostConstruct
    public void initFromEnvFileIfMissing() {
        if (isConfigured()) {
            return;
        }

        List<Path> candidatePaths = List.of(
                Paths.get("deploy/.env"),
                Paths.get(".env"),
                Paths.get("../deploy/.env"),
                Paths.get("../../deploy/.env")
        );

        for (Path path : candidatePaths) {
            if (Files.isRegularFile(path)) {
                log.info("Loading Google OAuth properties from {}", path.toAbsolutePath());
                loadFromEnvFile(path);
                if (isConfigured()) {
                    break;
                }
            }
        }
    }

    private void loadFromEnvFile(Path path) {
        try (BufferedReader reader = Files.newBufferedReader(path)) {
            String line;
            while ((line = reader.readLine()) != null) {
                line = line.trim();
                if (line.isEmpty() || line.startsWith("#")) {
                    continue;
                }
                int eqIdx = line.indexOf('=');
                if (eqIdx > 0) {
                    String key = line.substring(0, eqIdx).trim();
                    String val = line.substring(eqIdx + 1).trim();
                    if ((val.startsWith("\"") && val.endsWith("\"")) || (val.startsWith("'") && val.endsWith("'"))) {
                        val = val.substring(1, val.length() - 1);
                    }
                    if (!val.isBlank()) {
                        switch (key) {
                            case "GOOGLE_CLIENT_ID" -> {
                                if (!hasText(clientId)) clientId = val;
                            }
                            case "GOOGLE_CLIENT_SECRET" -> {
                                if (!hasText(clientSecret)) clientSecret = val;
                            }
                            case "GOOGLE_REDIRECT_URI" -> {
                                if (!hasText(redirectUri)) redirectUri = val;
                            }
                            case "GOOGLE_FRONTEND_CALLBACK_URL" -> {
                                if (!hasText(frontendCallbackUrl)) frontendCallbackUrl = val;
                            }
                        }
                    }
                }
            }
        } catch (Exception e) {
            log.warn("Could not read env file {}: {}", path, e.getMessage());
        }
    }

    public String getClientId() {
        return clientId;
    }

    public void setClientId(String clientId) {
        this.clientId = clientId;
    }

    public String getClientSecret() {
        return clientSecret;
    }

    public void setClientSecret(String clientSecret) {
        this.clientSecret = clientSecret;
    }

    public String getRedirectUri() {
        return redirectUri;
    }

    public void setRedirectUri(String redirectUri) {
        this.redirectUri = redirectUri;
    }

    public String getAuthUrl() {
        return authUrl;
    }

    public void setAuthUrl(String authUrl) {
        this.authUrl = authUrl;
    }

    public String getTokenUrl() {
        return tokenUrl;
    }

    public void setTokenUrl(String tokenUrl) {
        this.tokenUrl = tokenUrl;
    }

    public String getFrontendCallbackUrl() {
        return frontendCallbackUrl;
    }

    public void setFrontendCallbackUrl(String frontendCallbackUrl) {
        this.frontendCallbackUrl = frontendCallbackUrl;
    }

    public boolean isConfigured() {
        return hasText(clientId) && hasText(clientSecret) && hasText(redirectUri);
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }
}

