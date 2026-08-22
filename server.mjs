import express from "express";
import cors from "cors";
import dotenv from "dotenv"; // For loading environment variables
import { Octokit } from "@octokit/rest"; // For GitHub repo/file operations
import ModelClient, { isUnexpected } from "@azure-rest/ai-inference"; // For GitHub AI Inference chatbot

dotenv.config(); // Load environment variables from .env file

const app = express();
app.use(cors());
app.use(express.json());

// --- GitHub AI Inference Client (for the /ask endpoint) ---
const githubAiToken = process.env.GITHUB_AI_TOKEN;
if (!githubAiToken) {
  console.error("ERROR: GITHUB_AI_TOKEN environment variable is not set! This is required for the chatbot.");
  process.exit(1);
}
const githubAiEndpoint = "https://models.github.ai/inference";
const githubAiModel = "openai/gpt-4.1"; // Or other models available on GitHub AI inference

const aiClient = ModelClient(
  githubAiEndpoint,
  new AzureKeyCredential(githubAiToken),
);

// --- Octokit Client (for GitHub repository/file operations) ---
const githubToken = process.env.GITHUB_TOKEN; // Use a separate env var for Octokit
if (!githubToken) {
    console.warn("WARNING: GITHUB_TOKEN environment variable is not set! GitHub repository operations will not work.");
    // Optionally, you might want to process.exit(1) here if GitHub ops are critical.
}
const octokit = new Octokit({
    auth: githubToken
});


// Endpoint for general AI chat (uses GitHub AI Inference)
app.post("/ask", async (req, res) => {
  try {
    const { message } = req.body;

    const response = await aiClient.path("/chat/completions").post({
      body: {
        messages: [
          { role:"user", content: message }
        ],
        temperature: 1,
        top_p: 1,
        model: githubAiModel
      }
    });

    if (isUnexpected(response)) {
      throw response.body.error;
    }

    res.json({ reply: response.body.choices[0].message.content });
  } catch (error) {
    console.error("GitHub AI Inference API Error:", error);
    res.status(500).json({ reply: "Error: Unable to process your AI request. Check server logs." });
  }
});

// --- GitHub API Endpoints (re-added) ---

// Create a new GitHub Repository
app.post("/github/create-repo", async (req, res) => {
    if (!octokit.auth) {
        return res.status(401).json({ success: false, message: "GitHub token not configured on server." });
    }
    try {
        const { name, description, privateRepo } = req.body;
        const response = await octokit.repos.createForAuthenticatedUser({
            name,
            description,
            private: privateRepo
        });
        res.json({ success: true, repo: response.data });
    } catch (error) {
        console.error("GitHub API Error (Create Repo):", error.response?.data || error.message || error);
        res.status(500).json({ success: false, message: `Error creating repository: ${error.response?.data?.message || error.message}` });
    }
});

// Get a user's repositories
app.get("/github/repos/:username", async (req, res) => {
    if (!octokit.auth) {
        return res.status(401).json({ success: false, message: "GitHub token not configured on server." });
    }
    try {
        const { username } = req.params;
        const response = await octokit.repos.listForUser({
            username
        });
        res.json({ success: true, repos: response.data });
    } catch (error) {
        console.error("GitHub API Error (List Repos):", error.response?.data || error.message || error);
        res.status(500).json({ success: false, message: `Error fetching repositories: ${error.response?.data?.message || error.message}` });
    }
});

// Create a file (or update) in a repository
app.post("/github/create-file", async (req, res) => {
    if (!octokit.auth) {
        return res.status(401).json({ success: false, message: "GitHub token not configured on server." });
    }
    try {
        const { owner, repo, path, message, content, branch } = req.body;
        // Content needs to be base64 encoded
        const encodedContent = Buffer.from(content).toString('base64');

        let sha = null;
        try {
            // Try to get the existing file's SHA to update it
            const { data } = await octokit.repos.getContents({
                owner,
                repo,
                path,
                ref: branch
            });
            sha = data.sha;
        } catch (error) {
            if (error.status === 404) {
                // File doesn't exist, so no SHA needed for creation
                sha = null;
            } else {
                throw error; // Re-throw other errors
            }
        }

        const response = await octokit.repos.createOrUpdateFileContents({
            owner,
            repo,
            path,
            message,
            content: encodedContent,
            sha, // Only provide SHA if updating an existing file
            branch
        });
        res.json({ success: true, file: response.data });
    } catch (error) {
        console.error("GitHub API Error (Create/Update File):", error.response?.data || error.message || error);
        res.status(500).json({ success: false, message: `Error creating or updating file: ${error.response?.data?.message || error.message}` });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));