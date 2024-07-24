import { json, LoaderFunctionArgs } from "@remix-run/node";
import { makeBadge } from "badge-maker";
import { fetchJson } from "~/assets/common";
import { getEnv } from "~/assets/server";

interface BadgeData {
	enabled: boolean;
	url?: string;
	image?: any;
	fetchData: () => Promise<any>;
}

interface BadgeJson {
	url: string;
	image: string;
}

let badges: BadgeJson[] | null = null;

export async function loader({ request }: LoaderFunctionArgs) {
	// const url = new URL(request.url);
	// const data = JSON5.parse(url.searchParams.get("data") ?? "{}");

	await initializeBadges();
	return json(badges);
}

async function initializeBadges() {
	if (badges) return;

	const PUBLIC_HOST = getEnv("PUBLIC_HOST");

	badges = [];
	const badgesData: BadgeData[] = [
		{
			enabled: !!PUBLIC_HOST,
			url: `https://developer.mozilla.org/en-US/observatory/analyze?host=${PUBLIC_HOST}`,
			async fetchData() {
				const json = await fetchJson(
					`https://observatory-api.mdn.mozilla.net/api/v2/analyze?host=${PUBLIC_HOST}`,
				);

				const grade = json.history.pop();

				let color;
				if (85 <= grade.score) {
					color = "brightgreen";
				} else if (65 <= grade.score) {
					color = "yellow";
				} else {
					color = "red";
				}

				const format = {
					label: "Observatory",
					message: `${grade.grade}`,
					color,
				};

				return `data:image/svg+xml;base64,` + btoa(makeBadge(format));
			},
		},
	];

	for (const badge of badgesData) {
		if (!badge.enabled) continue;

		if (!badge.image) {
			try {
				console.log(`Fetching badge for: ${badge.url}`);

				badge.image = await badge.fetchData();
			} catch (error) {
				badge.enabled = false;
				console.error("Error fetching badge", error);
				continue;
			}
		}

		badges.push({
			url: badge.url!,
			image: badge.image,
		});
	}
}
