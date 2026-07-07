import jwt from "jsonwebtoken";

const isCoordinator = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const tokenFromHeader = authHeader ? authHeader.split(" ")[1] : null;
  const token = tokenFromHeader || req.cookies?.token || req.cookies?.accessToken;

  if (!token) {
    return res
      .status(401)
      .json({ success: false, message: "Authorization token missing" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.role !== "COORDINATOR" && decoded.role !== "LEAD") {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    req.userId = decoded.userId;
    req.role = decoded.role;
    req.libId = decoded.library_id;
    next();
  } catch (err) {
    return res.status(403).json({ success: false, message: "Invalid token" });
  }
};

export default isCoordinator;
