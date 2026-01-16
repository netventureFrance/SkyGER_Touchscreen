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
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                success: false,
                error: 'GITHUB_TOKEN not configured in Netlify environment variables',
                help: 'Go to Netlify > Site Settings > Environment Variables and add GITHUB_TOKEN'
            })
        };
    }

    try {
        // First, check if the workflow file exists
        const workflowCheck = await fetch(
            `https://api.github.com/repos/${GITHUB_REPO}/actions/workflows/sync-notion.yml`,
            {
                headers: {
                    'Accept': 'application/vnd.github.v3+json',
                    'Authorization': `token ${GITHUB_TOKEN}`
                }
            }
        );

        if (workflowCheck.status === 404) {
            return {
                statusCode: 404,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    success: false,
                    error: 'Workflow file not found',
                    help: 'Create .github/workflows/sync-notion.yml in your repository'
                })
            };
        }

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
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    success: true,
                    message: 'Sync workflow triggered successfully',
                    workflowRun: 'Check GitHub Actions for progress',
                    actionsUrl: `https://github.com/${GITHUB_REPO}/actions`
                })
            };
        } else if (response.status === 403) {
            return {
                statusCode: 403,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    success: false,
                    error: 'Permission denied (403)',
                    help: 'Your GITHUB_TOKEN needs "repo" and "workflow" scopes. Update token at github.com/settings/tokens'
                })
            };
        } else if (response.status === 404) {
            return {
                statusCode: 404,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    success: false,
                    error: 'Workflow not found or not enabled',
                    help: 'Make sure sync-notion.yml exists in .github/workflows/'
                })
            };
        } else {
            const errorData = await response.text();
            return {
                statusCode: response.status,
                headers: { 'Content-Type': 'application/json' },
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
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                success: false,
                error: error.message
            })
        };
    }
}
