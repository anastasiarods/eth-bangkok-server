import { ethers } from "hardhat";
import * as dotenv from "dotenv";
import { generateChecksum } from "../index";

dotenv.config();

async function main() {
  try {
    const contractAddress = "0x27Eb1CcE195749980c93a066Cc99DC5DE58D9582";
    console.log("Testing Verifier contract at:", contractAddress);

    // Create a wallet using private key from .env
    if (!process.env.PRIVATE_KEY) {
      throw new Error("PRIVATE_KEY not found in .env file");
    }
    
    const provider = new ethers.JsonRpcProvider(process.env.POLYGON_MUMBAI_RPC);
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
    console.log("Using wallet address:", wallet.address);

    // Get the contract instance
    const Verifier = await ethers.getContractFactory("Verifier", wallet);
    const verifier = Verifier.attach(contractAddress);

    // Generate a test checksum using our function from index.ts
    const testText = "Hello ETH Thailand!";
    const testChecksum = generateChecksum(testText);
    
    // Record a new checksum
    console.log("\nRecording new checksum...");
    console.log("Test text:", testText);
    console.log("Generated checksum:", testChecksum);
    
    // Convert hex string to bytes32
    const checksumBytes = `0x${testChecksum}`;
    
    const tx = await verifier.recordChecksum(checksumBytes);
    await tx.wait();
    console.log("Checksum recorded successfully!");

    // Verify the recorded checksum
    console.log("\nVerifying checksum...");
    const [exists, owner] = await verifier.verifyChecksum(checksumBytes);
    console.log("Checksum exists:", exists);
    console.log("Checksum owner:", owner);

    // Get all checksums for the wallet address
    const userChecksums = await verifier.getChecksumsByOwner(wallet.address);
    console.log("\nAll checksums for current user:", userChecksums);

    // Get checksum count
    const count = await verifier.getChecksumsCount(wallet.address);
    console.log("Total checksums for current user:", count.toString());

  } catch (error) {
    console.error("Error testing contract:", error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 