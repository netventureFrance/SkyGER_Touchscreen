// Netlify Function to trigger GitHub Actions workflow for Notion sync

export async function handler(event, context) {
    const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
    const GITHUB_REPO = process.env.GITHUB_REPO || 'netventureFrance/SkyGER_Touchscreen';
    const headers = { 'Content-Type': 'application/json' };

    // Parse request
    let body = {};
    try {
        body = JSON.parse(event.body || '{}');
    } catch (e) {}

    // Check status of running workflow
    if (event.httpMethod === 'GET' || body.action === 'status') {
        return await getWorkflowStatus(GITHUB_TOKEN, GITHUB_REPO, headers);
    }

    // Only allow POST for trigger
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
    }

    if (!GITHUB_TOKEN) {
        return {
            statusCode: 500, headers,
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
                statusCode: 404, headers,
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
                body: JSON.stringify({ ref: 'main' })
            }
        );

        if (response.status === 204) {
            // Wait a moment then get the run info
            await new Promise(r => setTimeout(r, 2000));
            const runInfo = await getLatestRun(GITHUB_TOKEN, GITHUB_REPO);

            return {
                statusCode: 200, headers,
                body: JSON.stringify({
                    success: true,
                    message: 'Sync workflow triggered successfully',
                    run: runInfo,
                    actionsUrl: `https://github.com/${GITHUB_REPO}/actions`
                })
            };
        } else if (response.status === 403) {
            return {
                statusCode: 403, headers,
                body: JSON.stringify({
                    success: false,
                    error: 'Permission denied (403)',
                    help: 'Your GITHUB_TOKEN needs "repo", "workflow", and "actions" permissions'
                })
            };
        } else {
            const errorData = await response.text();
            return {
                statusCode: response.status, headers,
                body: JSON.stringify({
                    success: false,
                    error: `GitHub API error: ${response.status}`,
                    details: errorData
                })
            };
        }
    } catch (error) {
        return {
            statusCode: 500, headers,
            body: JSON.stringify({ success: false, error: error.message })
        };
    }
}

async function getLatestRun(token, repo) {
    try {
        const response = await fetch(
            `https://api.github.com/repos/${repo}/actions/workflows/sync-notion.yml/runs?per_page=1`,
            {
                headers: {
                    'Accept': 'application/vnd.github.v3+json',
                    'Authorization': `token ${token}`
                }
            }
        );
        const data = await response.json();
        const run = data.workflow_runs?.[0];
        if (run) {
            return {
                id: run.id,
                status: run.status,
                conclusion: run.conclusion,
                started: run.created_at,
                url: run.html_url
            };
        }
    } catch (e) {}
    return null;
}

async function getWorkflowStatus(token, repo, headers) {
    if (!token) {
        return { statusCode: 500, headers, body: JSON.stringify({ error: 'No token' }) };
    }

    try {
        const response = await fetch(
            `https://api.github.com/repos/${repo}/actions/workflows/sync-notion.yml/runs?per_page=5`,
            {
                headers: {
                    'Accept': 'application/vnd.github.v3+json',
                    'Authorization': `token ${token}`
                }
            }
        );
        const data = await response.json();
        const runs = (data.workflow_runs || []).map(run => ({
            id: run.id,
            status: run.status,
            conclusion: run.conclusion,
            started: run.created_at,
            updated: run.updated_at,
            url: run.html_url
        }));

        return {
            statusCode: 200, headers,
            body: JSON.stringify({ success: true, runs })
        };
    } catch (error) {
        return {
            statusCode: 500, headers,
            body: JSON.stringify({ success: false, error: error.message })
        };
    }
}
