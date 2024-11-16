const NILLION_APP_ID = process.env.NILLION_APP_ID || "";
const NILLION_USER_SEED = process.env.NILLION_USER_SEED || "";
const NILLION_SECRET_NAME = process.env.NILLION_SECRET_NAME || "";
const NILLION_API_BASE =
  process.env.NILLION_API_BASE ||
  "https://nillion-storage-apis-v0.onrender.com";

const test_store_id = "f02cc8bc-d9c5-46f4-9840-244bed1e05de";

/**
 * Stores a JSON object securely using Nillion's Storage APIs
 * @param data Any JSON serializable object
 * @param permissions Optional permissions configuration
 */
export async function storeJSON(
  data: any,
  permissions = {
    retrieve: [],
    update: [],
    delete: [],
    compute: {},
  }
) {
  try {
    const jsonString = JSON.stringify(data);

    const response = await fetch(
      `${NILLION_API_BASE}/api/apps/${NILLION_APP_ID}/secrets`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          secret: {
            nillion_seed: NILLION_USER_SEED,
            secret_value: jsonString,
            secret_name: NILLION_SECRET_NAME,
          },
          permissions: {
            retrieve: permissions.retrieve || [],
            update: permissions.update || [],
            delete: permissions.delete || [],
            compute: permissions.compute || {},
          },
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to store secret: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error storing JSON in Nillion:", error);
    throw error;
  }
}

/**
 * Retrieves and parses a JSON object from Nillion storage
 * @param storeId The store_id of the secret
 */
export async function retrieveJSON(storeId: string) {
  try {
    const response = await fetch(
      `${NILLION_API_BASE}/api/secret/retrieve/${storeId}?` +
        new URLSearchParams({
          retrieve_as_nillion_user_seed: NILLION_USER_SEED,
          secret_name: NILLION_SECRET_NAME,
        })
    );

    if (!response.ok) {
      throw new Error(`Failed to retrieve secret: ${response.statusText}`);
    }

    const result = (await response.json()) as {
      store_id: string;
      secret: string;
    };
    return JSON.parse(result.secret);
  } catch (error) {
    console.error("Error retrieving JSON from Nillion:", error);
    throw error;
  }
}

/**
 * Lists all store IDs associated with this app
 */
export async function listStoreIds() {
  try {
    const response = await fetch(
      `${NILLION_API_BASE}/api/apps/${NILLION_APP_ID}/store_ids`
    );

    if (!response.ok) {
      throw new Error(`Failed to list store IDs: ${response.statusText}`);
    }

    const result = await response.json();
    return result.store_ids;
  } catch (error) {
    console.error("Error listing store IDs:", error);
    throw error;
  }
}

// Test functions
export async function runTests() {
  console.log("Starting Nillion Storage API tests...");
  const secretName = "test_secret_1";

  try {
    // Test 1: Store JSON
    console.log("\n1. Testing storeJSON...");
    const testData = {
      id: 1,
      message: "Test message",
      timestamp: new Date().toISOString(),
    };

    const storeResult = await storeJSON(testData);
    console.log("✅ Store successful:", storeResult);

    // Test 2: List Store IDs
    console.log("\n2. Testing listStoreIds...");
    const storeIds = await listStoreIds();
    console.log("✅ Store IDs retrieved:", storeIds);

    // Test 3: Retrieve JSON
    if (storeResult.store_id) {
      console.log("\n3. Testing retrieveJSON...");
      const retrievedData = await retrieveJSON(storeResult.store_id);
      console.log("✅ Retrieved data:", retrievedData);

      // Verify data integrity
      console.log("\n4. Verifying data integrity...");
      const isMatch =
        JSON.stringify(testData) === JSON.stringify(retrievedData);
      console.log(
        isMatch ? "✅ Data integrity verified" : "❌ Data integrity mismatch"
      );
    }

    console.log("\nAll tests completed successfully!");
  } catch (error) {
    console.error("❌ Test failed:", error);
    throw error;
  }
}

async function testRetrieveJSON() {
  const testData = {
    id: 1,
    message: "Test message",
    timestamp: "2024-11-16T15:16:45.133Z",
  };
  const retrievedData = await retrieveJSON(test_store_id);
  console.log("✅ Retrieved data:", retrievedData);

  // Verify data integrity
  console.log("\n4. Verifying data integrity...");
  const isMatch = JSON.stringify(testData) === JSON.stringify(retrievedData);
  console.log(
    isMatch ? "✅ Data integrity verified" : "❌ Data integrity mismatch"
  );
}

export function testing() {
  testRetrieveJSON();
}
