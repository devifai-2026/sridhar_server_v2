import Payment from "../../models/payment.model.js";
import User from "../../models/user.model.js";
import mongoose from "mongoose";
import crypto from "crypto";

export const createPayment = async (req, res) => {
  try {
    const { userId, amount, courseId = null, mockId = null, couponCode = null, receipt = null, currency = "INR", capture = 1 } = req.body;

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ error: "Invalid or missing userId" });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    const parsedAmount = Number(amount);
    if (!parsedAmount || parsedAmount <= 0) {
      return res.status(400).json({ error: "Invalid amount" });
    }

    // Razorpay expects amount in smallest currency unit (paise)
    const orderOptions = {
      amount: Math.round(parsedAmount * 100),
      currency,
      receipt: receipt || `rcpt_${Date.now()}`,
      payment_capture: capture, // 1 => auto-capture, 0 => manual
    };

    const order = await razorpay.orders.create(orderOptions);

    // Save a payment record with order id and status 'created'
    const newPayment = new Payment({
      userId,
      courseId,
      mockId,
      amount: parsedAmount,
      paymentStatus: "created",
      transactionId: order.id, // store razorpay order id for now
      responsePayload: order,
      couponCode,
    });

    const savedPayments = await newPayment.save();

    // Return order details and key for client to complete the payment
    return res.status(201).json({
      success: true,
      order: {
        id: order.id,
        amount: order.amount,
        currency: order.currency,
      },
      key: process.env.RAZORPAY_KEY_ID,
      payment: savedPayments,
    });
  } catch (error) {
    console.error("createPayment error:", error);
    res.status(400).json({ error: error.message });
  }
};


