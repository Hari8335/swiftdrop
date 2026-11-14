package com.swiftdrop.integration.merchant;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Component;

@Component
public class MerchantApprovalMailSender {

    private static final Logger log = LoggerFactory.getLogger(MerchantApprovalMailSender.class);
    private static final String DEFAULT_SENDER_EMAIL = "noreply@swiftdrop.com";

    private final JavaMailSender mailSender;
    private final String senderEmail;

    public MerchantApprovalMailSender(
            JavaMailSender mailSender,
            @Value("${spring.mail.username:}") String configuredUsername) {
        this.mailSender = mailSender;
        this.senderEmail = configuredUsername == null || configuredUsername.isBlank()
                ? DEFAULT_SENDER_EMAIL
                : configuredUsername;
    }

    public void sendApprovalEmail(String recipientEmail, String businessName, String temporaryPassword) {
        if (temporaryPassword == null || !temporaryPassword.matches("\\d{6}")) {
            log.error("Merchant approval succeeded but no valid temporary password was available for approval email");
            return;
        }
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(senderEmail);
        message.setTo(recipientEmail);
        message.setSubject("Your SwiftDrop merchant account is approved");
        message.setText("""
                Hello %s,

                Your SwiftDrop merchant registration has been approved.
                Sign in to the SwiftDrop Merchant Portal with these temporary credentials:

                Email: %s
                Temporary password: %s

                You will be asked to create a new password after your first sign-in.

                If you did not submit this registration, please contact SwiftDrop support.

                Regards,
                SwiftDrop Merchant Support
                """.formatted(businessName, recipientEmail, temporaryPassword));

        try {
            mailSender.send(message);
            log.info("Merchant approval email sent to recipient");
        } catch (RuntimeException exception) {
            log.error("Merchant approval succeeded but approval email could not be sent: {}",
                    exception.getMessage(), exception);
        }
    }
}
