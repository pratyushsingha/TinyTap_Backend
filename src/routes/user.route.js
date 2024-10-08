import { Router } from "express";
import {
  authStatus,
  changePassword,
  currentUser,
  forgotPassword,
  loginUser,
  logoutUser,
  registerUser,
  resetPassword,
  updateAvatar,
  updateUserDetails,
} from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT, verifyUser } from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/register").post(registerUser);
router.route("/login").post(loginUser);
router.route("/logout").post(verifyJWT, logoutUser);
router.route("/avatar").patch(verifyJWT, upload.single("avatar"), updateAvatar);
router.route("/current-user").get(verifyUser, currentUser);
router.route("/edit").patch(verifyJWT, updateUserDetails);
router.route("/auth-status").get(authStatus);
router.route("/change-password").patch(verifyJWT, changePassword);
router.route("/forgot-password").post(forgotPassword);
router.route("/reset-password").patch(resetPassword);

export default router;
