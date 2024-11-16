import * as crypto from 'crypto';
import { ethers } from "hardhat";
import { Database } from 'bun:sqlite';

// Types based on the Omi documentation
interface TranscriptSegment {
  text: string;
  speaker: string;
  speakerId: number;
  is_user: boolean;
  start: number;
  end: number;
}

interface ActionItem {
  description: string;
  completed: boolean;
}

interface StructuredData {
  title: string;
  overview: string;
  emoji: string;
  category: string;
  action_items: ActionItem[];
  events: any[];
}

interface Memory {
  id: number;
  created_at: string;
  started_at: string;
  finished_at: string;
  transcript: string;
  transcript_segments: TranscriptSegment[];
  photos: any[];
  structured: StructuredData;
  apps_response: {
    app_id: string;
    content: string;
  }[];
  discarded: boolean;
}

// Initialize SQLite database
const db = new Database(':memory:');

// Create tables
db.run(`
  CREATE TABLE IF NOT EXISTS memories (
    id INTEGER PRIMARY KEY,
    uid TEXT NOT NULL,
    memory_id INTEGER NOT NULL,
    title TEXT,
    transcript TEXT NOT NULL,
    checksum TEXT NOT NULL,
    tx_hash TEXT,
    created_at TEXT NOT NULL,
    stored_at TEXT NOT NULL
  )
`);

// Function to store memory in SQLite
async function storeMemoryInDb(
  uid: string, 
  memory: Memory, 
  checksum: string, 
  txHash: string
) {
  const query = db.prepare(`
    INSERT INTO memories (
      uid, 
      memory_id, 
      title, 
      transcript, 
      checksum, 
      tx_hash, 
      created_at, 
      stored_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  query.run(
    uid,
    memory.id,
    memory.structured.title,
    memory.transcript,
    checksum,
    txHash,
    memory.created_at,
    new Date().toISOString()
  );
}

// Function to get memory by ID
function getMemoryByIdFromDb(uid: string, memoryId: number) {
  const query = db.prepare(`
    SELECT * FROM memories 
    WHERE uid = ? AND memory_id = ?
  `);
  
  return query.get(uid, memoryId);
}

// Function to get all memories for a user
function getUserMemoriesFromDb(uid: string) {
  const query = db.prepare(`
    SELECT * FROM memories 
    WHERE uid = ? 
    ORDER BY stored_at DESC
  `);
  
  return query.all(uid);
}

// Add this function to get all memories from the database
function getAllMemoriesFromDb() {
  const query = db.prepare(`
    SELECT * FROM memories 
    ORDER BY stored_at DESC
  `);
  
  return query.all();
}

export function generateChecksum(input: string): string {
  const hash = crypto.createHash('sha256')
    .update(input)
    .digest('hex');
  return hash;
}

async function storeChecksumOnChain(checksum: string): Promise<{ success: boolean; txHash?: string }> {
  try {
    if (!process.env.PRIVATE_KEY) {
      throw new Error("PRIVATE_KEY not found in .env file");
    }

    const provider = new ethers.JsonRpcProvider(process.env.POLYGON_MUMBAI_RPC);
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
    
    const contractAddress = "0x27Eb1CcE195749980c93a066Cc99DC5DE58D9582";
    const Verifier = await ethers.getContractFactory("Verifier", wallet);
    const verifier = Verifier.attach(contractAddress);

    const checksumBytes = `0x${checksum}`;
    const tx = await verifier.recordChecksum(checksumBytes);
    const receipt = await tx.wait();
    
    return {
      success: true,
      txHash: receipt.hash
    };
  } catch (error) {
    console.error("Error storing checksum on chain:", error);
    return {
      success: false
    };
  }
}

const server = Bun.serve({
  port: 3000,
  async fetch(req) {
    const url = new URL(req.url);

    // Memory Creation Webhook
    if (req.method === "POST" && url.pathname === "/memory-webhook") {
      try {
        const uid = url.searchParams.get("uid");
        if (!uid) {
          return new Response(JSON.stringify({
            success: false,
            error: "Missing uid parameter"
          }), { 
            status: 400,
            headers: { "Content-Type": "application/json" }
          });
        }

        const memory: Memory = await req.json();
        
        console.log("Processing memory:", {
          uid,
          memoryId: memory.id,
          title: memory.structured.title,
          createdAt: memory.created_at
        });

        // Generate and store checksum
        const checksum = generateChecksum(memory.transcript);
        const { success, txHash } = await storeChecksumOnChain(checksum);

        if (!success || !txHash) {
          throw new Error("Failed to store checksum on blockchain");
        }

        // Store in SQLite
        await storeMemoryInDb(uid, memory, checksum, txHash);

        return new Response(JSON.stringify({
          success: true,
          data: {
            uid,
            memoryId: memory.id,
            checksum,
            txHash,
            polygonscanUrl: `https://www.oklink.com/amoy/tx/${txHash}`,
            timestamp: new Date().toISOString()
          }
        }), {
          headers: { "Content-Type": "application/json" }
        });

      } catch (error) {
        console.error("Memory webhook error:", error);
        return new Response(JSON.stringify({
          success: false,
          error: "Failed to process memory",
          details: error instanceof Error ? error.message : "Unknown error"
        }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }
    }

    // Get memory by ID
    if (req.method === "GET" && url.pathname === "/memory") {
      const uid = url.searchParams.get("uid");
      const memoryId = url.searchParams.get("memoryId");

      if (!uid || !memoryId) {
        return new Response(JSON.stringify({
          success: false,
          error: "Missing uid or memoryId parameter"
        }), { 
          status: 400,
          headers: { "Content-Type": "application/json" }
        });
      }

      const memory = getMemoryByIdFromDb(uid, parseInt(memoryId));
      
      return new Response(JSON.stringify({
        success: true,
        data: memory
      }), {
        headers: { "Content-Type": "application/json" }
      });
    }

    // Get all memories for a user
    if (req.method === "GET" && url.pathname === "/memories") {
      const uid = url.searchParams.get("uid");

      if (!uid) {
        return new Response(JSON.stringify({
          success: false,
          error: "Missing uid parameter"
        }), { 
          status: 400,
          headers: { "Content-Type": "application/json" }
        });
      }

      const memories = getUserMemoriesFromDb(uid);
      
      return new Response(JSON.stringify({
        success: true,
        data: memories
      }), {
        headers: { "Content-Type": "application/json" }
      });
    }

    // New endpoint: Get all memories
    if (req.method === "GET" && url.pathname === "/all-memories") {
      try {
        const memories = getAllMemoriesFromDb();
        
        return new Response(JSON.stringify({
          success: true,
          data: {
            memories,
            count: memories.length,
            timestamp: new Date().toISOString()
          }
        }), {
          headers: { 
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*" // Allow CORS
          }
        });
      } catch (error) {
        console.error("Error fetching all memories:", error);
        return new Response(JSON.stringify({
          success: false,
          error: "Failed to fetch memories",
          details: error instanceof Error ? error.message : "Unknown error"
        }), {
          status: 500,
          headers: { 
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*"
          }
        });
      }
    }

    // Health check endpoint
    if (req.method === "GET" && url.pathname === "/health") {
      return new Response(JSON.stringify({
        status: "healthy",
        version: "1.0.0",
        timestamp: new Date().toISOString()
      }), {
        headers: { "Content-Type": "application/json" }
      });
    }

    return new Response(JSON.stringify({
      error: "Not Found"
    }), { 
      status: 404,
      headers: { "Content-Type": "application/json" }
    });
  },
});

console.log(`Omi Memory Creation Trigger server listening on http://localhost:${server.port}`);
