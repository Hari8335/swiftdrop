package com.swiftdrop.auth.user;

import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Batch lookup of profile pictures by user id, used to show other people's pictures
 * (e.g. couriers to dispatchers and customers). Users without a picture are left out.
 */
public final class AvatarLookup {

    public static final int MAX_IDS = 50;

    private AvatarLookup() {
    }

    /**
     * @return user id to avatar data URL, only for users that have one
     * @throws IllegalArgumentException when no ids or more than {@link #MAX_IDS} are requested
     */
    public static Map<String, String> find(UserRepository users, Collection<String> ids) {
        List<String> distinct = ids == null ? List.of() : ids.stream()
                .filter(id -> id != null && !id.isBlank())
                .map(String::trim)
                .distinct()
                .toList();
        if (distinct.isEmpty() || distinct.size() > MAX_IDS) {
            throw new IllegalArgumentException("Between 1 and " + MAX_IDS + " user ids are required");
        }
        Map<String, String> result = new LinkedHashMap<>();
        for (User user : users.findAllById(distinct)) {
            if (user.getAvatarData() != null && user.isEnabled()) {
                result.put(user.getId(), user.getAvatarData());
            }
        }
        return result;
    }
}
