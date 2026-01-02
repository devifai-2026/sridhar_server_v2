import MocktestCategory from "../../../models/mocktestCategory.model.js";

// Create a new mock test category
export const createMockTestCategory = async (req, res) => {
    try {
        const { name, description, mocktestIds, price, testType, maxUseValues, isActive } = req.body;
        console.log(req.body,"atanu");
        

        // Validation
        if (!name || !name.trim()) {
            return res.status(400).json({
                success: false,
                message: "Category name is required",
            });
        }

        if (!mocktestIds || !Array.isArray(mocktestIds) || mocktestIds.length === 0) {
            return res.status(400).json({
                success: false,
                message: "At least one mock test ID is required",
            });
        }

        if (price === undefined || price < 0) {
            return res.status(400).json({
                success: false,
                message: "Price is required and must be a non-negative number",
            });
        }

        if (!testType || !testType.trim()) {
            return res.status(400).json({
                success: false,
                message: "Test type is required",
            });
        }

        // Check if category with same name already exists
        const existingCategory = await MocktestCategory.findOne({ 
            name: name.trim() 
        });

        if (existingCategory) {
            return res.status(409).json({
                success: false,
                message: "Mock test category with this name already exists",
            });
        }

        // Create new category
        const newCategory = new MocktestCategory({
            name: name.trim(),
            description: description?.trim() || "",
            mocktestIds,
            price,
            typeOfCategory: testType.trim(),
            validCodes: maxUseValues || [],
            isActive: isActive !== undefined ? isActive : true,
        });

        await newCategory.save();

        return res.status(201).json({
            success: true,
            message: "Mock test category created successfully",
            data: newCategory,
        });
    } catch (error) {
        console.error("Error creating mock test category:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message,
        });
    }
};

// Get all mock test categories with pagination, search, and filters
export const getAllMockTestCategories = async (req, res) => {
    try {
        const page = req.query.page ? parseInt(req.query.page) : null;
        const limit = req.query.limit ? parseInt(req.query.limit) : null;
        const search = req.query.search || "";
        const filter = req.query.filter || "";
        const from = req.query.from;
        const to = req.query.to;
        const isPaid = req.query.isPaid;

        // Build the query object for MocktestCategory filtering
        let query = {};

        if (isPaid !== undefined) {
            query.price = isPaid === "true" ? { $gt: 0 } : 0;
        }

        if (search) {
            const searchRegex = { $regex: search, $options: "i" };
            query.$or = [
                { name: searchRegex },
                { description: searchRegex },
            ];
        }

        if (filter === "today") {
            const start = new Date();
            start.setHours(0, 0, 0, 0);
            const end = new Date();
            end.setHours(23, 59, 59, 999);
            query.createdAt = { $gte: start, $lte: end };
        } else if (filter === "week") {
            const now = new Date();
            const first = now.getDate() - now.getDay();
            const start = new Date(now.setDate(first));
            start.setHours(0, 0, 0, 0);
            const end = new Date();
            end.setHours(23, 59, 59, 999);
            query.createdAt = { $gte: start, $lte: end };
        } else if (filter === "month") {
            const now = new Date();
            const start = new Date(now.getFullYear(), now.getMonth(), 1);
            const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
            query.createdAt = { $gte: start, $lte: end };
        } else if (filter === "year") {
            const now = new Date();
            const start = new Date(now.getFullYear(), 0, 1);
            const end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
            query.createdAt = { $gte: start, $lte: end };
        } else if (filter === "custom" && from && to) {
            query.createdAt = { $gte: new Date(from), $lte: new Date(to) };
        }

        // Build aggregation pipeline
        const pipeline = [{ $match: query }];

        // $lookup to join MockTest
        pipeline.push({
            $lookup: {
                from: "mocktests",
                localField: "mocktestIds",
                foreignField: "_id",
                as: "mockTests",
            },
        });

        // Project fields
        pipeline.push({
            $project: {
                name: 1,
                description: 1,
                price: 1,
                isActive: 1,
                testType: "$typeOfCategory",
                maxUseValues: "$validCodes",
                createdAt: 1,
                updatedAt: 1,
                mockTests: {
                    _id: 1,
                    title: 1,
                },
            },
        });

        // Sort by createdAt descending
        pipeline.push({ $sort: { createdAt: -1 } });

        // Pagination if applicable
        if (page && limit) {
            const skip = (page - 1) * limit;
            pipeline.push({ $skip: skip });
            pipeline.push({ $limit: limit });
        }

        // Execute aggregation
        const categories = await MocktestCategory.aggregate(pipeline);

        // Get total count for the query (without pagination)
        const totalCount = await MocktestCategory.countDocuments(query);

        res.json({
            success: true,
            message: "Mock test categories retrieved successfully",
            data: categories,
            totalCount,
        });
    } catch (error) {
        console.error("Error fetching mock test categories:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message,
        });
    }
};

