import User from "../../models/user.model.js";
import Course from "../../models/course.model.js"
import Payment from "../../models/payment.model.js";
import MockTest from "../../models/mockTest.model.js"

export const getDashboardStats = async (req, res) => {
    try {
        const totalUsers = await User.countDocuments();
        const totalCourses = await Course.countDocuments({ isActive: true });
        const totalPaymentsAmountAgg = await Payment.aggregate([
            { $match: { status: "success"} },
            { $group: { _id: null, totalAmount: { $sum: "$amount" } } }
        ]);
        const totalMockTests = await MockTest.countDocuments({ isActive: true });

        const totalPaymentsAmount = totalPaymentsAmountAgg[0]?.totalAmount || 0;

        res.status(200).json({
            totalUsers,
            totalCourses,
            totalPaymentsAmount,
            totalMockTests
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};



export const lineChart = async (req, res) => {
  try {
    // Parse year from query param
    const yearFilter = req.query.year ? parseInt(req.query.year, 10) : null;
    
    console.log("Year filter requested:", yearFilter); // Debug log

    // Basic match stage - only successful payments
    const matchStage = {
      status: "success",
    };

    // Only add year filter if specified
    if (yearFilter) {
      matchStage.createdAt = {
        $gte: new Date(yearFilter, 0, 1),       // Jan 1, yearFilter
        $lt: new Date(yearFilter + 1, 0, 1),    // Jan 1, yearFilter+1
      };
    }

    console.log("Match stage:", JSON.stringify(matchStage, null, 2)); // Debug

    const data = await Payment.aggregate([
      { $match: matchStage },
      {
        $addFields: {
          month: { $month: "$createdAt" },
          year: { $year: "$createdAt" },
        },
      },
      {
        $group: {
          _id: { year: "$year", month: "$month" },
          // Count based on paymentType
          MockTestPurchased: {
            $sum: { 
              $cond: [
                { $eq: ["$paymentType", "test"] },
                "$amount", 
                0
              ] 
            },
          },
          TotalCoursePurchased: {
            $sum: { 
              $cond: [
                { $eq: ["$paymentType", "course"] },
                "$amount", 
                0
              ] 
            },
          },
          // Optional: Add subject purchases if needed
          SubjectPurchased: {
            $sum: { 
              $cond: [
                { $eq: ["$paymentType", "subject"] },
                "$amount", 
                0
              ] 
            },
          },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);

    console.log("Aggregation result:", JSON.stringify(data, null, 2)); // Debug

    const monthNames = [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
    ];

    // If year filter is specified, use that year
    // Otherwise, find all years in the data and process them all
    if (yearFilter) {
      const formattedData = [];
      for (let i = 1; i <= 12; i++) {
        const monthData = data.find(item => 
          item._id.month === i && item._id.year === yearFilter
        );
        formattedData.push({
          month: monthNames[i - 1],
          MockTestPurchased: monthData ? monthData.MockTestPurchased : 0,
          TotalCoursePurchased: monthData ? monthData.TotalCoursePurchased : 0,
          SubjectPurchased: monthData ? monthData.SubjectPurchased : 0,
        });
      }
      res.json(formattedData);
    } else {
      // No year filter - return data for all years
      const formattedData = {};
      
      // Get all unique years from data
      const years = [...new Set(data.map(item => item._id.year))];
      
      years.forEach(year => {
        const yearData = [];
        for (let i = 1; i <= 12; i++) {
          const monthData = data.find(item => 
            item._id.month === i && item._id.year === year
          );
          yearData.push({
            month: monthNames[i - 1],
            MockTestPurchased: monthData ? monthData.MockTestPurchased : 0,
            TotalCoursePurchased: monthData ? monthData.TotalCoursePurchased : 0,
            SubjectPurchased: monthData ? monthData.SubjectPurchased : 0,
          });
        }
        formattedData[year] = yearData;
      });
      
      res.json({
        message: "Data for all years",
        years: years,
        data: formattedData
      });
    }
    
  } catch (error) {
    console.error("Line chart error:", error);
    res.status(500).json({ 
      error: "Server error",
      details: error.message 
    });
  }
};



