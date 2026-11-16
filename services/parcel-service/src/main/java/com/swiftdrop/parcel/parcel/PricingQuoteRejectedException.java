package com.swiftdrop.parcel.parcel;

import org.springframework.http.HttpStatus;

/**
 * The pricing service could not quote a delivery, with a reason the customer can act on
 * (for example a district SwiftDrop does not deliver to yet).
 *
 * <p>Kept separate from {@code ResponseStatusException} so the reason is not replaced by the
 * generic "Parcel not found" text that {@link ParcelExceptionHandler} uses for 404s.
 */
public class PricingQuoteRejectedException extends RuntimeException {

    private final HttpStatus status;
    private final String code;

    public PricingQuoteRejectedException(HttpStatus status, String code, String message) {
        super(message);
        this.status = status;
        this.code = code;
    }

    public HttpStatus status() {
        return status;
    }

    public String code() {
        return code;
    }
}
