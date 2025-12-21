import Users from "../../../models/user.model.js";


export const getAllUsers = async (req, res) => {
  try {
    const users = await Users.find({});
    const response = {
      message: "Users fetched successfully",
      data: users
    };
    res.status(200).json(response);
  } catch (error) {
    console.error("Error fetching users", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};
export const getUserById = async (req, res) => {
  const userId = req.params.id;

  try {
    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }

    const user = await Users.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json(user);
  } catch (error) {
    console.log("Error fetching user by ID", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};
export const getUserByEmail = async (req, res) => {
  const userEmail = req.params.email; 

  try {
    if (!userEmail) {
      return res.status(400).json({ message: "User Email is required" });
    }

    const user = await Users.findOne({ email: userEmail }); 

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
        const response = {
      message: "User's Email fetched successfully",
      data: user
    };
    res.status(200).json(response);

  
  } catch (error) {
    console.log("Error fetching user by email", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const getUserByName = async (req, res) => {
  const fullName = req.params.Name; 

  try {
    if (!fullName) {
      return res.status(400).json({ message: "User name is required" });
    }

    // Split name assuming PascalCase or camelCase 
    const match = fullName.match(/^([A-Z][a-z]+)([A-Z][a-z]+)$/);

    if (!match) {
      return res.status(400).json({ message: "Name format invalid. " });
    }

    const [, firstName, lastName] = match;

    const user = await Users.findOne({ firstName, lastName });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json({
      message: "User's name fetched successfully",
      data: user,
    });
  } catch (error) {
    console.error("Error fetching user by name:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};





