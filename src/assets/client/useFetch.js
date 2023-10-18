import { fetchJSON, useLoadingCallback } from "@/assets/client";
import { useSnackbar } from "@/components/Snackbar";
import { useMemo } from "react";

const DEV = process.env.NODE_ENV !== "production";

/**
 * A custom hook that uses `fetchJSON` to make API calls and wraps around `useLoadingCallback`.
 *
 * This hook is useful for making API calls and managing the loading and error states. It also provides snack bar notifications for errors.
 *
 * @param {Function} paramsCallback - A callback function that returns an object containing the URL, data, and options for the fetch call.
 * @param {Array} watchList - Watch list like with regular useCallback.
 *
 * @returns {[Function, boolean, Error?]} - A hook containing: fetch function, loading state, and Error.
 *
 * @throws {TypeError} If the parameter types are bad.
 * @throws {UnauthorizedError} If the response status is 401.
 * @throws {AccessDeniedError} If the response status is 403.
 * @throws {TooManyRequestsError} If the response status is 429.
 * @throws {Error} If the response status is not 200-299.
 * @throws {Error} If the response is not JSON.
 *
 * @example
 * const [fetchData, loading, error] = useFetch(() => ({ url: `/api/session/login`, data: { email, password } }), [email, password]);
 * -> fetchData: Function, loading: boolean, error: Error
 */
export function useFetch(paramsCallback, watchList) {
	const { errorSnack } = useSnackbar();

	if (DEV) {
		if (typeof paramsCallback !== "function") {
			throw new TypeError(
				`useFetch(paramsCallback, watchList) : 'paramsCallback' must be a function.`,
			);
		}

		if (paramsCallback.constructor.name === "AsyncFunction") {
			throw new TypeError(
				`useFetch(paramsCallback, watchList) : 'paramsCallback' cannot be async.`,
			);
		}

		if (!Array.isArray(watchList)) {
			throw new TypeError(
				`useFetch(paramsCallback, watchList) : 'watchList' must be an array.`,
			);
		}
	}

	// Do not watch on `paramsCallback` for the next line. This should behave like useCallback.
	// eslint-disable-next-line react-hooks/exhaustive-deps
	const params = useMemo(() => paramsCallback(), watchList);

	if (DEV) {
		// Params: Expect object
		if (params === null || typeof params !== "object") {
			throw new TypeError(
				`useFetch(paramsCallback, watchList) : 'paramsCallback()' must return an object of parameters for fetch.`,
			);
		}

		// Params: Expect params.url
		if (typeof params.url !== "string") {
			throw new TypeError(
				`useFetch(paramsCallback, watchList) : 'paramsCallback().url' must be a string.`,
			);
		}

		// Params: Expect optional params.data
		if (
			params.data !== undefined &&
			(params.data === null || typeof params.data !== "object")
		) {
			throw new TypeError(
				`useFetch(paramsCallback, watchList) : 'paramsCallback().data' is optional, but must be an object.`,
			);
		}

		// Params: Expect optional params.options
		if (
			params.options !== undefined &&
			(params.options === null || typeof params.options !== "object")
		) {
			throw new TypeError(
				`useFetch(paramsCallback, watchList) : 'paramsCallback().options' is optional, but must be an object.`,
			);
		}

		// Params: Expect optional params.validate
		if (
			params.validate !== undefined &&
			typeof params.validate !== "function"
		) {
			throw new TypeError(
				`useFetch(paramsCallback, watchList) : 'paramsCallback().validate' is optional, but must be a function.`,
			);
		}

		// Params: Expect optional params.onSuccess
		if (
			params.onSuccess !== undefined &&
			typeof params.onSuccess !== "function"
		) {
			throw new TypeError(
				`useFetch(paramsCallback, watchList) : 'paramsCallback().onSuccess' is optional, but must be a function.`,
			);
		}

		// Params: Expect optional params.onError
		if (
			params.onError !== undefined &&
			typeof params.onError !== "function"
		) {
			throw new TypeError(
				`useFetch(paramsCallback, watchList) : 'paramsCallback().onError' is optional, but must be a function.`,
			);
		}
	}

	const [fetchCallback, loading, error] = useLoadingCallback(
		async (data) => {
			if (params.validate && !(await params.validate())) {
				// Validation check failed
				return;
			}

			try {
				const data = await fetchJSON(
					params.url,
					params.data,
					params.options,
				);
				if (params.onSuccess) {
					await params.onSuccess(data);
				}
				return data;
			} catch (err) {
				if (params.onError) {
					await params.onError(err);
				} else {
					errorSnack(err.message);
				}
			}
		},
		// Do not watch on `params` for the next line. This should behave like useCallback.
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[errorSnack, ...watchList],
	);

	return [fetchCallback, loading, error];
}
