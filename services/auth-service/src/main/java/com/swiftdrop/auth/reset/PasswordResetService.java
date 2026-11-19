package com.swiftdrop.auth.reset;

import com.swiftdrop.auth.audit.AuditService;
import com.swiftdrop.auth.dto.UserSummary;
import com.swiftdrop.auth.reset.dto.ForgotPasswordResponse;
import com.swiftdrop.auth.reset.dto.ResetPasswordResponse;
import com.swiftdrop.auth.security.jwt.JwtIssuer;
import com.swiftdrop.auth.token.RefreshToken;
import com.swiftdrop.auth.token.RefreshTokenRepository;
import com.swiftdrop.auth.user.User;
import com.swiftdrop.auth.user.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Map;
import java.util.Optional;
import java.security.SecureRandom;
import java.util.UUID;

@Service
public class PasswordResetService {

    private static final Logger log = LoggerFactory.getLogger(PasswordResetService.class);
    private static final int TOKEN_EXPIRY_MINUTES = 10;
    private static final int OTP_BOUND = 1_000_000;
    private static final Duration REFRESH_TOKEN_TTL = Duration.ofDays(7);

    private final UserRepository userRepository;
    private final PasswordResetTokenRepository tokenRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final PasswordResetMailSender mailSender;
    private final AuditService auditService;
    private final JwtIssuer jwtIssuer;
    private final SecureRandom secureRandom = new SecureRandom();
    private Clock clock = Clock.systemUTC();

    public PasswordResetService(
            UserRepository userRepository,
            PasswordResetTokenRepository tokenRepository,
            RefreshTokenRepository refreshTokenRepository,
            PasswordEncoder passwordEncoder,
            PasswordResetMailSender mailSender,
            AuditService auditService,
            JwtIssuer jwtIssuer) {
        this.userRepository = userRepository;
        this.tokenRepository = tokenRepository;
        this.refreshTokenRepository = refreshTokenRepository;
        this.passwordEncoder = passwordEncoder;
        this.mailSender = mailSender;
        this.auditService = auditService;
        this.jwtIssuer = jwtIssuer;
    }

    @Autowired(required = false)
    public void setClock(Clock clock) {
        if (clock != null) {
            this.clock = clock;
        }
    }

    @Transactional
    public ForgotPasswordResponse requestPasswordReset(String email, String ipAddress, String correlationId) {
        if (email == null || email.isBlank()) {
            return new ForgotPasswordResponse();
        }

        String normalizedEmail = email.trim().toLowerCase();
        Optional<User> userOpt = userRepository.findByEmailIgnoreCase(normalizedEmail);

        if (userOpt.isEmpty()) {
            auditService.record(
                    "ANONYMOUS",
                    "ANONYMOUS",
                    "PASSWORD_RESET_REQUEST_FAILED",
                    "USER",
                    normalizedEmail,
                    Map.of("reason", "USER_NOT_FOUND", "ipAddress", ipAddress != null ? ipAddress : "UNKNOWN")
            );
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "This email is not registered yet");
        }

        User user = userOpt.get();
        if (!user.isEnabled()) {
            auditService.record(
                    user.getId(),
                    user.getRole(),
                    "PASSWORD_RESET_REQUEST_FAILED",
                    "USER",
                    normalizedEmail,
                    Map.of("reason", "USER_DISABLED", "ipAddress", ipAddress != null ? ipAddress : "UNKNOWN")
            );
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Account is disabled. Please contact support.");
        }

        Instant now = clock.instant();

        // Invalidate existing active reset tokens for this user
        tokenRepository.invalidateActiveTokensForUser(user.getId(), now);

        String rawToken = String.format("%06d", secureRandom.nextInt(OTP_BOUND));
        String tokenHash = hashToken(rawToken);

        Instant expiresAt = now.plus(TOKEN_EXPIRY_MINUTES, ChronoUnit.MINUTES);
        PasswordResetToken token = new PasswordResetToken(
                UUID.randomUUID().toString(),
                user.getId(),
                tokenHash,
                expiresAt
        );
        tokenRepository.save(token);

        // Send code to recipient via the configured SMTP provider
        mailSender.sendResetEmail(user.getEmail(), rawToken);

        // Record audit log
        auditService.record(
                user.getId(),
                user.getRole(),
                "PASSWORD_RESET_REQUESTED",
                "USER",
                user.getId(),
                Map.of("ipAddress", ipAddress != null ? ipAddress : "UNKNOWN")
        );

