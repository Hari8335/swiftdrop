package com.swiftdrop.operations.courier.execution.client;

import java.util.List;
import java.util.UUID;

public interface ParcelServiceClient {

    ParcelPageResponse getParcelsByCourierAndDate(String courierId, String date);

    /** Every parcel assigned to the courier that is not yet finished, oldest assignment first (all pages). */
    List<ParcelResponse> getActiveParcelsForCourier(String courierId);

    /** Parcels the courier finished (DELIVERED, FAILED, CANCELLED) on the given Sri Lanka day (all pages). */
    List<ParcelResponse> getParcelsCompletedByCourierOn(String courierId, String date);

    ParcelResponse getParcel(UUID parcelId);

    ParcelResponse updateStatus(UUID parcelId, ParcelStatusUpdateRequest request);
}
