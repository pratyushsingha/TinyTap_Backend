import jwt from "jsonwebtoken";
import { User } from "../../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/AsyncHandler.js";

export const verifyJWT = asyncHandler(async (req, _, next) => {
  try {
    const token =
      req.cookies?.accessToken ||
      req.headers("Authorization")?.replace("Bearer", "");

    if (!token) throw new ApiError(401, "unathorized request");

    const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

    const user = await User.findById(decodedToken?._id).select(
      "-password -refreshToken"
    );

    if (!user) throw new ApiError(401, "invalid access token");

    req.user = user;
    next();
  } catch (error) {
    throw new ApiError(401, err?.message);
  }
});
