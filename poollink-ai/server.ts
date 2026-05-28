import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { MongoClient } from "mongodb";

dotenv.config();

// MongoDB Lazy Connection
let mongoClient: MongoClient | null = null;
async function getMongoClient() {
  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI environment variable is not defined");
  }
  
  if (mongoClient) {
    try {
      // Ping the database to ensure connection is alive
      await mongoClient.db("admin").command({ ping: 1 });
      return mongoClient;
    } catch (err) {
      console.warn("MongoDB connection was closed or inactive. Re-connecting...", err);
      try {
        await mongoClient.close();
      } catch (closeErr) {
        // Ignore errors during closing a stale client
      }
      mongoClient = null;
    }
  }

  mongoClient = new MongoClient(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 5000,
  });
  try {
    await mongoClient.connect();
  } catch (error: any) {
    const errorStr = String(error?.stack || error?.message || error);
    if (errorStr.includes("alert number 80") || errorStr.includes("tlsv1 alert internal error")) {
      console.error("\n=======================================================");
      console.error("CRITICAL CONFIGURATION ERROR: MongoDB Atlas IP Access Blocked");
      console.error("Your connection was aborted by MongoDB Atlas with a TLS Alert 80.");
      console.error("This is the classic signature of an unwhitelisted client IP address.");
      console.error("Since your application is running in a dynamic Cloud Run / AI Studio container,");
      console.error("its outgoing IP address changes dynamically. To resolve this, you MUST:");
      console.error("1. Go to your MongoDB Atlas Dashboard.");
      console.error("2. Navigate to 'Network Access' (under Security in the left sidebar).");
      console.error("3. Click 'Add IP Address'.");
      console.error("4. Add '0.0.0.0/0' (Allow access from anywhere) and click 'Confirm'.");
      console.error("=======================================================\n");
      throw new Error(
        "MongoDB TLS Handshake Failed (Alert 80): This server's IP address is not whitelisted on MongoDB Atlas. " +
        "Because this app runs in a dynamic, containerized Google Cloud environment, you must go to your " +
        "MongoDB Atlas console -> 'Security' -> 'Network Access' and add '0.0.0.0/0' (Allow Access from Anywhere) " +
        "to permit incoming connections."
      );
    }
    throw error;
  }
  return mongoClient;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route for Reporting Pool Issues (Saves to MongoDB)
  app.post("/api/reports", async (req, res) => {
    try {
      const { poolId, issue, details, userId } = req.body;
      
      const client = await getMongoClient();
      const db = client.db("poollink");
      const reports = db.collection("reports");
      
      const newReport = {
        poolId,
        issue,
        details,
        userId: userId || "anonymous",
        timestamp: new Date(),
        status: "pending_verification"
      };
      
      const result = await reports.insertOne(newReport);
      
      // Step 2: Multi-step Agent Workflow - Analyze report with Gemini
      let analysis = "Awaiting verification.";
      if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim() !== "" && !process.env.GEMINI_API_KEY.includes("YOUR_API_KEY")) {
        try {
          const { GoogleGenAI } = await import("@google/genai");
          const ai = new GoogleGenAI({ 
            apiKey: process.env.GEMINI_API_KEY,
            httpOptions: {
              headers: {
                'User-Agent': 'aistudio-build',
              }
            }
          });
          
          const prompt = `Analyze this pool operational report: "${issue}". 
          Details: "${details}". 
          Pool ID: "${poolId}".
          Does this sound like a critical operational closure? Respond in JSON: { "critical": boolean, "summary": "string" }`;
          
          const aiRes = await ai.models.generateContent({
            model: "gemini-3.5-flash",
            contents: prompt,
            config: { responseMimeType: "application/json" }
          });
          
          analysis = aiRes.text || "No analysis provided.";
          
          // Update MongoDB with AI analysis
          await reports.updateOne(
            { _id: result.insertedId },
            { $set: { ai_analysis: analysis, status: "ai_reviewed" } }
          );
        } catch (aiErr: any) {
          const errString = String(aiErr?.message || aiErr);
          if (errString.includes("API key not valid") || errString.includes("INVALID_ARGUMENT") || errString.includes("API_KEY_INVALID")) {
            console.error("\n=======================================================");
            console.error("CRITICAL ENVRIONMENT ERROR: Invalid Gemini API Key");
            console.error("The Gemini API request failed because the provided API key is invalid.");
            console.error("Please add/update your GEMINI_API_KEY secret in the Google AI Studio settings:");
            console.error("1. Click the Settings gear icon (or Settings > Secrets).");
            console.error("2. Ensure GEMINI_API_KEY is defined with a valid active Gemini API Key.");
            console.error("=======================================================\n");
            analysis = "Failed to run automated AI security screening (Invalid GM API Key format).";
          } else {
            console.error("AI Analysis failed:", aiErr);
            analysis = `Automated AI screening error: ${errString}`;
          }
        }
      } else {
        console.warn("Skipping AI report screening: GEMINI_API_KEY is not defined or is placeholder.");
        analysis = "Awaiting verification. AI screening requires an active Gemini API Key.";
      }
      
      res.status(201).json({ 
        success: true, 
        reportId: result.insertedId,
        message: "Report synchronized with MongoDB cluster. PoolLink AI is investigating the operational status.",
        ai_preliminary: analysis
      });
    } catch (error) {
      console.error("Report Error:", error);
      res.status(500).json({ error: "Failed to log report to MongoDB" });
    }
  });

  // API Route for Pool Availability
  app.get("/api/pools/availability/:poolId", async (req, res) => {
    const { poolId } = req.params;
    
    const now = new Date();
    const month = now.getMonth(); // 0-indexed: 4 is May
    
    // Seasonal logic for outdoor pools
    const isOutdoorSeason = month >= 5 && month <= 8; // Mid-June (5) to early Sept (8)
    const outdoorPools = ["bowview", "millican-ogden", "stanley-park", "forest-lawn-outdoor", "south-calgary", "silver-springs", "highwood-pool"];

    // For all other cases, return unknown to trigger high-quality search grounding in the frontend.
    // The frontend will check the Firestore cache first before hitting Gemini.
    try {
      if (outdoorPools.includes(poolId) && !isOutdoorSeason) {
        return res.json({
          poolId,
          status: "closed",
          hours: "Closed for Season",
          source: "official",
          message: "Outdoor pools open mid-June",
          lastUpdated: new Date().toISOString()
        });
      }

      res.json({ 
        status: "unknown",
        message: "Requesting live grounding for operating windows."
      });
    } catch (error) {
      console.error("Pool API Error:", error);
      res.status(500).json({ error: "Failed to fetch from pool API" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
