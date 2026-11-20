package com.swiftdrop.auth.admin.dto;

import java.util.List;
import java.util.Map;

public record UserListPage(
    List<UserSummary> content,
    long totalElements,
    int totalPages,
    int page,
    int size,
    Map<String, Long> roleCounts
) {
    public UserListPage(List<UserSummary> content, long totalElements, int totalPages, int page, int size) {
        this(content, totalElements, totalPages, page, size, Map.of());
    }
}
