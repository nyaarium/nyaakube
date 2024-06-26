import {
	AccessDeniedError,
	NotFoundError,
	TooManyRequestsError,
	UnauthorizedError,
} from "@/assets/ErrorTypes";
import { encodeQueryString } from "@/assets/common/encodeQueryString";
import json5 from "json5";
import _ from "lodash";

/**
 * Fetch [GET|POST] JSON
 *
 * Formats a fetch call to send & accept JSON.
 * Sets the method to POST if a JSON is provided.
 *
 * If the server fails to return a JSON (typically fatal errors), this will error with the whole HTML response.
 *
 * @typedef {Object} FetchOptions
 * @property {boolean} [form=false] - Whether to send the data as form data.
 *
 * @param {string} url - The URL to fetch.
 * @param {Object} [data] - Optional JSON data to send.
 * @param {FetchOptions} [otherOptions] - Optional fetch options.
 *
 * @returns {Promise<Object>} - The JSON response.
 *
 * @throws {TypeError} If the parameter types are bad.
 * @throws {UnauthorizedError} If the response status is 401.
 * @throws {AccessDeniedError} If the response status is 403.
 * @throws {TooManyRequestsError} If the response status is 429.
 * @throws {Error} If the response status is not 200-299.
 * @throws {Error} If the response is not JSON.
 *
 * @example
 * const data = await fetchJson(`/api/session/login`, { email, password });
 * -> { success: true, message: "Login successful." }
 */
export async function fetchJson(url, data, options = {}) {
	if (typeof url !== "string") {
		throw new TypeError(
			`fetchJson(url, data?, options?) : 'url' must be a string.`,
		);
	}
	if (data !== undefined && (typeof data !== "object" || data === null)) {
		throw new TypeError(
			`fetchJson(url, data?, options?) : 'data' is optional, but must be an object.`,
		);
	}
	if (
		options !== undefined &&
		(typeof options !== "object" || options === null)
	) {
		throw new TypeError(
			`fetchJson(url, data?, options?) : 'options' is optional, but must be an object.`,
		);
	}

	const { accessToken, clientId, ...otherOptions } = options;

	const asForm = !!otherOptions?.form;

	let fetchData;

	if (asForm) {
		fetchData = _.merge(
			{
				method: "post",
			},
			otherOptions,
		);
	} else {
		const defaultMethod = data !== undefined ? "post" : "get";
		fetchData = _.merge(
			{
				method: otherOptions.method
					? otherOptions.method
					: defaultMethod,
				headers: {
					"Accept": "application/json",
					"Content-Type": "application/json",
				},
			},
			otherOptions,
		);
	}

	if (asForm) {
		const formData = new FormData();

		Object.entries(data).forEach(([key, value]) => {
			if (value instanceof FileList || Array.isArray(value)) {
				for (const v of value) formData.append(key, v);
			} else {
				formData.append(key, value);
			}
		});

		fetchData.body = formData;
	} else {
		if (data !== undefined) {
			if (fetchData.method.toLowerCase() === "get") {
				url = encodeQueryString(data, url);
			} else {
				fetchData.body = JSON.stringify(data);
			}
		}
	}

	// If data is being sent by headers, stringify it.
	if (fetchData.headers?.data) {
		fetchData.headers.data = json5.stringify(fetchData.headers.data);
	}

	if (accessToken) {
		otherOptions.headers["Authorization"] = `Bearer ${accessToken}`;
	}

	if (clientId) {
		otherOptions.headers["Client-ID"] = clientId;
	}

	const res = await fetch(url, fetchData);

	let json;
	try {
		json = await res.clone().json();
	} catch (err) {
		return res.text().then((unexpectedText) => {
			if (res.status === 401) {
				throw new UnauthorizedError(unexpectedText);
			}

			if (res.status === 403) {
				throw new AccessDeniedError(unexpectedText);
			}

			if (res.status === 404) {
				throw new NotFoundError(unexpectedText);
			}

			if (res.status === 429) {
				throw new TooManyRequestsError(unexpectedText);
			}

			throw new Error(
				`[${res.status}] Unexpected non-json response: ` +
					unexpectedText,
			);
		});
	}

	if (200 <= res.status && res.status < 300) {
		return json;
	} else {
		if (res.status === 401) {
			throw new UnauthorizedError(json.message);
		}
		if (res.status === 403) {
			throw new AccessDeniedError(json.message);
		}
		if (res.status === 404) {
			throw new NotFoundError(json.message);
		}
		if (res.status === 429) {
			throw new TooManyRequestsError(json.message);
		}

		throw new Error(json.message ?? JSON.stringify(json));
	}
}
