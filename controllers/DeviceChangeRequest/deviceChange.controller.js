import mongoose from "mongoose";
import DeviceChangeRequest from "../../models/deviceChangeRequest.model.js"

export const getAllDeviceChangeRequests = async (req, res) => {
  try {
    const { filter, from, to, page = 1, limit = 10, search = '' } = req.body;

    let match = {};

    // Date filtering logic
    if (filter) {
      const now = new Date();
      let start, end;

      switch (filter) {
        case "today":
          start = new Date();
          start.setHours(0, 0, 0, 0);
          end = new Date();
          end.setHours(23, 59, 59, 999);
          break;
        case "week":
          start = new Date();
          start.setDate(start.getDate() - start.getDay());
          start.setHours(0, 0, 0, 0);
          end = new Date(start);
          end.setDate(start.getDate() + 6);
          end.setHours(23, 59, 59, 999);
          break;
        case "month":
          start = new Date(now.getFullYear(), now.getMonth(), 1);
          end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
          break;
        case "year":
          start = new Date(now.getFullYear(), 0, 1);
          end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
          break;
        case "custom":
          if (from && to) {
            start = new Date(from);
            start.setHours(0, 0, 0, 0);
            end = new Date(to);
            end.setHours(23, 59, 59, 999);
          }
          break;
      }

      if (start && end) {
        match.createdAt = { $gte: start, $lte: end };
      }
    }

    const skip = (page - 1) * limit;
    const searchTrimmed = search.trim();

    const pipeline = [
      { $match: match },
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "userDetails"
        }
      },
      { $unwind: { path: "$userDetails", preserveNullAndEmptyArrays: true } },
    ];

    if (searchTrimmed.length > 0) {
      // Multi-field case-insensitive search on device and user details fields
      pipeline.push({
        $match: {
          $or: [
            { "PreviousDeviceId": { $regex: searchTrimmed, $options: "i" } },
            { "newDeviceId": { $regex: searchTrimmed, $options: "i" } },
            { "reason": { $regex: searchTrimmed, $options: "i" } },
            { "status": { $regex: searchTrimmed, $options: "i" } },
            { "userDetails.firstName": { $regex: searchTrimmed, $options: "i" } },
            { "userDetails.lastName": { $regex: searchTrimmed, $options: "i" } },
            { "userDetails.email": { $regex: searchTrimmed, $options: "i" } },
          ],
        },
      });
    }

    pipeline.push({
      $facet: {
        metadata: [{ $count: "total" }],
        data: [
          { $sort: { createdAt: -1 } },
          { $skip: skip },
          { $limit: limit },
          {
            $project: {
              PreviousDeviceId: 1,
              newDeviceId: 1,
              reason: 1,
              status: 1,
              createdAt: 1,
              updatedAt: 1,
              "userDetails.firstName": 1,
              "userDetails.lastName": 1,
              "userDetails.email": 1,
              "userDetails.phone": 1,
            },
          },
        ],
      },
    });

    const results = await DeviceChangeRequest.aggregate(pipeline);

    const requests = results[0].data;
    const total = results[0].metadata.length > 0 ? results[0].metadata[0].total : 0;

    res.status(200).json({
      message: "Device change requests fetched successfully",
      requests,
      total,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};






export const handleDeviceRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { adminId, action } = req.body;

    // Validate IDs
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid request ID" });
    }

    if (!mongoose.Types.ObjectId.isValid(adminId)) {
      return res.status(400).json({ message: "Invalid admin ID" });
    }

    // Validate action
    if (!["approve", "reject"].includes(action)) {
      return res.status(400).json({ message: "Invalid action, must be 'approve' or 'reject'" });
    }
    // Set status dynamically
    const updatedRequest = await DeviceChangeRequest.findByIdAndUpdate(
      id,
      {
        status: action === "approve" ? "approved" : "rejected",
        reviewedBy: adminId,
        reviewedAt: new Date(),
      },
      { new: true } // return updated doc
    );

    if (!updatedRequest) {
      return res.status(404).json({ message: "Request not found" });
    }

    res.status(200).json({
      message: `Device change request ${action === "approve" ? "approved" : "rejected"} successfully`,
      data: updatedRequest,
    });

  } catch (error) {
    console.error("Error handling request:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

