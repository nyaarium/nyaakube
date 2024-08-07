import { createPromise } from "~/assets/common/createPromise";

/**
 * Reads the content of a file and returns it as a Uint8Array.
 * Browser only.
 *
 * @param file - The file to read.
 *
 * @returns A promise that resolves with the file content as a Uint8Array.
 *
 * @throws {TypeError} If the 'file' parameter is not a File object.
 * @throws {Error} If there is an error reading the file.
 *
 * @example
 * const file = files[0];
 * const content = await readFileContent(file);
 * -> Uint8Array(123456) [ 0, 1, 2, 3, 4, 5, ... ]
 */
export async function readFileContent(file: File): Promise<Uint8Array> {
	if (!(file instanceof File)) {
		throw new TypeError(
			`readFileContent(file) : 'file' must be a File object.`,
		);
	}

	const pr = createPromise<void>();

	const views: Uint8Array[] = [];

	const reader = new FileReader();
	reader.addEventListener("load", (event) => {
		if (event.target?.result) {
			views.push(new Uint8Array(event.target.result as ArrayBuffer));
		}
	});
	reader.addEventListener("error", (event) => {
		console.warn(`Error reading file`);
		pr.reject(event);
	});
	reader.addEventListener("loadend", () => {
		pr.resolve();
	});
	reader.readAsArrayBuffer(file);

	await pr.promise;

	// Concat all buffers
	const newLength = views.reduce((sum, view) => sum + view.byteLength, 0);
	const newBuffer = new Uint8Array(newLength);
	let offset = 0;

	for (const view of views) {
		newBuffer.set(view, offset);
		offset += view.byteLength;
	}

	return newBuffer;
}
