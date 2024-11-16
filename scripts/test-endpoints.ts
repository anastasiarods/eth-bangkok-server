import { generateChecksum } from "../index";

// Sample test data generator
function generateTestMemory(id: number) {
  return {
    id,
    created_at: new Date().toISOString(),
    started_at: new Date(Date.now() - 1000 * 60).toISOString(), // 1 minute ago
    finished_at: new Date().toISOString(),
    transcript: `This is test transcript ${id} with some random content ${Math.random()}`,
    transcript_segments: [
      {
        text: "Hello there!",
        speaker: "User",
        speakerId: 1,
        is_user: true,
        start: 0,
        end: 2
      },
      {
        text: "How can I help you today?",
        speaker: "Assistant",
        speakerId: 2,
        is_user: false,
        start: 2,
        end: 4
      }
    ],
    photos: [],
    structured: {
      title: `Test Memory ${id}`,
      overview: `This is an overview of test memory ${id}`,
      emoji: "🧪",
      category: "test",
      action_items: [
        {
          description: `Action item ${id}.1`,
          completed: false
        },
        {
          description: `Action item ${id}.2`,
          completed: true
        }
      ],
      events: []
    },
    apps_response: [],
    discarded: false
  };
}

// Test all endpoints
async function testEndpoints() {
  const baseUrl = "http://localhost:3000";
  const testUid = "test_user_" + Date.now();
  
  console.log("Starting endpoint tests...\n");

  try {
    // 1. Test health endpoint
    console.log("Testing health endpoint...");
    const healthResponse = await fetch(`${baseUrl}/health`);
    console.log("Health response:", await healthResponse.json(), "\n");

    // 2. Test memory webhook with multiple memories
    console.log("Testing memory webhook...");
    for (let i = 1; i <= 1; i++) {
      const testMemory = generateTestMemory(i);
      const webhookResponse = await fetch(
        `${baseUrl}/memory-webhook?uid=${testUid}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(testMemory)
        }
      );
      const webhookResult = await webhookResponse.json();
      console.log(`Memory ${i} webhook response:`, webhookResult, "\n");
      
      // Wait a bit between requests
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // 3. Test get specific memory
    console.log("Testing get specific memory...");
    const memoryResponse = await fetch(
      `${baseUrl}/memory?uid=${testUid}&memoryId=1`
    );
    console.log("Get memory response:", await memoryResponse.json(), "\n");

    // 4. Test get user memories
    console.log("Testing get user memories...");
    const userMemoriesResponse = await fetch(
      `${baseUrl}/memories?uid=${testUid}`
    );
    console.log("User memories response:", await userMemoriesResponse.json(), "\n");

    // 5. Test get all memories
    console.log("Testing get all memories...");
    const allMemoriesResponse = await fetch(`${baseUrl}/all-memories`);
    console.log("All memories response:", await allMemoriesResponse.json(), "\n");

    console.log("All tests completed successfully!");

  } catch (error) {
    console.error("Error during tests:", error);
    process.exit(1);
  }
}

// Run tests
console.log("Starting endpoint tests...");
testEndpoints()
  .then(() => {
    console.log("Tests completed successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Test failed:", error);
    process.exit(1);
  }); 