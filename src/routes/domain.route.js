import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {
  addDomain,
  allDomains,
  allVerifiedDomains,
  domainDetails,
  verifyDomainOwnership,
} from "../controllers/domain.controller.js";

const router = Router();

router.route("/").post(verifyJWT, addDomain);
router.route("/all/verified").get(verifyJWT, allVerifiedDomains);
router.route("/all").get(verifyJWT, allDomains);
router.route("/:domainId/verify").get(verifyJWT, verifyDomainOwnership);
router.route("/:domainId").get(verifyJWT, domainDetails);

export default router;
