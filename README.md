# 📚 Learnify: Student Study Helper

## Overview

Learnify is an AI-powered web application that helps students review course material more efficiently. Users can paste their study notes and generate concise summaries, key points, and review questions with answers. Study sessions can also be saved and viewed later.



## Features

- AI-generated summaries
-  Key point extraction
-  Review questions and answers
-  Save study sessions
-  View saved history
-  Cloud storage using Azure Blob Storage



## Technologies Used

### Frontend
- HTML
- CSS
- JavaScript

### Backend
- Node.js
- Express.js

### Azure Services
- Azure App Service
- Microsoft Foundry (Azure AI)
- Azure Blob Storage


## Setup Instructions

### 1. Clone the repository

```bash
git clone <repository-url>
cd student-study-helper
```

### 2. Install dependencies

```bash
npm install
```

### 3. Create a `.env` file

```env
PORT=3000

FOUNDRY_ENDPOINT=YOUR_ENDPOINT
FOUNDRY_API_KEY=YOUR_API_KEY
FOUNDRY_DEPLOYMENT=gpt-5.4-mini

AZURE_STORAGE_CONNECTION_STRING=YOUR_CONNECTION_STRING
AZURE_STORAGE_CONTAINER=notes
```

### 4. Start the server

```bash
npm start
```

### 5. Open the application

```
http://localhost:3000
```



## Environment Variables

| Variable | Description |
|----------|-------------|
| `PORT` | Server port |
| `FOUNDRY_ENDPOINT` | Microsoft Foundry endpoint |
| `FOUNDRY_API_KEY` | API key for Foundry |
| `FOUNDRY_DEPLOYMENT` | Model deployment name |
| `AZURE_STORAGE_CONNECTION_STRING` | Azure Blob Storage connection string |
| `AZURE_STORAGE_CONTAINER` | Blob container name |



## Azure Services Used

- **Azure App Service** – Hosts the web application
- **Microsoft Foundry** – Generates summaries and study questions
- **Azure Blob Storage** – Stores study sessions



## Known Limitations

- AI-generated content may not always be completely accurate.
- Only pasted text is currently supported.
- No user authentication is implemented.
- Large or complex notes may produce simplified summaries.


## Responsible AI Review

- ## Responsible AI
AI is a study aid, not a replacement for course material, instructors or student judgment.

- ## AI results may not always be perfect
Generated content can include mistakes or miss important context.

- ## Review summaries and quiz questions
Compare every result with your original notes and trusted course resources.

- ## Protect private information
Do not enter personal, private, confidential or sensitive information.

- ## Human review is important
Students remain responsible for deciding whether generated material is accurate and useful.


## Future Enhancements

- PDF and Word document uploads
- AI study coach
- Flashcard generation
- User accounts and authentication
- Progress tracking
- Adaptive quizzes