// Get mock test category by ID
export const getMockTestCategoryById = async (req, res) => {
    try {
        const { id } = req.params;

        const category = await MocktestCategory.findById(id)
            .populate("mocktestIds", "title");

        if (!category) {
            return res.status(404).json({
                success: false,
                message: "Mock test category not found",
            });
        }

        return res.status(200).json({
            success: true,
            message: "Mock test category retrieved successfully",
            data: category,
        });
    } catch (error) {
        console.error("Error fetching mock test category:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message,
        });
    }
};

// Update mock test category
export const updateMockTestCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, mocktestIds, price, testType, maxUseValues, isActive } = req.body;

        const category = await MocktestCategory.findById(id);

        if (!category) {
            return res.status(404).json({
                success: false,
                message: "Mock test category not found",
            });
        }

        // Check if new name already exists (if name is being changed)
        if (name && name.trim() !== category.name) {
            const existingCategory = await MocktestCategory.findOne({
                name: name.trim(),
                _id: { $ne: id },
            });

            if (existingCategory) {
                return res.status(409).json({
                    success: false,
                    message: "Mock test category with this name already exists",
                });
            }
        }

        // Validate price if provided
        if (price !== undefined && price < 0) {
            return res.status(400).json({
                success: false,
                message: "Price must be a non-negative number",
            });
        }

        // Update fields
        if (name) category.name = name.trim();
        if (description !== undefined) category.description = description.trim();
        if (mocktestIds && Array.isArray(mocktestIds)) category.mocktestIds = mocktestIds;
        if (price !== undefined) category.price = price;
        if (testType) category.typeOfCategory = testType.trim();
        if (maxUseValues !== undefined) category.validCodes = maxUseValues;
        if (isActive !== undefined) category.isActive = isActive;

        await category.save();

        return res.status(200).json({
            success: true,
            message: "Mock test category updated successfully",
            data: category,
        });
    } catch (error) {
        console.error("Error updating mock test category:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message,
        });
    }
};

// Delete mock test category (hard or soft delete)
export const deleteMockTestCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const { type } = req.body;

        // Validate type parameter
        if (!type || (type !== "soft" && type !== "hard")) {
            return res.status(400).json({
                success: false,
                message: "Invalid delete type. Must be 'soft' or 'hard'",
            });
        }

        if (type === "hard") {
            // Hard delete - remove from database
            const category = await MocktestCategory.findByIdAndDelete(id);

            if (!category) {
                return res.status(404).json({
                    success: false,
                    message: "Mock test category not found",
                });
            }

            return res.status(200).json({
                success: true,
                message: "Mock test category deleted successfully",
                data: category,
            });
        } else {
            // Soft delete - deactivate
            const category = await MocktestCategory.findByIdAndUpdate(
                id,
                { isActive: false },
                { new: true }
            );

            if (!category) {
                return res.status(404).json({
                    success: false,
                    message: "Mock test category not found",
                });
            }

            return res.status(200).json({
                success: true,
                message: "Mock test category deactivated successfully",
                data: category,
            });
        }
    } catch (error) {
        console.error("Error deleting mock test category:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message,
        });
    }
};
