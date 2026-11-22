package com.swiftdrop.operations.courier.execution;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface CourierLocationRepository extends JpaRepository<CourierLocation, UUID> {}
