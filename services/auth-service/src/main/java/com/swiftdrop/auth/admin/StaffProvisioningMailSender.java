package com.swiftdrop.auth.admin;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Component;

@Component
public class StaffProvisioningMailSender {

    private static final Logger log = LoggerFactory.getLogger(StaffProvisioningMailSender.class);
    private static final String DEFAULT_SENDER_EMAIL = "noreply@swiftdrop.com";

    private final JavaMailSender mailSender;
    private final String senderEmail;

    public StaffProvisioningMailSender(
            @Autowired(required = false) JavaMailSender mailSender,
            @Value("${spring.mail.username:}") String configuredUsername) {
        this.mailSender = mailSender;
        this.senderEmail = configuredUsername == null || configuredUsername.isBlank()
                ? DEFAULT_SENDER_EMAIL
                : configuredUsername;
    }

    public void sendProvisioningEmail(String recipientEmail, String fullName, String role, String temporaryPassword) {
        if (mailSender == null) {
            log.warn("JavaMailSender is not configured; skipping staff provisioning email to {}", recipientEmail);
            return;
        }
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(senderEmail);
            message.setTo(recipientEmail);
            message.setSubject("Your SwiftDrop %s account has been provisioned".formatted(role));
            message.setText("""
                    Hello %s,

                    An administrator has provisioned your SwiftDrop %s account.
                    Sign in to the SwiftDrop Portal with these temporary credentials:

                    Email: %s
                    Temporary password: %s
                    Role: %s

                    You will be asked to create a new password after your first sign-in.

                    If you were not expecting this account, please contact SwiftDrop support immediately.

                    Regards,
                    SwiftDrop Operations & Administration
                    """.formatted(fullName, role, recipientEmail, temporaryPassword, role));

            mailSender.send(message);
            log.info("Staff provisioning email successfully sent to recipient: {}", recipientEmail);
        } catch (Exception e) {
            log.error("Failed to send staff provisioning email to {}: {}", recipientEmail, e.getMessage(), e);
        }
    }
}
