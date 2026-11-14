package com.swiftdrop.auth.reset;

import com.swiftdrop.auth.reset.dto.ForgotPasswordRequest;
import com.swiftdrop.auth.reset.dto.ForgotPasswordResponse;
import com.swiftdrop.auth.reset.dto.InitialPasswordChangeRequest;
import com.swiftdrop.auth.reset.dto.ResetPasswordRequest;
import com.swiftdrop.auth.reset.dto.ResetPasswordResponse;
import com.swiftdrop.auth.reset.dto.VerifyResetCodeRequest;
import com.swiftdrop.common.CorrelationIdFilter;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.slf4j.MDC;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.security.core.Authentication;

import java.util.UUID;
import java.time.Duration;

@RestController
@RequestMapping("/api/v1/auth/password")
public class PasswordResetController {

    private final PasswordResetService passwordResetService;

    public PasswordResetController(PasswordResetService passwordResetService) {
        this.passwordResetService = passwordResetService;
    }

    @PostMapping("/forgot")
    public ResponseEntity<ForgotPasswordResponse> forgotPassword(
            @Valid @RequestBody ForgotPasswordRequest request,
            HttpServletRequest httpRequest) {
        String clientIp = extractClientIp(httpRequest);
        String correlationId = getCorrelationId();
        ForgotPasswordResponse response = passwordResetService.requestPasswordReset(
                request.email(), clientIp, correlationId);
        return ResponseEntity.status(HttpStatus.ACCEPTED).body(response);
    }

    @PostMapping("/reset")
    public ResponseEntity<ResetPasswordResponse> resetPassword(
            @Valid @RequestBody ResetPasswordRequest request,
            HttpServletRequest httpRequest) {
        String clientIp = extractClientIp(httpRequest);
        String correlationId = getCorrelationId();
        PasswordResetResult result = passwordResetService.resetPassword(
                request.email(), request.token(), request.newPassword(), clientIp, correlationId);
        ResponseCookie refreshCookie = ResponseCookie.from("refresh_token", result.refreshToken())
                .httpOnly(true)
                .secure(true)
                .path("/api/v1/auth")
                .sameSite("Strict")
                .maxAge(Duration.ofDays(7))
                .build();
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, refreshCookie.toString())
                .body(result.response());
    }

    @PostMapping("/verify")
    public ResponseEntity<ForgotPasswordResponse> verifyResetCode(
            @Valid @RequestBody VerifyResetCodeRequest request,
            HttpServletRequest httpRequest) {
        passwordResetService.verifyResetCode(
                request.email(), request.token(), extractClientIp(httpRequest), getCorrelationId());
        return ResponseEntity.ok(new ForgotPasswordResponse("Reset code verified."));
    }

    @PostMapping("/initial")
    public ResponseEntity<ForgotPasswordResponse> changeInitialPassword(
            @Valid @RequestBody InitialPasswordChangeRequest request,
            Authentication authentication,
            HttpServletRequest httpRequest) {
        if (authentication == null || !authentication.isAuthenticated()
                || "anonymousUser".equals(authentication.getName())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        passwordResetService.changeInitialPassword(
                authentication.getName(), request.newPassword(), extractClientIp(httpRequest));
        return ResponseEntity.ok(new ForgotPasswordResponse("Password updated successfully."));
    }

    private String extractClientIp(HttpServletRequest request) {
        String xfHeader = request.getHeader("X-Forwarded-For");
        if (xfHeader != null && !xfHeader.isBlank()) {
            return xfHeader.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }

    private String getCorrelationId() {
        String correlationId = MDC.get(CorrelationIdFilter.CORRELATION_ID_MDC_KEY);
        return (correlationId != null && !correlationId.isBlank()) ? correlationId : UUID.randomUUID().toString();
    }
}

