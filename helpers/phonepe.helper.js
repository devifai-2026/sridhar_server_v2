import crypto from "crypto";

const SALT_KEY = "96434309-7796-489d-8924-ab56988a6076";
const SALT_INDEX = 1;

// Generate X-VERIFY for STATUS API
export function generateStatusXVerify(merchantId, txnId) {
  const apiPath = `/pg/v1/status/${merchantId}/${txnId}`;
  const toSign = apiPath + SALT_KEY;

  const sha256 = crypto.createHash("sha256").update(toSign).digest("hex");

  return `${sha256}###${SALT_INDEX}`;
}
