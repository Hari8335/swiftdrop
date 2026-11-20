package com.swiftdrop.integration;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

import java.io.BufferedReader;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;

@SpringBootApplication
public class IntegrationServiceApplication {

    private static final Logger log = LoggerFactory.getLogger(IntegrationServiceApplication.class);

    public static void main(String[] args) {
        loadDotenvIfPresent();
        SpringApplication.run(IntegrationServiceApplication.class, args);
    }

    private static void loadDotenvIfPresent() {
        List<Path> candidatePaths = List.of(
                Paths.get("deploy/.env"),
                Paths.get(".env"),
                Paths.get("../deploy/.env"),
                Paths.get("../../deploy/.env")
        );

        for (Path path : candidatePaths) {
            if (Files.isRegularFile(path)) {
                log.info("Loading environment variables from {}", path.toAbsolutePath());
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
                            String value = line.substring(eqIdx + 1).trim();
                            if ((value.startsWith("\"") && value.endsWith("\"")) ||
                                (value.startsWith("'") && value.endsWith("'"))) {
                                value = value.substring(1, value.length() - 1);
                            }
                            if (System.getProperty(key) == null) {
                                System.setProperty(key, value);
                            }
                            if (key.equals("SPRING_MAIL_HOST")) System.setProperty("spring.mail.host", value);
                            if (key.equals("SPRING_MAIL_PORT")) System.setProperty("spring.mail.port", value);
                            if (key.equals("SPRING_MAIL_USERNAME")) System.setProperty("spring.mail.username", value);
                            if (key.equals("SPRING_MAIL_PASSWORD")) System.setProperty("spring.mail.password", value);
                            if (key.equals("SPRING_MAIL_PROPERTIES_MAIL_SMTP_AUTH")) System.setProperty("spring.mail.properties.mail.smtp.auth", value);
                            if (key.equals("SPRING_MAIL_PROPERTIES_MAIL_SMTP_STARTTLS_ENABLE")) System.setProperty("spring.mail.properties.mail.smtp.starttls.enable", value);
                            if (key.equals("SPRING_MAIL_PROPERTIES_MAIL_SMTP_STARTTLS_REQUIRED")) System.setProperty("spring.mail.properties.mail.smtp.starttls.required", value);
                        }
                    }
                } catch (Exception e) {
                    log.warn("Failed to load environment variables from {}: {}", path, e.getMessage());
                }
                break;
            }
        }
    }

}
