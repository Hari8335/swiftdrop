package com.swiftdrop.parcel.tracking;

import com.swiftdrop.common.security.CurrentUser;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

/** Driver assignment history of one parcel, shown under the timeline on the parcel detail page. */
@RestController
class DriverAssignmentController {

    private final DriverAssignmentService driverAssignmentService;

    DriverAssignmentController(DriverAssignmentService driverAssignmentService) {
        this.driverAssignmentService = driverAssignmentService;
    }

    @GetMapping("/api/v1/parcels/{id}/assignments")
    DriverAssignmentHistoryResponse getDriverAssignmentHistory(@PathVariable String id) {
        return driverAssignmentService.history(id, CurrentUser.require());
    }
}
