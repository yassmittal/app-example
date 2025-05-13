import { Fr } from '@aztec/foundation/fields'
import { bufferAsFields } from '@aztec/stdlib/abi'
import { AztecAddress } from '@aztec/stdlib/aztec-address'
import {
  DEPLOYER_CONTRACT_ADDRESS,
  MAX_PACKED_PUBLIC_BYTECODE_SIZE_IN_FIELDS,
  REGISTERER_CONTRACT_ADDRESS,
  REGISTERER_CONTRACT_BYTECODE_CAPSULE_SLOT,
} from '@aztec/constants'
import {
  getContractInstanceFromDeployParams,
  getContractClassFromArtifact,
} from '@aztec/stdlib/contract'
import { PublicKeys } from '@aztec/stdlib/keys'
import { NFTContractArtifact, NFTContract } from './artifacts/NFT'

type ContractCtorArgs = Parameters<NFTContract['methods']['constructor']>

// const constructorArgs: any[] = ...;
// const account: CaipAccount = ...;
// const chain: CaipChain = ...;

const constructorArgs = ['accopunt', 'Test Col', 'TEST', 'account', true, 1, 100, 0]
// these are protocol constants:
const classRegisterer = AztecAddress.fromNumber(REGISTERER_CONTRACT_ADDRESS)
const instanceDeployer = AztecAddress.fromNumber(DEPLOYER_CONTRACT_ADDRESS)
const capsuleStorageSlot = new Fr(REGISTERER_CONTRACT_BYTECODE_CAPSULE_SLOT)

// compute contract class from the artifact
// const { artifactHash, privateFunctionsRoot, publicBytecodeCommitment, packedBytecode } =
await getContractClassFromArtifact(NFTContractArtifact)

// const encodedBytecode = bufferAsFields(packedBytecode, MAX_PACKED_PUBLIC_BYTECODE_SIZE_IN_FIELDS)
const getChain = (account: string) => account?.substring(0, account.lastIndexOf(':'))

export const getDeployContractBatchCalls = async ({
  account,
  address,
  sessionId,
}: {
  account: any
  address: string
  sessionId: string
}) => {
  const chain = getChain(account)
  const artifact = NFTContractArtifact
  const constructorArgs: ContractCtorArgs = [
    AztecAddress.fromString(address),
    'TEST COL',
    'TEST',
    AztecAddress.fromString(address),
    true,
    1,
    100,
    0,
  ]
  const instance = await getContractInstanceFromDeployParams(artifact, {
    constructorArgs,
    publicKeys: PublicKeys.default(),
    salt: Fr.zero(),
  })
  const { salt, currentContractClassId, initializationHash, publicKeys } = instance
  const operations = [
    {
      // here we register the contract in PXE, so PXE can interact with it
      kind: 'register_contract',
      chain,
      address: instance.address,
      instance,
      artifact,
    },
    {
      kind: 'send_transaction',
      account,
      actions: [
        {
          // here we publicly deploy the contract instance
          kind: 'call',
          contract: instanceDeployer,
          method: 'deploy',
          args: [salt, currentContractClassId, initializationHash, publicKeys, true],
        },
        {
          // here we initialize the contract
          kind: 'call',
          contract: instance.address,
          method: 'constructor',
          args: constructorArgs,
        },
      ],
    },
  ]

  return { sessionId, operations }
}
// and here is the batch of operations to execute
