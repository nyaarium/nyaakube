//===================
//
//    UNUSED
//
// Old code for checking against malicious actor IPs.
// Not that IP blocking can do much on the internet anyways. 🤷‍♂️

import moment from "moment-timezone";
import { asLogTime } from "~/assets/server/asLogTime";
import { getEnv } from "~/assets/server/getEnv";
// import fetch from "node-fetch";

let lastIpCheckGood = true; // If bad, do not go forward with the next request.
let lastIpCheckError = "";
let lastIpCheckTime = moment();
const runningIpChecks: Record<string, boolean> = {};

let IP2LOCATION_KEY: string | undefined;

interface IpLookupResult {
	ip: string;
	country_code: string;
	country_name: string;
	region_name: string;
	city_name: string;
	latitude: number;
	longitude: number;
	zip_code: string;
	time_zone: string;
	asn: string;
	as: string;
	is_proxy: boolean;
}

/**
 * Looks up the location information for a given IP address using the ip2location API.
 *
 * @param ip - The IP address to lookup.
 *
 * @returns A promise that resolves to an object with the results.
 *
 * @throws TypeError if the parameter types are bad.
 * @throws Error if the 'IP2LOCATION_KEY' environment variable is missing.
 *
 * @example
 * const res = await ipLookup("somewhere.com");
 * -> {
 *     "ip": "8.8.8.8",
 *     "country_code": "US",
 *     "country_name": "United States of America",
 *     "region_name": "California",
 *     "city_name": "Mountain View",
 *     "latitude": 37.405992,
 *     "longitude": -122.078515,
 *     "zip_code": "94043",
 *     "time_zone": "-07:00",
 *     "asn": "15169",
 *     "as": "Google LLC",
 *     "is_proxy": false
 * }
 */
// export
async function ipLookup(ip: string): Promise<IpLookupResult | undefined> {
	if (!IP2LOCATION_KEY) IP2LOCATION_KEY = getEnv("IP2LOCATION_KEY");

	if (!IP2LOCATION_KEY) {
		throw new TypeError(
			`ipLookup(ip) : 'IP2LOCATION_KEY' environment variable is missing.`,
		);
	}

	if (typeof ip !== "string") {
		throw new TypeError(`ipLookup(ip) : 'ip' must be a string.`);
	}

	try {
		if (!lastIpCheckGood) {
			const date1DayAgo = moment().subtract(1, "day");
			if (lastIpCheckTime.isBefore(date1DayAgo)) {
				lastIpCheckGood = true;
				lastIpCheckError = "";
			} else {
				console.log(
					`⛔`,
					asLogTime(),
					`Skipping IP lookup due to error ${lastIpCheckTime.fromNow()}. Error:`,
					lastIpCheckError,
				);
				return;
			}
		}

		if (lastIpCheckGood) {
			if (runningIpChecks[ip]) return;
			runningIpChecks[ip] = true;

			try {
				// const url = `https://api.ip2location.io/?format=json&key=${IP2LOCATION_KEY}&ip=${ip}`;
				// const json: IpLookupResult = await fetch(url).then((res) => res.json());
				// TODO: Implement fetch when the module is needed
				const json: IpLookupResult = {
					ip,
					country_code: "US",
					country_name: "United States of America",
					region_name: "California",
					city_name: "Mountain View",
					latitude: 37.405992,
					longitude: -122.078515,
					zip_code: "94043",
					time_zone: "-07:00",
					asn: "15169",
					as: "Google LLC",
					is_proxy: false,
				};

				lastIpCheckGood = true;
				lastIpCheckError = "";
				lastIpCheckTime = moment();

				delete runningIpChecks[ip];
				return json;
			} catch (error) {
				lastIpCheckGood = false;
				lastIpCheckError = `[${ip}] ${(error as Error).message}`;
				delete runningIpChecks[ip];
			}
		}
	} catch (error) {
		console.log(`ipLookup(ip) : Error with fetch call`);
		console.log((error as Error).message);

		lastIpCheckGood = false;
		lastIpCheckError = (error as Error).message;
		lastIpCheckTime = moment();

		delete runningIpChecks[ip];
	}
}
