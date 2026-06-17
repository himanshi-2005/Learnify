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