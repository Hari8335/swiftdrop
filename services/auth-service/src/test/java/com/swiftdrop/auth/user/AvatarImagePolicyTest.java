package com.swiftdrop.auth.user;

import org.junit.jupiter.api.Test;

import java.util.Base64;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class AvatarImagePolicyTest {

    private static String dataUrl(String type, byte[] bytes) {
        return "data:image/" + type + ";base64," + Base64.getEncoder().encodeToString(bytes);
    }

    private static byte[] jpeg(int size) {
        byte[] b = new byte[size];
        b[0] = (byte) 0xFF;
        b[1] = (byte) 0xD8;
        b[2] = (byte) 0xFF;
        return b;
    }

    @Test
    void acceptsPngJpegAndWebp() {
        byte[] png = {(byte) 0x89, 'P', 'N', 'G', 0x0D, 0x0A, 0x1A, 0x0A, 1};
        byte[] webp = {'R', 'I', 'F', 'F', 0, 0, 0, 0, 'W', 'E', 'B', 'P', 1};
        assertThat(AvatarImagePolicy.validate(dataUrl("png", png))).startsWith("data:image/png;base64,");
        assertThat(AvatarImagePolicy.validate(dataUrl("jpeg", jpeg(10)))).startsWith("data:image/jpeg;base64,");
        assertThat(AvatarImagePolicy.validate(dataUrl("webp", webp))).startsWith("data:image/webp;base64,");
    }

    @Test
    void acceptsImageExactlyAtTheLimit() {
        assertThat(AvatarImagePolicy.validate(dataUrl("jpeg", jpeg(AvatarImagePolicy.MAX_BYTES)))).isNotBlank();
    }

    @Test
    void rejectsOversizedImage() {
        assertThatThrownBy(() -> AvatarImagePolicy.validate(dataUrl("jpeg", jpeg(AvatarImagePolicy.MAX_BYTES + 1))))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("200 KB");
    }

    @Test
    void rejectsSvgGifAndPlainUrls() {
        assertThatThrownBy(() -> AvatarImagePolicy.validate(dataUrl("svg+xml", "<svg/>".getBytes())))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> AvatarImagePolicy.validate(dataUrl("gif", "GIF89a".getBytes())))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> AvatarImagePolicy.validate("https://evil.example/x.png"))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> AvatarImagePolicy.validate(" "))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void rejectsContentThatDoesNotMatchDeclaredType() {
        assertThatThrownBy(() -> AvatarImagePolicy.validate(dataUrl("png", jpeg(10))))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("does not match");
    }
}