        return new ForgotPasswordResponse();
    }

    @Transactional
    public void verifyResetCode(String email, String rawToken, String ipAddress, String correlationId) {
        Instant now = clock.instant();
        findValidToken(email, rawToken, ipAddress, now);
    }

    @Transactional
    public PasswordResetResult resetPassword(
            String email, String rawToken, String newPassword, String ipAddress, String correlationId) {
        validatePassword(newPassword);
        Instant now = clock.instant();
        PasswordResetToken token = findValidToken(email, rawToken, ipAddress, now);
        User user = userRepository.findById(token.getUserId())
                .orElseThrow(() -> new InvalidResetTokenException("User associated with reset token not found."));

        // Atomically consume the token
        token.setConsumedAt(now);
        tokenRepository.save(token);

        // Update password using BCrypt
        user.setPasswordHash(passwordEncoder.encode(newPassword));
        userRepository.save(user);

        // Invalidate active refresh token sessions
        refreshTokenRepository.revokeByUserId(user.getId());

        // Audit log success
        auditService.record(
                user.getId(),
                user.getRole(),
                "PASSWORD_RESET_COMPLETED",
                "USER",
                user.getId(),
                Map.of("ipAddress", ipAddress != null ? ipAddress : "UNKNOWN")
        );

        String rawRefreshToken = UUID.randomUUID().toString();
        String familyId = UUID.randomUUID().toString();
        refreshTokenRepository.save(new RefreshToken(
                UUID.randomUUID().toString(),
                hashToken(rawRefreshToken),
                user.getId(),
                familyId,
                now.plus(REFRESH_TOKEN_TTL)
        ));

        String accessToken = jwtIssuer.issueAccessToken(
                user.getId(), user.getEmail(), user.getRole(), user.getMerchantId());
        UserSummary summary = new UserSummary(
                user.getId(), user.getEmail(), user.getFullName(), user.getRole(), user.getMerchantId());

        return new PasswordResetResult(
                new ResetPasswordResponse(
                        ResetPasswordResponse.DEFAULT_MESSAGE,
                        accessToken,
                        "Bearer",
                        JwtIssuer.ACCESS_TOKEN_TTL.toSeconds(),
                        summary
                ),
                rawRefreshToken
        );
    }

    @Transactional
    public void changeInitialPassword(String userId, String newPassword, String ipAddress) {
        validatePassword(newPassword);
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new InvalidResetTokenException("Authenticated user not found."));
        if (!user.isMustChangePassword()) {
            throw new InvalidResetTokenException("Initial password change is not required.");
        }
        user.setPasswordHash(passwordEncoder.encode(newPassword));
        user.setMustChangePassword(false);
        userRepository.save(user);
        auditService.record(
                user.getId(),
                user.getRole(),
                "INITIAL_PASSWORD_CHANGED",
                "USER",
                user.getId(),
                Map.of("ipAddress", ipAddress != null ? ipAddress : "UNKNOWN")
        );
    }

    private void validatePassword(String password) {
        if (password == null || password.length() < 8 || password.length() > 128) {
            throw new IllegalArgumentException("Password must be at least 8 characters");
        }
        boolean hasUpper = false;
        boolean hasDigit = false;
        boolean hasSpecial = false;
        for (char c : password.toCharArray()) {
            if (Character.isUpperCase(c)) hasUpper = true;
            if (Character.isDigit(c)) hasDigit = true;
            if (!Character.isLetterOrDigit(c)) hasSpecial = true;
        }
        if (!hasUpper || !hasDigit || !hasSpecial) {
            throw new IllegalArgumentException(
                    "Password must contain at least one uppercase letter, one number, and one special character");
        }
    }

    private PasswordResetToken findValidToken(String email, String rawToken, String ipAddress, Instant now) {
        if (rawToken == null || !rawToken.matches("\\d{6}") || email == null || email.isBlank()) {
            throw new InvalidResetTokenException("Invalid, expired, or already-used reset token.");
        }

        String tokenHash = hashToken(rawToken);
        PasswordResetToken token = tokenRepository.findByTokenHash(tokenHash)
                .orElseThrow(() -> invalidToken("TOKEN_NOT_FOUND", ipAddress));

        User user = userRepository.findById(token.getUserId())
                .orElseThrow(() -> invalidToken("USER_NOT_FOUND", ipAddress));
        if (!user.getEmail().equalsIgnoreCase(email.trim())) {
            throw invalidToken("EMAIL_MISMATCH", ipAddress);
        }
        if (token.isConsumed()) {
            throw invalidToken("TOKEN_ALREADY_USED", ipAddress, token.getUserId());
        }
        if (token.isExpired(now)) {
            throw invalidToken("TOKEN_EXPIRED", ipAddress, token.getUserId());
        }
        return token;
    }

    private InvalidResetTokenException invalidToken(String reason, String ipAddress) {
        return invalidToken(reason, ipAddress, "UNKNOWN");
    }

    private InvalidResetTokenException invalidToken(String reason, String ipAddress, String userId) {
        auditService.record(
                userId,
                "ANONYMOUS",
                "PASSWORD_RESET_REJECTED",
                "TOKEN",
                userId,
                Map.of("reason", reason, "ipAddress", ipAddress != null ? ipAddress : "UNKNOWN")
        );
        return new InvalidResetTokenException("Invalid, expired, or already-used reset token.");
    }

    public String hashToken(String rawToken) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(rawToken.getBytes(StandardCharsets.UTF_8));
            StringBuilder hexString = new StringBuilder();
            for (byte b : hash) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) {
                    hexString.append('0');
                }
                hexString.append(hex);
            }
            return hexString.toString();
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 algorithm unavailable", e);
        }
    }
}

