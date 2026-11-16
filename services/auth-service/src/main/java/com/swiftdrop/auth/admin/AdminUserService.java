package com.swiftdrop.auth.admin;

import com.swiftdrop.auth.admin.dto.*;
import com.swiftdrop.auth.event.AuthEventPublisher;
import com.swiftdrop.auth.user.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@Service
public class AdminUserService {

    private static final Set<String> ALLOWED_STAFF_ROLES = Set.of("COURIER", "DISPATCHER");
    private static final String LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

    private final AdminUserRepository adminUserRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthEventPublisher authEventPublisher;
    private final StaffProvisioningMailSender staffProvisioningMailSender;
    private final SecureRandom random = new SecureRandom();

    public AdminUserService(
        AdminUserRepository adminUserRepository,
        PasswordEncoder passwordEncoder,
        AuthEventPublisher authEventPublisher,
        StaffProvisioningMailSender staffProvisioningMailSender
    ) {
        this.adminUserRepository = adminUserRepository;
        this.passwordEncoder = passwordEncoder;
        this.authEventPublisher = authEventPublisher;
        this.staffProvisioningMailSender = staffProvisioningMailSender;
    }

    private String generateTemporaryPassword() {
        StringBuilder sb = new StringBuilder(6);
        for (int i = 0; i < 6; i++) {
            sb.append(LETTERS.charAt(random.nextInt(LETTERS.length())));
        }
        return sb.toString();
    }

    @Transactional(readOnly = true)
    public UserListPage listUsers(String role, Boolean enabled, int page, int size) {
        String filterRole = (role != null && !role.isBlank()) ? role.trim().toUpperCase() : null;
        PageRequest pageRequest = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<User> userPage = adminUserRepository.findUsers(filterRole, enabled, pageRequest);

        List<UserSummary> summaries = userPage.getContent().stream()
            .map(UserSummary::from)
            .toList();

        return new UserListPage(
            summaries,
            userPage.getTotalElements(),
            userPage.getTotalPages(),
            userPage.getNumber(),
            userPage.getSize()
        );
    }

    @Transactional
    public UserSummary createStaffUser(CreateStaffUserRequest request) {
        String role = (request.role() != null) ? request.role().trim().toUpperCase() : "";
        if (!ALLOWED_STAFF_ROLES.contains(role)) {
            throw new InvalidStaffRoleException("Role must be either COURIER or DISPATCHER; got: " + request.role());
        }

        String email = request.email().trim().toLowerCase();
        if (adminUserRepository.existsByEmailIgnoreCase(email)) {
            throw new EmailAlreadyExistsException("A user account with this email address already exists.");
        }

        String temporaryPassword = (request.password() != null && !request.password().isBlank())
            ? request.password().trim()
            : generateTemporaryPassword();

        String userId = UUID.randomUUID().toString();
        String passwordHash = passwordEncoder.encode(temporaryPassword);

        User user = new User(
            userId,
            email,
            passwordHash,
            request.fullName().trim(),
            request.phoneNumber().trim(),
            role,
            true,
            null
        );
        user.setMustChangePassword(true);

        User saved = adminUserRepository.save(user);

        authEventPublisher.publishUserRegistered(
            saved.getId(),
            saved.getEmail(),
            saved.getFullName(),
            saved.getPhoneNumber(),
            saved.getRole(),
            null,
            saved.isEnabled()
        );

        if (staffProvisioningMailSender != null) {
            staffProvisioningMailSender.sendProvisioningEmail(
                saved.getEmail(),
                saved.getFullName(),
                saved.getRole(),
                temporaryPassword
            );
        }

        return UserSummary.from(saved);
    }

    @Transactional
    public UserSummary updateUserStatus(String userId, boolean enabled) {
        User user = adminUserRepository.findById(userId)
            .orElseThrow(() -> new UserNotFoundException("User not found with id: " + userId));

        user.setEnabled(enabled);
        User saved = adminUserRepository.save(user);

        return UserSummary.from(saved);
    }
}
