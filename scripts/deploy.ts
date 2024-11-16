import { ethers } from "hardhat";

async function main() {
  try {
    // Deploy the contract
    console.log("Deploying Verifier contract...");
    const Verifier = await ethers.getContractFactory("Verifier");
    const verifier = await Verifier.deploy();
    await verifier.waitForDeployment();

    const address = await verifier.getAddress();
    console.log("Verifier deployed to:", address);

    // Wait for a few block confirmations
    console.log("Waiting for block confirmations...");
    await verifier.deploymentTransaction()?.wait(6);

    console.log("Deployment completed successfully");
  } catch (error) {
    console.error("Error during deployment:", error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 