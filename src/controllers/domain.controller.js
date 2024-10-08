import dns from "dns";
import { promisify } from "util";
import { exec } from "child_process";

import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/AsyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Domain } from "../../models/domain.model.js";
import { User } from "../../models/user.model.js";

const resolveCname = promisify(dns.resolveCname);
const execPromise = promisify(exec);

const addDomain = asyncHandler(async (req, res) => {
  const { domain } = req.body;

  const userDomainCount = await Domain.find({
    owner: req.user._id,
  }).countDocuments();

  const user = await User.findById(req.user._id);

  if (user.userType === "free" && userDomainCount >= 1) {
    throw new ApiError(400, "You can only add one domain");
  }

  const domainExists = await Domain.findOne({ domain, owner: req.user._id });
  if (domainExists) {
    throw new ApiError(400, "Domain already added");
  }

  const subdomain = domain.split(".")[0];
  const cnameRecord = {
    name: subdomain,
    value: process.env.CNAME_TARGET,
  };

  const saveDomain = await Domain.create({
    url: domain,
    cnameRecord,
    owner: req.user._id,
  });

  if (!saveDomain) {
    throw new ApiError(500, "Unable to save domain");
  }

  res.status(201).json(
    new ApiResponse(
      200,
      {
        domain: saveDomain,
        cnameRecord,
        instructions: `Log in to your DNS provider's management console and add the following CNAME record to your domain's DNS settings. It may take some time for DNS changes to propagate. Name: ${cnameRecord.name}, Value: ${cnameRecord.value}`,
      },
      "domain adding in progress"
    )
  );
});

const verifyDomainOwnership = asyncHandler(async (req, res) => {
  const { domainId } = req.params;

  if (!domainId) {
    throw new ApiError(400, "Domain ID is required");
  }

  const domain = await Domain.findById(domainId);
  if (!domain) {
    throw new ApiError(404, "Domain not found");
  }

  if (domain.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "Not authorized to verify this domain");
  }

  if (domain.isDomainVerified) {
    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          { isDomainVerified: true },
          "Domain ownership already verified"
        )
      );
  } else {
    try {
      const records = await resolveCname(domain.url);
      if (records.includes(`${process.env.CNAME_TARGET}`)) {
        domain.isDomainVerified = true;
        await domain.save();
        try {
          await execPromise(
            `sudo ${process.env.NGINX_SCRIPT_FILE_PATH} ${domain.url} ${process.env.BACKEND_SERVICE} ${process.env.CERTBOT_EMAIL}`
          );
          console.log(`${domain.url} added to nginx config`);
        } catch (error) {
          console.error(
            `error while adding the domain in nginx config ${error.message}`
          );
          throw new ApiError(
            500,
            `error while adding the domain in nginx config ${error.message}`
          );
        }
        return res
          .status(200)
          .json(
            new ApiResponse(
              200,
              { isDomainVerified: true },
              "Domain ownership verified successfully"
            )
          );
      } else {
        console.log("Verification failed: CNAME target not found");
        return res
          .status(400)
          .json(
            new ApiResponse(
              400,
              { isDomainVerified: false },
              "CNAME target not found... try again later"
            )
          );
      }
    } catch (err) {
      console.error("Failed to resolve CNAME records:", err);
      return res
        .status(500)
        .json(new ApiResponse(500, null, "Failed to resolve CNAME records"));
    }
  }
});

const domainDetails = asyncHandler(async (req, res) => {
  const { domainId } = req.params;
  if (!domainId) {
    throw new ApiError(400, "Domain ID is required");
  }
  const domain = await Domain.findById(domainId);
  console.log(domain);
  if (domain.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "You are not authorized to view this domain");
  } else {
    return res
      .status(200)
      .json(
        new ApiResponse(200, domain, "Domain details retrieved successfully")
      );
  }
});

const allDomains = asyncHandler(async (req, res) => {
  const domains = await Domain.find({ owner: req.user._id }).select(
    "_id url isDomainVerified"
  );
  return res
    .status(200)
    .json(new ApiResponse(200, domains, "All domains retrieved successfully"));
});

const allVerifiedDomains = asyncHandler(async (req, res) => {
  const domains = await Domain.find({
    owner: req.user._id,
    isDomainVerified: true,
  }).select("_id url isDomainVerified");
  return res
    .status(200)
    .json(new ApiResponse(200, domains, "All domains retrieved successfully"));
});

export {
  addDomain,
  verifyDomainOwnership,
  domainDetails,
  allDomains,
  allVerifiedDomains,
};
