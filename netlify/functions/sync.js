// Netlify Function to trigger GitHub Actions workflow for Notion sync

export async function handler(event, context) {
    // Only allow POST requests
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
    const GITHUB_REPO = process.env.GITHUB_REPO || 'netventureFrance/SkyGER_Touchscreen';

    if (!GITHUB_TOKEN) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'GitHub token not configured' })
        };
    }

    try {
        // Trigger the GitHub Actions workflow
        const response = await fetch(
            `https://api.github.com/repos/${GITHUB_REPO}/actions/workflows/sync-notion.yml/dispatches`,
            {
                method: 'POST',
                headers: {
                    'Accept': 'application/vnd.github.v3+json',
                    'Authorization': `token ${GITHUB_TOKEN}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    ref: 'main'
                })
            }
        );

        if (response.status === 204) {
            // Success - workflow dispatch doesn't return content
            return {
                statusCode: 200,
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    success: true,
                    message: 'Sync workflow triggered successfully',
                    workflowRun: 'Check GitHub Actions for progress'
                })
            };
        } else {
            const errorData = await response.text();
            return {
                statusCode: response.status,
                body: JSON.stringify({
                    success: false,
                    error: `GitHub API error: ${response.status}`,
                    details: errorData
                })
            };
        }
    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({
                success: false,
                error: error.message
            })
        };
    }
}
