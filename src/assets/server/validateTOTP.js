import sleep from "@/assets/common/sleep";
import speakeasy from "@levminer/speakeasy";

/**
 * Validates a TOTP token.
 *
 * @param {string} totpSecret - The TOTP config/secret string.
 * @param {string} token - The TOTP token from input.
 *
 * @returns {Promise<{
 *     valid: boolean,
 *     code?: number,
 *     message?: string,
 * }>} - A promise that resolves to an object with the results.
 *
 * @example
 * const totpSecret = "6,30,30,ABCDEFGHIJKLMNOPQRSTUVWXYZ";
 * const resValid = await validateTOTP(totpSecret, "123456");
 * // { valid: true }
 */
export default async function validateTOTP(totpSecret, token) {
	try {
		if (typeof totpSecret !== "string") {
			throw new Error(
				`validateTOTP(totpSecret, token) : Expected a string config`,
			);
		}

		const split = totpSecret.split(",").map((s) => s.trim());
		if (split.length !== 4) {
			throw new Error(
				`validateTOTP(totpSecret, token) : Expected a comma delimited TOTP config string: DIGITS,PERIOD,STEP,SECRET`,
			);
		}

		// eslint-disable-next-line prefer-const
		let [digits, period, step, secret] = split;

		digits = parseInt(digits);
		period = parseInt(period);
		step = parseInt(step);
		if (isNaN(digits) || isNaN(period) || isNaN(step)) {
			throw new Error(
				`validateTOTP(totpSecret, token) : Expected a comma delimited TOTP config string: DIGITS,PERIOD,STEP,SECRET`,
			);
		}

		if (!token) {
			return {
				valid: false,
				code: 403,
				message: `An access token is required for this page`,
			};
		}

		token = String(token);

		// Give vague expectation about token length
		if (token.length < 6 || 25 < token.length) {
			return {
				valid: false,
				code: 400,
				message: `Expected a TOTP token (numbers-only, 6-25 digits)`,
			};
		}

		// eslint-disable-next-line security/detect-non-literal-regexp
		if (!new RegExp(`^\\d{${digits}}$`).test(token)) {
			await randomSleep();
			return {
				valid: false,
				code: 401,
				message: `Invalid TOTP token`,
			};
		}

		const isValid = speakeasy.totp.verify({
			encoding: "base32",
			digits,
			period,
			step, // Speakeasy uses step instead of window
			secret,
			token,
		});

		if (isValid) {
			return {
				valid: true,
			};
		} else {
			await randomSleep();
			return {
				valid: false,
				code: 401,
				message: `Invalid TOTP token`,
			};
		}
	} catch (error) {
		console.error(error);
		await randomSleep();
		return {
			valid: false,
			code: 500,
			message: "Internal server error",
		};
	}
}

// Randomize reply time
const R = ((Math.random() * 1000) | 0) + 50;
const randomSleep = () => {
	return sleep(R + Math.random() * 1000);
};
