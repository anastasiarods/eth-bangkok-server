import {
  SignProtocolClient,
  SpMode,
  EvmChains,
  delegateSignAttestation,
  delegateSignRevokeAttestation,
  delegateSignSchema,
  AttestationResult,
} from "@ethsign/sp-sdk";
import { Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";

const privateKey = process.env.PRIVATE_KEY! as Hex

const client = new SignProtocolClient(SpMode.OnChain, {
  chain: EvmChains.polygonAmoy,
  account: privateKeyToAccount(privateKey),
});

let schemaId: string

async function createSchema() {
  const resp = await client.createSchema({
    name: "safu-box",
    data: [{ name: "checksum", type: "string" }],
  });

  console.log("Schema created", resp);

  schemaId = resp.schemaId
}

export async function attestOnSign(checksum: string): Promise<AttestationResult> {
  if (schemaId == null) {
    await createSchema()
  }
  // Create attestation
  const createAttestationRes = await client.createAttestation({
    schemaId: schemaId,
    data: { checksum: checksum },
    indexingValue: checksum,
  });

  console.log("Attestation created", createAttestationRes);

  return createAttestationRes;
}