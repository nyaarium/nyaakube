/**
 * Encodes an object into a query string or returns a string as is.
 *
 * @param data - The object to encode into a query string.
 * @param url - Optional URL to append the query string to.
 *
 * @returns The encoded query string or the original string if `data` is not an object.
 *
 * @throws TypeError If the parameter types are incorrect.
 *
 * @example
 * const url = encodeQueryString({ foo: "bar" }, "https://example.com");
 * -> "https://example.com?foo=bar"
 */
export function encodeQueryString(
	data: Record<string, any>,
	url?: string,
): string {
	if (typeof data !== "object" || data === null) {
		throw new TypeError(
			"encodeQueryString(data, url?) : 'data' must be an object.",
		);
	}

	if (url !== undefined && typeof url !== "string") {
		throw new TypeError(
			"encodeQueryString(data, url?) : 'url' is optional, but must be a string.",
		);
	}

	const query = Object.entries(data)
		.filter((entry) => {
			if (entry[1] === undefined || entry[1] === null) return false;
			return true;
		})
		.map((pair) => {
			const k = encodeURIComponent(pair[0]);
			const v = encodeURIComponent(pair[1]);
			return `${k}=${v}`;
		})
		.join("&");

	if (url) {
		return `${url}?${query}`;
	} else {
		return query;
	}
}
