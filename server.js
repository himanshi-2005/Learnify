// Load environment variables from the .env file
require("dotenv").config();

// Import required packages
const express = require("express");
const cors = require("cors");
const path = require("path");
const OpenAI = require("openai");
const { BlobServiceClient } = require("@azure/storage-blob");

// Create Express app and set server port
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: "2mb" }));
app.use(express.static("public"));

// Configure the Azure microsoft Foundry client
const client = new OpenAI({
  apiKey: process.env.FOUNDRY_API_KEY,
  baseURL: `${process.env.FOUNDRY_ENDPOINT}/openai/v1`
});

// Serve the homepage from the public folder
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Generate summary, key points and questions from study notes
app.post("/api/study", async (req, res) => {
  try {
    const { notes } = req.body;

    // Validate that the user entered notes before sending to the AI
    if (!notes || !notes.trim()) {
      return res.status(400).json({ error: "Study notes are required." });
    }

    // Prompt tells the AI exactly what format to return
    const prompt = `
You are a helpful study assistant.

Analyze these study notes:

${notes}

Return ONLY valid JSON in this exact format:
{
  "summary": "A short clear summary of the notes.",
  "keyPoints": ["key point 1", "key point 2", "key point 3", "key point 4", "key point 5"],
  "questions": [
    {
      "question": "review question 1",
      "answer": "short answer 1"
    },
    {
      "question": "review question 2",
      "answer": "short answer 2"
    },
    {
      "question": "review question 3",
      "answer": "short answer 3"
    },
    {
      "question": "review question 4",
      "answer": "short answer 4"
    },
    {
      "question": "review question 5",
      "answer": "short answer 5"
    }
  ]
}
`;

   // Send notes to Azure OpenAI / Foundry for analysis
    const completion = await client.chat.completions.create({
      model: process.env.FOUNDRY_DEPLOYMENT,
      messages: [
        {
          role: "system",
          content: "You generate study summaries, key points, and review questions. Always return valid JSON only."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.4
    });

    // Convert the AI JSON text response into a JavaScript object
    const aiText = completion.choices[0].message.content;
    const parsed = JSON.parse(aiText);

    res.json(parsed);
  } catch (error) {
    console.error("AI error:", error.message);
    res.status(500).json({ error: "AI generation failed." });
  }
});

// Save a generated study session to Azure Blob Storage
app.post("/api/save-note", async (req, res) => {
  try {
    const studySession = req.body;

    // Make sure Azure Storage is configured before saving
    if (!process.env.AZURE_STORAGE_CONNECTION_STRING) {
      return res.status(500).json({ error: "Storage connection string is missing." });
    }

    // Connect to Azure Blob Storage
    const blobServiceClient = BlobServiceClient.fromConnectionString(
      process.env.AZURE_STORAGE_CONNECTION_STRING
    );

    // Get or create the container used for saved notes
    const containerName = process.env.AZURE_STORAGE_CONTAINER || "notes";
    const containerClient = blobServiceClient.getContainerClient(containerName);

    await containerClient.createIfNotExists();

    // Create a unique JSON file name for this study session
    const fileName = `study-session-${Date.now()}.json`;
    const blockBlobClient = containerClient.getBlockBlobClient(fileName);

    // Add a created date before uploading the session
    const data = JSON.stringify(
      {
        ...studySession,
        createdAt: new Date().toISOString()
      },
      null,
      2
    );

    // Upload the study session as a JSON blob
    await blockBlobClient.upload(data, Buffer.byteLength(data), {
      blobHTTPHeaders: {
        blobContentType: "application/json"
      }
    });

    res.json({
      message: "Study session saved successfully.",
      fileName
    });
  } catch (error) {
    console.error("Save error:", error.message);
    res.status(500).json({ error: "Could not save study session." });
  }
});

// Load all saved study sessions from Azure Blob Storage
app.get("/api/history", async (req, res) => {
  try {
    // Connect to Azure Blob Storage container
    const blobServiceClient = BlobServiceClient.fromConnectionString(
      process.env.AZURE_STORAGE_CONNECTION_STRING
    );

    const containerClient = blobServiceClient.getContainerClient(
      process.env.AZURE_STORAGE_CONTAINER || "notes"
    );

    const sessions = [];

    // Read every saved JSON blob and add it to the history list
    for await (const blob of containerClient.listBlobsFlat()) {
      try {
        const blockBlobClient = containerClient.getBlockBlobClient(blob.name);
        const downloadResponse = await blockBlobClient.download(0);
        const text = await streamToString(downloadResponse.readableStreamBody);

        const parsedSession = JSON.parse(text);
        sessions.push({
          ...parsedSession,
          fileName: blob.name
        });
      } catch (blobError) {
        console.log("Skipping invalid blob:", blob.name);
      }
    }

    // Sort important sessions first, then newest sessions
    const priorityRank = {
      very: 2,
      less: 1,
      none: 0
    };

    sessions.sort((a, b) => {
      const aPriority = a.importanceLevel || (a.important ? "very" : "none");
      const bPriority = b.importanceLevel || (b.important ? "very" : "none");

      if (priorityRank[aPriority] !== priorityRank[bPriority]) {
        return priorityRank[bPriority] - priorityRank[aPriority];
      }

      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    res.json(sessions);
  } catch (error) {
    console.error("History error:", error.message);
    res.status(500).json({ error: "Could not load history." });
  }
});

// Delete one saved study session from history
app.delete("/api/history/:fileName", async (req, res) => {
  try {
    if (!process.env.AZURE_STORAGE_CONNECTION_STRING) {
      return res.status(500).json({ error: "Storage connection string is missing." });
    }

    const blobServiceClient = BlobServiceClient.fromConnectionString(
      process.env.AZURE_STORAGE_CONNECTION_STRING
    );

    const containerClient = blobServiceClient.getContainerClient(
      process.env.AZURE_STORAGE_CONTAINER || "notes"
    );

    const blockBlobClient = containerClient.getBlockBlobClient(req.params.fileName);
    await blockBlobClient.deleteIfExists();

    res.json({ message: "Study session deleted." });
  } catch (error) {
    console.error("Delete history error:", error.message);
    res.status(500).json({ error: "Could not delete study session." });
  }
});

// Update the importance level of a saved study session
app.patch("/api/history/:fileName", async (req, res) => {
  try {
    if (!process.env.AZURE_STORAGE_CONNECTION_STRING) {
      return res.status(500).json({ error: "Storage connection string is missing." });
    }

    const blobServiceClient = BlobServiceClient.fromConnectionString(
      process.env.AZURE_STORAGE_CONNECTION_STRING
    );

    const containerClient = blobServiceClient.getContainerClient(
      process.env.AZURE_STORAGE_CONTAINER || "notes"
    );

    const blockBlobClient = containerClient.getBlockBlobClient(req.params.fileName);
    const downloadResponse = await blockBlobClient.download(0);
    const text = await streamToString(downloadResponse.readableStreamBody);
    const studySession = JSON.parse(text);
    const importanceLevel = ["very", "less"].includes(req.body.importanceLevel)
      ? req.body.importanceLevel
      : "none";
    const updatedSession = {
      ...studySession,
      important: importanceLevel !== "none",
      importanceLevel
    };
    const data = JSON.stringify(updatedSession, null, 2);

    await blockBlobClient.upload(data, Buffer.byteLength(data), {
      blobHTTPHeaders: {
        blobContentType: "application/json"
      }
    });

    res.json({
      message: importanceLevel === "very"
        ? "Study session marked very important."
        : importanceLevel === "less"
          ? "Study session marked less important."
          : "Study session importance removed.",
      importanceLevel
    });
  } catch (error) {
    console.error("Update history error:", error.message);
    res.status(500).json({ error: "Could not update study session." });
  }
});

// Delete all saved study sessions from Azure Blob Storage
app.delete("/api/history", async (req, res) => {
  try {
    if (!process.env.AZURE_STORAGE_CONNECTION_STRING) {
      return res.status(500).json({ error: "Storage connection string is missing." });
    }

    const blobServiceClient = BlobServiceClient.fromConnectionString(
      process.env.AZURE_STORAGE_CONNECTION_STRING
    );

    const containerClient = blobServiceClient.getContainerClient(
      process.env.AZURE_STORAGE_CONTAINER || "notes"
    );

    for await (const blob of containerClient.listBlobsFlat()) {
      await containerClient.deleteBlob(blob.name);
    }

    res.json({ message: "All study history deleted." });
  } catch (error) {
    console.error("Clear history error:", error.message);
    res.status(500).json({ error: "Could not delete history." });
  }
});

// Convert Azure's readable stream into a plain string
async function streamToString(readableStream) {
  return new Promise((resolve, reject) => {
    const chunks = [];

    readableStream.on("data", (data) => {
      chunks.push(data.toString());
    });

    readableStream.on("end", () => {
      resolve(chunks.join(""));
    });

    readableStream.on("error", reject);
  });
}

// Start the Express server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

