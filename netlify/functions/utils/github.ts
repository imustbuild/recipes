/**
 * GitHub API Commit Helper
 * 
 * Creates atomic commits using the GitHub API:
 * 1. Create blobs for file contents
 * 2. Create tree with blobs
 * 3. Create commit pointing to tree
 * 4. Move branch ref to new commit
 */

interface GitHubConfig {
  owner: string;
  repo: string;
  branch: string;
  token: string;
}

interface FileChange {
  path: string;
  content: string;
}

interface GitHubBlob {
  sha: string;
  url: string;
}

interface GitHubTree {
  sha: string;
  url: string;
}

interface GitHubCommit {
  sha: string;
  url: string;
  html_url: string;
}

/**
 * Get GitHub configuration from environment
 */
export function getGitHubConfig(): GitHubConfig {
  const owner = process.env.GIT_REPO_OWNER;
  const repo = process.env.GIT_REPO_NAME;
  const branch = process.env.GIT_DEFAULT_BRANCH || 'main';
  const token = process.env.GIT_PAT;
  
  if (!owner || !repo || !token) {
    throw new Error('Missing GitHub configuration. Required: GIT_REPO_OWNER, GIT_REPO_NAME, GIT_PAT');
  }
  
  return { owner, repo, branch, token };
}

/**
 * Make authenticated GitHub API request
 */
async function githubFetch(
  config: GitHubConfig,
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  const url = `https://api.github.com/repos/${config.owner}/${config.repo}${endpoint}`;
  
  const response = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${config.token}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
      'X-GitHub-Api-Version': '2022-11-28',
      ...options.headers,
    },
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`GitHub API error: ${response.status} ${error}`);
  }
  
  return response;
}

/**
 * Get current branch ref SHA
 */
async function getBranchSha(config: GitHubConfig): Promise<string> {
  const response = await githubFetch(config, `/git/ref/heads/${config.branch}`);
  const data = await response.json();
  return data.object.sha;
}

/**
 * Get commit's tree SHA
 */
async function getCommitTreeSha(config: GitHubConfig, commitSha: string): Promise<string> {
  const response = await githubFetch(config, `/git/commits/${commitSha}`);
  const data = await response.json();
  return data.tree.sha;
}

/**
 * Create a blob (file content)
 */
async function createBlob(config: GitHubConfig, content: string): Promise<GitHubBlob> {
  const response = await githubFetch(config, '/git/blobs', {
    method: 'POST',
    body: JSON.stringify({
      content,
      encoding: 'utf-8',
    }),
  });
  
  return response.json();
}

/**
 * Create a tree with file blobs
 */
async function createTree(
  config: GitHubConfig,
  baseTreeSha: string,
  files: { path: string; sha: string }[]
): Promise<GitHubTree> {
  const tree = files.map(file => ({
    path: file.path,
    mode: '100644' as const,
    type: 'blob' as const,
    sha: file.sha,
  }));
  
  const response = await githubFetch(config, '/git/trees', {
    method: 'POST',
    body: JSON.stringify({
      base_tree: baseTreeSha,
      tree,
    }),
  });
  
  return response.json();
}

/**
 * Create a commit
 */
async function createCommit(
  config: GitHubConfig,
  message: string,
  treeSha: string,
  parentSha: string
): Promise<GitHubCommit> {
  const response = await githubFetch(config, '/git/commits', {
    method: 'POST',
    body: JSON.stringify({
      message,
      tree: treeSha,
      parents: [parentSha],
    }),
  });
  
  return response.json();
}

/**
 * Update branch ref to point to new commit
 */
async function updateBranchRef(config: GitHubConfig, commitSha: string): Promise<void> {
  await githubFetch(config, `/git/refs/heads/${config.branch}`, {
    method: 'PATCH',
    body: JSON.stringify({
      sha: commitSha,
      force: false,
    }),
  });
}

/**
 * Commit multiple files atomically
 */
export async function commitFiles(
  files: FileChange[],
  message: string
): Promise<{ commit: GitHubCommit; files: string[] }> {
  const config = getGitHubConfig();
  
  // 1. Get current branch SHA
  const branchSha = await getBranchSha(config);
  
  // 2. Get current tree SHA
  const baseTreeSha = await getCommitTreeSha(config, branchSha);
  
  // 3. Create blobs for all files
  const blobPromises = files.map(async file => ({
    path: file.path,
    sha: (await createBlob(config, file.content)).sha,
  }));
  
  const blobs = await Promise.all(blobPromises);
  
  // 4. Create new tree
  const tree = await createTree(config, baseTreeSha, blobs);
  
  // 5. Create commit
  const commit = await createCommit(config, message, tree.sha, branchSha);
  
  // 6. Update branch ref
  await updateBranchRef(config, commit.sha);
  
  return {
    commit,
    files: files.map(f => f.path),
  };
}

/**
 * Check if GitHub config is valid
 */
export function isGitHubConfigured(): boolean {
  try {
    getGitHubConfig();
    return true;
  } catch {
    return false;
  }
}

