const Complaint = require("../models/Complaint");
const Facility = require("../models/Facility");
const User = require("../models/User");

async function autoAssignEngineer(facilityCode) {
    try {

        // Find Facility
        const facility = await Facility.findOne({
            facility_code: facilityCode
        });

        if (!facility) {
            return {
                engineer: null,
                district: null,
                message: "Facility not found"
            };
        }

        const district = facility.district;

        // Find active engineers mapped to this district
        const engineers = await User.find({
            role: "engineer",
            isActive: true,
            assignedDistricts: district
        });

        if (engineers.length === 0) {
            return {
                engineer: null,
                district,
                message: "No engineer available"
            };
        }

        // Find least loaded engineer
        let selectedEngineer = null;
        let minimumLoad = Number.MAX_SAFE_INTEGER;

        for (const engineer of engineers) {

            const workload = await Complaint.countDocuments({
                assignedTo: engineer._id,
                status: { $in: ["open", "in_progress"] }
            });

            if (workload < minimumLoad) {
                minimumLoad = workload;
                selectedEngineer = engineer;
            }
        }

        return {
            engineer: selectedEngineer,
            district,
            workload: minimumLoad,
            message: "Engineer assigned automatically"
        };

    } catch (err) {
        console.error(err);

        return {
            engineer: null,
            district: null,
            message: err.message
        };
    }
}

module.exports = {
    autoAssignEngineer
};