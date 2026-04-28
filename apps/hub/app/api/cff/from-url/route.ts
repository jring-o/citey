import { extractFromGithub, ExtractError } from '@/lib/cff/extract';

export const dynamic = 'force-dynamic';

export async function GET(request: Request): Promise<Response> {
	const url = new URL(request.url).searchParams.get('url');
	if (!url || url.trim() === '') {
		return Response.json(
			{ error: 'Missing url query parameter' },
			{ status: 400 }
		);
	}
	try {
		const result = await extractFromGithub(url);
		return Response.json(result, { status: 200 });
	} catch (e) {
		if (!(e instanceof ExtractError)) {
			return Response.json(
				{ error: 'Could not reach GitHub' },
				{ status: 502 }
			);
		}
		switch (e.code) {
			case 'invalid_url':
				return Response.json(
					{ error: 'Invalid GitHub URL', message: e.message },
					{ status: 400 }
				);
			case 'not_found':
				return Response.json(
					{ error: 'Repo not found or private' },
					{ status: 404 }
				);
			case 'rate_limited':
				return Response.json(
					{ error: 'GitHub rate limit reached', resetAt: e.resetAt },
					{ status: 429 }
				);
			default:
				return Response.json(
					{ error: 'Could not reach GitHub' },
					{ status: 502 }
				);
		}
	}
}