export const getAllPaymentHistory = async (req, res) => {
  try {
    const page = req.query.page ? parseInt(req.query.page) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit) : 10;
    const search = req.query.search || "";
    const filter = req.query.filter || "";
    const from = req.query.from;
    const to = req.query.to;

    // Build date filter based on filter query param
    let dateFilter = {};
    const now = new Date();
    if (filter === "today") {
      const start = new Date(now.setHours(0, 0, 0, 0));
      const end = new Date(now.setHours(23, 59, 59, 999));
      dateFilter = { $gte: start, $lte: end };
    } else if (filter === "week") {
      const first = now.getDate() - now.getDay();
      const start = new Date(now.setDate(first));
      start.setHours(0, 0, 0, 0);
      const end = new Date();
      end.setHours(23, 59, 59, 999);
      dateFilter = { $gte: start, $lte: end };
    } else if (filter === "month") {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      dateFilter = { $gte: start, $lte: end };
    } else if (filter === "year") {
      const start = new Date(now.getFullYear(), 0, 1);
      const end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
      dateFilter = { $gte: start, $lte: end };
    } else if (filter === "custom" && from && to) {
      dateFilter = { $gte: new Date(from), $lte: new Date(to) };
    }

    // Construct aggregation pipeline with dynamic lookups based on paymentType
    const pipeline = [
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "userDetails",
        },
      },
      { $unwind: { path: "$userDetails", preserveNullAndEmptyArrays: true } },

      // Conditional lookup for test payments (mocktests collection)
      {
        $lookup: {
          from: "mocktests",
          localField: "paymentForId",
          foreignField: "_id",
          as: "mockTestDetails",
        },
      },

      // Conditional lookup for course payments (courses collection)
      {
        $lookup: {
          from: "courses",
          localField: "paymentForId",
          foreignField: "_id",
          as: "courseDetails",
        },
      },

      // Conditional lookup for subject payments (subjects collection - if applicable)
      {
        $lookup: {
          from: "subjects",
          localField: "paymentForId",
          foreignField: "_id",
          as: "subjectDetails",
        },
      },

      // Lookup CourseAccess for course payments to get startDate and endDate
      {
        $lookup: {
          from: "courseaccesses", // MongoDB collection name (usually lowercase plural)
          let: { paymentUserId: "$userId", paymentForCourseId: "$paymentForId" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$userId", "$$paymentUserId"] },
                    { $eq: ["$courseId", "$$paymentForCourseId"] }
                  ]
                }
              }
            },
            { $sort: { createdAt: -1 } }, // Get the latest access record
            { $limit: 1 }
          ],
          as: "courseAccessDetails",
        },
      },

      // Create safe user fields with fallbacks
      {
        $addFields: {
          // Safe user fields with fallback values
          safeUserDetails: {
            email: { $ifNull: ["$userDetails.email", ""] },
            phone: { $ifNull: ["$userDetails.phone", ""] },
            firstName: { $ifNull: ["$userDetails.firstName", ""] },
            lastName: { $ifNull: ["$userDetails.lastName", ""] },
            fullName: {
              $concat: [
                { $ifNull: ["$userDetails.firstName", ""] },
                " ",
                { $ifNull: ["$userDetails.lastName", ""] }
              ]
            }
          },
          // For test payments, use mockTestDetails
          testDetails: {
            $cond: [
              { $eq: ["$paymentType", "test"] },
              { $arrayElemAt: ["$mockTestDetails", 0] },
              null
            ]
          },
          // For course payments, use courseDetails
          courseDetails: {
            $cond: [
              { $eq: ["$paymentType", "course"] },
              { $arrayElemAt: ["$courseDetails", 0] },
              null
            ]
          },
          // For subject payments, use subjectDetails
          subjectDetails: {
            $cond: [
              { $eq: ["$paymentType", "subject"] },
              { $arrayElemAt: ["$subjectDetails", 0] },
              null
            ]
          },
          // Get course access details (startDate and endDate)
          courseAccess: {
            $cond: [
              { $eq: ["$paymentType", "course"] },
              { $arrayElemAt: ["$courseAccessDetails", 0] },
              null
            ]
          }
        }
      },

      // Build search conditions dynamically with null-safe checks
      ...(search ? [
        {
          $match: {
            $or: [
              // Search in user fields - handle null/undefined
              { 
                $or: [
                  { "safeUserDetails.email": { $regex: search, $options: "i" } },
                  { "safeUserDetails.phone": { $regex: search, $options: "i" } },
                  { "safeUserDetails.fullName": { $regex: search, $options: "i" } }
                ]
              },
              // Search in item details based on payment type
              {
                $cond: [
                  { $eq: ["$paymentType", "test"] },
                  { "testDetails.title": { $regex: search, $options: "i" } },
                  false
                ]
              },
              {
                $cond: [
                  { $eq: ["$paymentType", "course"] },
                  { "courseDetails.name": { $regex: search, $options: "i" } },
                  false
                ]
              },
              {
                $cond: [
                  { $eq: ["$paymentType", "subject"] },
                  { "subjectDetails.name": { $regex: search, $options: "i" } },
                  false
                ]
              },
              // Search in transaction ID
              { transactionId: { $regex: search, $options: "i" } }
            ]
          }
        }
      ] : []),

      // Apply date filter if present
      ...(Object.keys(dateFilter).length > 0 ? [
        {
          $match: {
            createdAt: dateFilter
          }
        }
      ] : []),

      {
        $project: {
          amount: 1,
          status: 1,
          paymentType: 1,
          paymentForId: 1,
          transactionId: 1,
          paymentGateway: 1,
          createdAt: 1,
          // Use safe user details with fallback values
          userDetails: {
            email: "$safeUserDetails.email",
            phone: "$safeUserDetails.phone",
            firstName: "$safeUserDetails.firstName",
            lastName: "$safeUserDetails.lastName",
            fullName: "$safeUserDetails.fullName"
          },
          // Include course access details if available
          startDate: {
            $cond: [
              { $eq: ["$paymentType", "course"] },
              "$courseAccess.startDate",
              null
            ]
          },
          endDate: {
            $cond: [
              { $eq: ["$paymentType", "course"] },
              "$courseAccess.endDate",
              null
            ]
          },
          isExpired: {
            $cond: [
              { $eq: ["$paymentType", "course"] },
              "$courseAccess.isExpired",
              null
            ]
          },
          // Include the appropriate details based on paymentType
          itemDetails: {
            $switch: {
              branches: [
                {
                  case: { $eq: ["$paymentType", "test"] },
                  then: {
                    type: "Mock Test",
                    title: { $ifNull: ["$testDetails.title", "N/A"] },
                  }
                },
                {
                  case: { $eq: ["$paymentType", "course"] },
                  then: {
                    type: "Course",
                    name: { $ifNull: ["$courseDetails.name", "N/A"] },
                  }
                },
                {
                  case: { $eq: ["$paymentType", "subject"] },
                  then: {
                    type: "Subject",
                    name: { $ifNull: ["$subjectDetails.name", "N/A"] },
                  }
                }
              ],
              default: { 
                type: "Unknown",
                name: "N/A"
              }
            }
          }
        },
      },

      { $sort: { createdAt: -1 } }, // Sort by newest first
      { $skip: (page - 1) * limit },
      { $limit: limit },
    ];

    // Execute aggregation pipeline
    const payments = await Payment.aggregate(pipeline);

    // Get total count without pagination stages for accurate total
    const countPipeline = [
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "userDetails",
        },
      },
      { $unwind: { path: "$userDetails", preserveNullAndEmptyArrays: true } },

      // Add safe user fields for count pipeline too
      {
        $addFields: {
          safeUserDetails: {
            email: { $ifNull: ["$userDetails.email", ""] },
            phone: { $ifNull: ["$userDetails.phone", ""] },
            firstName: { $ifNull: ["$userDetails.firstName", ""] },
            lastName: { $ifNull: ["$userDetails.lastName", ""] },
            fullName: {
              $concat: [
                { $ifNull: ["$userDetails.firstName", ""] },
                " ",
                { $ifNull: ["$userDetails.lastName", ""] }
              ]
            }
          }
        }
      },

      // Apply search filter if present
      ...(search ? [
        {
          $match: {
            $or: [
              { 
                $or: [
                  { "safeUserDetails.email": { $regex: search, $options: "i" } },
                  { "safeUserDetails.phone": { $regex: search, $options: "i" } },
                  { "safeUserDetails.fullName": { $regex: search, $options: "i" } }
                ]
              },
              { transactionId: { $regex: search, $options: "i" } }
            ]
          }
        }
      ] : []),

      // Apply date filter if present
      ...(Object.keys(dateFilter).length > 0 ? [
        {
          $match: {
            createdAt: dateFilter
          }
        }
      ] : []),

      { $count: "totalCount" }
    ];

    const countResult = await Payment.aggregate(countPipeline);
    const totalCount = countResult.length ? countResult[0].totalCount : 0;

    res.json({
      success: true,
      data: payments,
      pagination: { 
        page, 
        limit, 
        totalCount, 
        totalPages: Math.ceil(totalCount / limit) 
      },
    });
  } catch (error) {
    console.error("Error fetching payment details:", error);
    res.status(500).json({ 
      success: false, 
      message: "Internal Server Error",
      error: error.message 
    });
  }
};

export const userSummary = async (req, res) => {
  try {
    const page = req.query.page ? parseInt(req.query.page) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit) : 10;
    const search = req.query.search || "";
    const filter = req.query.filter || "";
    const from = req.query.from;
    const to = req.query.to;

    // Escape special regex characters in search string
    const escapeRegex = (text) =>
      text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");

    let userMatch = {};

    if (search) {
      const searchRegex = new RegExp(escapeRegex(search), "i");
      userMatch.$or = [
        { email: searchRegex },
        { deviceId: searchRegex },
        { firstName: searchRegex },
        { lastName: searchRegex },
        { phone: searchRegex }
      ];
    }

    if (filter === "today") {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const end = new Date();
      end.setHours(23, 59, 59, 999);
      userMatch.createdAt = { $gte: start, $lte: end };
    } else if (filter === "week") {
      const now = new Date();
      const first = now.getDate() - now.getDay();
      const start = new Date(now.setDate(first));
      start.setHours(0, 0, 0, 0);
      const end = new Date();
      end.setHours(23, 59, 59, 999);
      userMatch.createdAt = { $gte: start, $lte: end };
    } else if (filter === "month") {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(
        now.getFullYear(),
        now.getMonth() + 1,
        0,
        23,
        59,
        59,
        999
      );
      userMatch.createdAt = { $gte: start, $lte: end };
    } else if (filter === "year") {
      const now = new Date();
      const start = new Date(now.getFullYear(), 0, 1);
      const end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
      userMatch.createdAt = { $gte: start, $lte: end };
    } else if (filter === "custom" && from && to) {
      userMatch.createdAt = { $gte: new Date(from), $lte: new Date(to) };
    }

    const pipeline = [
      {
        $match: userMatch
      },
      {
        $lookup: {
          from: "payments",
          let: { userId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: { 
                  $and: [
                    { $eq: ["$userId", "$$userId"] },
                    { $eq: ["$status", "success"] }
                  ]
                }
              }
            }
          ],
          as: "payments"
        }
      },
      {
        $lookup: {
          from: "courseaccesses",
          let: { userId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ["$userId", "$$userId"] }
              }
            }
          ],
          as: "courseAccesses"
        }
      },
      {
        $lookup: {
          from: "mocktestaccesses", // If you have a MockTestAccess collection
          let: { userId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ["$userId", "$$userId"] }
              }
            }
          ],
          as: "mockTestAccesses"
        }
      },
      {
        $project: {
          _id: 1,
          firstName: 1,
          lastName: 1,
          email: 1,
          phone: 1,
          deviceId: 1,
          createdAt: 1,
          isActive:1,
          fullName: {
            $concat: [
              { $ifNull: ["$firstName", ""] },
              " ",
              { $ifNull: ["$lastName", ""] }
            ]
          },
          // Count successful payments by type
          paymentCourseCount: {
            $size: {
              $filter: {
                input: "$payments",
                as: "payment",
                cond: { $eq: ["$$payment.paymentType", "course"] }
              }
            }
          },
          paymentMockCount: {
            $size: {
              $filter: {
                input: "$payments",
                as: "payment",
                cond: { $eq: ["$$payment.paymentType", "test"] }
              }
            }
          },
          // Count actual access records
          courseAccessCount: { $size: { $ifNull: ["$courseAccesses", []] } },
          mockTestAccessCount: { $size: { $ifNull: ["$mockTestAccesses", []] } },
          // Total purchases count (combining both payment and access)
          totalCoursePurchases: {
            $max: [
              {
                $size: {
                  $filter: {
                    input: "$payments",
                    as: "payment",
                    cond: { $eq: ["$$payment.paymentType", "course"] }
                  }
                }
              },
              { $size: { $ifNull: ["$courseAccesses", []] } }
            ]
          },
          totalMockPurchases: {
            $max: [
              {
                $size: {
                  $filter: {
                    input: "$payments",
                    as: "payment",
                    cond: { $eq: ["$$payment.paymentType", "test"] }
                  }
                }
              },
              { $size: { $ifNull: ["$mockTestAccesses", []] } }
            ]
          },
          // Calculate total spent amount
          totalSpent: {
            $sum: {
              $map: {
                input: "$payments",
                as: "payment",
                in: "$$payment.amount"
              }
            }
          },
          // Get latest payment date
          lastPaymentDate: {
            $max: {
              $map: {
                input: "$payments",
                as: "payment",
                in: "$$payment.createdAt"
              }
            }
          }
        }
      },
      {
        $facet: {
          metadata: [{ $count: "total" }],
          data: [
            { $sort: { createdAt: -1 } },
            { $skip: (page - 1) * limit }, 
            { $limit: limit }
          ]
        }
      }
    ];

    const result = await User.aggregate(pipeline);

    const total = result[0].metadata.length > 0 ? result[0].metadata[0].total : 0;
    const data = result[0].data;

    // Format the response data
    const formattedData = data.map(user => ({
      ...user,
      courseCount: user.totalCoursePurchases,
      mockTestCount: user.totalMockPurchases,
      createdAt: user.createdAt ? new Date(user.createdAt).toISOString() : null,
      lastPaymentDate: user.lastPaymentDate ? new Date(user.lastPaymentDate).toISOString() : null,
      formattedTotalSpent: user.totalSpent ? `₹${user.totalSpent.toLocaleString('en-IN')}` : "₹0"
    }));

    return res.json({
      success: true,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      data: formattedData,
    });
  } catch (err) {
    console.error("Error fetching user purchases summary with total count:", err);
    return res.status(500).json({ 
      success: false,
      error: "Internal Server Error",
      message: err.message 
    });
  }
};
export const deleteUser = async (req, res) => {
  try {
    console.log("Delete user request received");
    const {userId} = req.body;
    console.log("User ID to delete:", userId);
    const deletedUser = await User.findByIdAndDelete(userId);
    if (!deletedUser) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json({ message: "User deleted successfully", user: deletedUser });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const toggleUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    user.isActive = !user.isActive;
    await user.save();
    res.json({ message: `User has been ${user.isActive ? 'activated' : 'deactivated'}.`, user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};