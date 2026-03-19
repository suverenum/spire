/**
 * VERIFICATION RESULT:
 *
 * Server verification logic in src/tempo/server/Charge.ts (lines 100-179):
 *
 * For push-mode (hash credentials), the verify function:
 * 1. Fetches the transaction receipt via getTransactionReceipt(client, { hash })
 * 2. Parses Transfer and TransferWithMemo event logs from the receipt
 * 3. Checks ONLY three fields:
 *    - log.address === currency  (the token contract that emitted the event)
 *    - log.args.to === recipient (the payment recipient)
 *    - log.args.amount.toString() === amount (the payment amount)
 * 4. Does NOT check:
 *    - log.args.from  (who the tokens came from — could be EOA or contract)
 *    - tx.from / receipt.from  (who submitted the transaction)
 *    - credential.source  (the optional DID field — never read in Charge.ts)
 *
 * CONCLUSION: Guardian approach WORKS because:
 * - Guardian calls IERC20(token).transfer(to, amount)
 * - Token contract emits Transfer(from=Guardian, to=recipient, amount)
 * - Server verification matches on (token address, recipient, amount) — all correct
 * - The `from` field (Guardian contract address, not agent EOA) is ignored
 *
 * KEY INSIGHT: ERC-20 Transfer events are emitted by the TOKEN contract, not the
 * calling contract. So log.address is always the token address regardless of whether
 * the transfer was initiated by an EOA or a Guardian contract. This is why the
 * server sees no difference between a direct transfer and a Guardian-routed one.
 */

import { Credential, Receipt } from 'mppx'
import { Mppx as Mppx_client, tempo as tempo_client } from 'mppx/client'
import { Mppx as Mppx_server, tempo as tempo_server } from 'mppx/server'
import type { Hex } from 'ox'
import { createWalletClient, parseAbi } from 'viem'
import {
  deployContract,
  getTransactionReceipt,
  readContract,
  sendTransaction,
  waitForTransactionReceipt,
} from 'viem/actions'
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts'
import { Actions } from 'viem/tempo'
import { beforeAll, describe, expect, test } from 'vitest'
import * as Http from '~test/Http.js'
import { accounts, asset, chain, client, fundAccount, http } from '~test/tempo/viem.js'

// ---------------------------------------------------------------------------
// Guardian contract ABI + bytecode (compiled via forge in tempo-multisig/contracts/)
// ---------------------------------------------------------------------------

const GUARDIAN_ABI = parseAbi([
  'constructor(address _owner, address _agent, uint256 _maxPerTx, uint256 _dailyLimit)',
  'function addRecipient(address r) external',
  'function addToken(address t) external',
  'function removeRecipient(address r) external',
  'function removeToken(address t) external',
  'function updateLimits(uint256 _maxPerTx, uint256 _dailyLimit) external',
  'function withdraw(address token) external',
  'function pay(address token, address to, uint256 amount) external',
  'function owner() external view returns (address)',
  'function agent() external view returns (address)',
  'function maxPerTx() external view returns (uint256)',
  'function dailyLimit() external view returns (uint256)',
  'function spentToday() external view returns (uint256)',
  'event PaymentExecuted(address indexed token, address indexed to, uint256 amount)',
  'event LimitsUpdated(uint256 maxPerTx, uint256 dailyLimit)',
  'event RecipientRemoved(address indexed recipient)',
  'event TokenRemoved(address indexed token)',
  'event Withdrawn(address indexed token, uint256 amount)',
])

// Compiled bytecode from tempo-multisig/contracts/out/SimpleGuardian.sol/SimpleGuardian.json
const GUARDIAN_BYTECODE =
  '0x60c060405234801561000f575f80fd5b50604051610c16380380610c1683398101604081905261002e9161007f565b6001600160a01b03808516608052831660a0525f829055600181905561005762015180426100bf565b600355506100de92505050565b80516001600160a01b038116811461007a575f80fd5b919050565b5f805f8060808587031215610092575f80fd5b61009b85610064565b93506100a960208601610064565b6040860151606090960151949790965092505050565b5f826100d957634e487b7160e01b5f52601260045260245ffd5b500490565b60805160a051610adf6101375f395f8181610241015261065e01525f818161019e015281816102760152818161030f0152818161037a0152818161047401528181610540015281816105d001526109180152610adf5ff3fe608060405234801561000f575f80fd5b50600436106100f0575f3560e01c80638da5cb5b11610093578063e744092e11610063578063e744092e14610211578063f059cf2b14610233578063f5ff5c761461023c578063f968adbe14610263575f80fd5b80638da5cb5b14610199578063a2240e19146101d8578063b3d76188146101eb578063d48bfca7146101fe575f80fd5b80634df6d6cc116100ce5780634df6d6cc1461013857806351cff8d91461016a5780635fa7b5841461017d57806367eeba0c14610190575f80fd5b80631259a5c8146100f457806312a29198146101105780631c3101d314610125575b5f80fd5b6100fd60035481565b6040519081526020015b60405180910390f35b61012361011e366004610993565b61026b565b005b610123610133366004610993565b610304565b61015a610146366004610993565b60046020525f908152604090205460ff1681565b6040519015158152602001610107565b610123610178366004610993565b61036f565b61012361018b366004610993565b610535565b6100fd60015481565b6101c07f000000000000000000000000000000000000000000000000000000000000000081565b6040516001600160a01b039091168152602001610107565b6101236101e63660046109b3565b6105c5565b6101236101f93660046109d3565b610653565b61012361020c366004610993565b61090d565b61015a61021f366004610993565b60056020525f908152604090205460ff1681565b6100fd60025481565b6101c07f000000000000000000000000000000000000000000000000000000000000000081565b6100fd5f5481565b336001600160a01b037f000000000000000000000000000000000000000000000000000000000000000016146102bc5760405162461bcd60e51b81526004016102b390610a0c565b60405180910390fd5b6001600160a01b0381165f81815260046020526040808220805460ff19169055517f8176fc5412eb5076fee7f1a264915b808c24d495c2698c189030e5200e707d259190a250565b336001600160a01b037f0000000000000000000000000000000000000000000000000000000000000000161461034c5760405162461bcd60e51b81526004016102b390610a0c565b6001600160a01b03165f908152600460205260409020805460ff19166001179055565b336001600160a01b037f000000000000000000000000000000000000000000000000000000000000000016146103b75760405162461bcd60e51b81526004016102b390610a0c565b6040516370a0823160e01b81523060048201525f906001600160a01b038316906370a0823190602401602060405180830381865afa1580156103fb573d5f803e3d5ffd5b505050506040513d601f19601f8201168201806040525081019061041f9190610a2f565b90505f811161045d5760405162461bcd60e51b815260206004820152600a6024820152694e6f2062616c616e636560b01b60448201526064016102b3565b60405163a9059cbb60e01b81526001600160a01b037f0000000000000000000000000000000000000000000000000000000000000000811660048301526024820183905283169063a9059cbb906044016020604051808303815f875af11580156104c9573d5f803e3d5ffd5b505050506040513d601f19601f820116820180604052508101906104ed9190610a46565b50816001600160a01b03167f7084f5476618d8e60b11ef0d7d3f06914655adb8793e28ff7f018d4c76d505d58260405161052991815260200190565b60405180910390a25050565b336001600160a01b037f0000000000000000000000000000000000000000000000000000000000000000161461057d5760405162461bcd60e51b81526004016102b390610a0c565b6001600160a01b0381165f81815260056020526040808220805460ff19169055517f4c910b69fe65a61f7531b9c5042b2329ca7179c77290aa7e2eb3afa3c8511fd39190a250565b336001600160a01b037f0000000000000000000000000000000000000000000000000000000000000000161461060d5760405162461bcd60e51b81526004016102b390610a0c565b5f829055600181905560408051838152602081018390527f4d4981437d0211f9e6843eb024d9ada1fa3a99514d4343d4aece106dd11524bb910160405180910390a15050565b336001600160a01b037f000000000000000000000000000000000000000000000000000000000000000016146106b75760405162461bcd60e51b8152602060048201526009602482015268139bdd081859d95b9d60ba1b60448201526064016102b3565b6001600160a01b0383165f9081526005602052604090205460ff166107125760405162461bcd60e51b8152602060048201526011602482015270151bdad95b881b9bdd08185b1b1bddd959607a1b60448201526064016102b3565b6001600160a01b0382165f9081526004602052604090205460ff166107715760405162461bcd60e51b8152602060048201526015602482015274149958da5c1a595b9d081b9bdd08185b1b1bddd959605a1b60448201526064016102b3565b5f548111156107b95760405162461bcd60e51b8152602060048201526014602482015273115e18d959591cc81c195c8b5d1e081b1a5b5a5d60621b60448201526064016102b3565b5f6107c76201518042610a65565b90506003548111156107dd575f60025560038190555b600154826002546107ee9190610a84565b11156108335760405162461bcd60e51b815260206004820152601460248201527311185a5b1e481b1a5b5a5d08195e18d95959195960621b60448201526064016102b3565b8160025f8282546108449190610a84565b909155505060405163a9059cbb60e01b81526001600160a01b0384811660048301526024820184905285169063a9059cbb906044016020604051808303815f875af1158015610895573d5f803e3d5ffd5b505050506040513d601f19601f820116820180604052508101906108b99190610a46565b50826001600160a01b0316846001600160a01b03167f107f47a72001748abd3c158810f2111e5fdab22dbbfc1d9c5578889e8da5c408846040516108ff91815260200190565b60405180910390a350505050565b336001600160a01b037f000000000000000000000000000000000000000000000000000000000000000016146109555760405162461bcd60e51b81526004016102b390610a0c565b6001600160a01b03165f908152600560205260409020805460ff19166001179055565b80356001600160a01b038116811461098e575f80fd5b919050565b5f602082840312156109a3575f80fd5b6109ac82610978565b9392505050565b5f80604083850312156109c4575f80fd5b50508035926020909101359150565b5f805f606084860312156109e5575f80fd5b6109ee84610978565b92506109fc60208501610978565b9150604084013590509250925092565b6020808252600990820152682737ba1037bbb732b960b91b604082015260600190565b5f60208284031215610a3f575f80fd5b5051919050565b5f60208284031215610a56575f80fd5b815180151581146109ac575f80fd5b5f82610a7f57634e487b7160e01b5f52601260045260245ffd5b500490565b80820180821115610aa357634e487b7160e01b5f52601160045260245ffd5b9291505056fea264697066735822122030afc06295fb731cb2df5495b91b3093518f4c739d7de6348796c33aac3555cb64736f6c63430008180033' as `0x${string}`

// ---------------------------------------------------------------------------
// Test accounts
// ---------------------------------------------------------------------------

// accounts[0] = owner (deploys Guardian, configures it, funds it)
// accounts[5] = vendor (receives payments, not used by other tests)
// agentAccount = fresh keypair (the AI agent with spending guardrails)

const agentKey = generatePrivateKey()
const agentAccount = privateKeyToAccount(agentKey)

const vendorAccount = accounts[5]!

// ---------------------------------------------------------------------------
// Guardian config
// ---------------------------------------------------------------------------

const MAX_PER_TX = 2_000_000n // 2 USDC (6 decimals)
const DAILY_LIMIT = 10_000_000n // 10 USDC (6 decimals)

// ---------------------------------------------------------------------------
// Shared state
// ---------------------------------------------------------------------------

let guardianAddress: `0x${string}`

const agentWalletClient = createWalletClient({
  account: agentAccount,
  chain,
  transport: http(),
})

// ---------------------------------------------------------------------------
// MPP server (the "vendor" endpoint)
// ---------------------------------------------------------------------------

const realm = 'guardian-test-vendor.example.com'
const secretKey = 'guardian-test-secret'

const server = Mppx_server.create({
  methods: [
    tempo_server.charge({
      getClient: () => client,
      currency: asset,
      account: vendorAccount,
    }),
  ],
  realm,
  secretKey,
})

// ---------------------------------------------------------------------------
// Setup: deploy Guardian, configure, fund
// ---------------------------------------------------------------------------

describe('Guardian contract with onChallenge', () => {
  beforeAll(async () => {
    // 0. Fund accounts via faucet (required on testnet, no-op harm on localnet)
    console.log('Funding accounts via faucet...')
    await Actions.faucet.fundSync(client, { account: accounts[0], timeout: 60_000 })
    await Actions.faucet.fundSync(client, { account: agentAccount, timeout: 60_000 })
    console.log('Faucet funding complete')

    // 1. Deploy Guardian contract (owner = accounts[0])
    const ownerWalletClient = createWalletClient({
      account: accounts[0],
      chain,
      transport: http(),
    })

    const deployHash = await deployContract(ownerWalletClient, {
      abi: GUARDIAN_ABI,
      bytecode: GUARDIAN_BYTECODE,
      args: [accounts[0].address, agentAccount.address, MAX_PER_TX, DAILY_LIMIT],
    })
    const deployReceipt = await waitForTransactionReceipt(client, { hash: deployHash })
    guardianAddress = deployReceipt.contractAddress!
    console.log(`Guardian deployed at ${guardianAddress}`)

    // 2. Configure allowlists
    await ownerWalletClient.writeContract({
      address: guardianAddress,
      abi: GUARDIAN_ABI,
      functionName: 'addRecipient',
      args: [vendorAccount.address],
    })

    await ownerWalletClient.writeContract({
      address: guardianAddress,
      abi: GUARDIAN_ABI,
      functionName: 'addToken',
      args: [asset],
    })

    // 3. Fund Guardian contract with asset tokens (from accounts[0])
    await Actions.token.transferSync(client, {
      account: accounts[0],
      chain,
      token: asset as Hex.Hex,
      to: guardianAddress,
      amount: 50_000_000n, // 50 USDC
    })

    // 4. Fund agent with asset tokens for gas fees on Tempo
    await Actions.token.transferSync(client, {
      account: accounts[0],
      chain,
      token: asset as Hex.Hex,
      to: agentAccount.address,
      amount: 10_000_000n, // 10 USDC for gas
    })

    console.log('Guardian setup complete')
  }, 120_000)

  // -------------------------------------------------------------------------
  // Test 1: Happy path — Guardian payment accepted by MPP server
  // -------------------------------------------------------------------------

  test('payment through Guardian contract is accepted by MPP server in push mode', async () => {
    const httpServer = await Http.createServer(async (req, res) => {
      const result = await Mppx_server.toNodeListener(
        server.charge({
          amount: '1',
          decimals: 6,
          currency: asset,
          recipient: vendorAccount.address,
        }),
      )(req, res)
      if (result.status === 402) return
      res.end(JSON.stringify({ status: 'ok', message: 'Payment accepted!' }))
    })

    const mppx = Mppx_client.create({
      polyfill: false,
      methods: [
        tempo_client({
          account: agentAccount,
          getClient: () => client,
        }),
      ],

      // THIS IS THE KEY PART — onChallenge intercepts the 402
      // and routes payment through the Guardian contract
      async onChallenge(challenge) {
        const { amount, currency, recipient } = challenge.request

        // Call Guardian.pay() instead of direct USDC.transfer()
        const hash = await agentWalletClient.writeContract({
          address: guardianAddress,
          abi: GUARDIAN_ABI,
          functionName: 'pay',
          args: [currency as `0x${string}`, recipient as `0x${string}`, BigInt(amount)],
        })

        // Wait for on-chain confirmation
        await waitForTransactionReceipt(client, { hash })

        // Build push-mode credential (same format mppx uses internally)
        const credential = Credential.from({
          challenge,
          payload: { hash, type: 'hash' as const },
          source: `did:pkh:eip155:${chain.id}:${agentAccount.address}`,
        })
        return Credential.serialize(credential)
      },
    })

    // This should:
    // a) Hit the server → get 402
    // b) onChallenge fires → calls Guardian.pay()
    // c) Guardian checks rules → calls USDC.transfer()
    // d) Token emits Transfer(from=Guardian, to=vendor, amount)
    // e) mppx retries with push-mode credential (tx hash)
    // f) Server verifies Transfer event on-chain → 200 OK
    const response = await mppx.fetch(httpServer.url)

    expect(response.status).toBe(200)

    const body = (await response.json()) as { status: string; message: string }
    expect(body.status).toBe('ok')

    const receipt = Receipt.fromResponse(response)
    expect(receipt.status).toBe('success')
    expect(receipt.method).toBe('tempo')

    httpServer.close()
  })

  // -------------------------------------------------------------------------
  // Test 2: Guardian rejects — recipient not in allowlist
  // -------------------------------------------------------------------------

  test('Guardian rejects payment when recipient not in allowlist', async () => {
    const disallowedRecipient = accounts[8]! // NOT in the allowlist

    const httpServer = await Http.createServer(async (req, res) => {
      const result = await Mppx_server.toNodeListener(
        server.charge({
          amount: '1',
          decimals: 6,
          currency: asset,
          recipient: disallowedRecipient.address,
        }),
      )(req, res)
      if (result.status === 402) return
      res.end('OK')
    })

    const mppx = Mppx_client.create({
      polyfill: false,
      methods: [
        tempo_client({
          account: agentAccount,
          getClient: () => client,
        }),
      ],
      async onChallenge(challenge) {
        const { amount, currency, recipient } = challenge.request

        // This should REVERT because recipient is not in allowlist
        const hash = await agentWalletClient.writeContract({
          address: guardianAddress,
          abi: GUARDIAN_ABI,
          functionName: 'pay',
          args: [currency as `0x${string}`, recipient as `0x${string}`, BigInt(amount)],
        })

        await waitForTransactionReceipt(client, { hash })

        const credential = Credential.from({
          challenge,
          payload: { hash, type: 'hash' as const },
        })
        return Credential.serialize(credential)
      },
    })

    // The onChallenge should throw because the contract reverts
    await expect(mppx.fetch(httpServer.url)).rejects.toThrow()

    httpServer.close()
  })

  // -------------------------------------------------------------------------
  // Test 3: Guardian rejects — per-tx limit exceeded
  // -------------------------------------------------------------------------

  test('Guardian rejects payment exceeding per-tx limit', async () => {
    const httpServer = await Http.createServer(async (req, res) => {
      const result = await Mppx_server.toNodeListener(
        server.charge({
          // 5 USDC > MAX_PER_TX (2 USDC)
          amount: '5000000',
          currency: asset,
          recipient: vendorAccount.address,
        }),
      )(req, res)
      if (result.status === 402) return
      res.end('OK')
    })

    const mppx = Mppx_client.create({
      polyfill: false,
      methods: [
        tempo_client({
          account: agentAccount,
          getClient: () => client,
        }),
      ],
      async onChallenge(challenge) {
        const { amount, currency, recipient } = challenge.request

        // This should REVERT because 5 USDC > maxPerTx of 2 USDC
        const hash = await agentWalletClient.writeContract({
          address: guardianAddress,
          abi: GUARDIAN_ABI,
          functionName: 'pay',
          args: [currency as `0x${string}`, recipient as `0x${string}`, BigInt(amount)],
        })

        await waitForTransactionReceipt(client, { hash })

        const credential = Credential.from({
          challenge,
          payload: { hash, type: 'hash' as const },
        })
        return Credential.serialize(credential)
      },
    })

    // The onChallenge should throw because the contract reverts
    await expect(mppx.fetch(httpServer.url)).rejects.toThrow()

    httpServer.close()
  })

  // -------------------------------------------------------------------------
  // Test 4: Owner updates limits on-chain
  // -------------------------------------------------------------------------

  test('owner can update limits and agent pays with new limits', async () => {
    const ownerWalletClient = createWalletClient({
      account: accounts[0],
      chain,
      transport: http(),
    })

    // Read current maxPerTx
    const currentMax = await readContract(client, {
      address: guardianAddress,
      abi: GUARDIAN_ABI,
      functionName: 'maxPerTx',
    })
    expect(currentMax).toBe(MAX_PER_TX)

    // Update limits: increase maxPerTx to 5 USDC
    const updateHash = await ownerWalletClient.writeContract({
      address: guardianAddress,
      abi: GUARDIAN_ABI,
      functionName: 'updateLimits',
      args: [5_000_000n, DAILY_LIMIT],
    })
    await waitForTransactionReceipt(client, { hash: updateHash })

    // Verify new limit on-chain
    const newMax = await readContract(client, {
      address: guardianAddress,
      abi: GUARDIAN_ABI,
      functionName: 'maxPerTx',
    })
    expect(newMax).toBe(5_000_000n)

    // Restore original limits
    const restoreHash = await ownerWalletClient.writeContract({
      address: guardianAddress,
      abi: GUARDIAN_ABI,
      functionName: 'updateLimits',
      args: [MAX_PER_TX, DAILY_LIMIT],
    })
    await waitForTransactionReceipt(client, { hash: restoreHash })
  })

  // -------------------------------------------------------------------------
  // Test 5: Owner adds/removes vendor
  // -------------------------------------------------------------------------

  test('owner can add a new vendor and agent can pay them', { timeout: 30_000 }, async () => {
    const newVendor = accounts[9]!
    const ownerWalletClient = createWalletClient({
      account: accounts[0],
      chain,
      transport: http(),
    })

    // Add new vendor
    const addHash = await ownerWalletClient.writeContract({
      address: guardianAddress,
      abi: GUARDIAN_ABI,
      functionName: 'addRecipient',
      args: [newVendor.address],
    })
    await waitForTransactionReceipt(client, { hash: addHash })

    // Agent can now pay the new vendor
    const httpServer = await Http.createServer(async (req, res) => {
      const result = await Mppx_server.toNodeListener(
        Mppx_server.create({
          methods: [
            tempo_server.charge({
              getClient: () => client,
              currency: asset,
              account: newVendor,
            }),
          ],
          realm,
          secretKey,
        }).charge({
          amount: '1',
          decimals: 6,
          currency: asset,
          recipient: newVendor.address,
        }),
      )(req, res)
      if (result.status === 402) return
      res.end('OK')
    })

    const mppx = Mppx_client.create({
      polyfill: false,
      methods: [tempo_client({ account: agentAccount, getClient: () => client })],
      async onChallenge(challenge) {
        const { amount, currency, recipient } = challenge.request
        const hash = await agentWalletClient.writeContract({
          address: guardianAddress,
          abi: GUARDIAN_ABI,
          functionName: 'pay',
          args: [currency as `0x${string}`, recipient as `0x${string}`, BigInt(amount)],
        })
        await waitForTransactionReceipt(client, { hash })
        const credential = Credential.from({
          challenge,
          payload: { hash, type: 'hash' as const },
        })
        return Credential.serialize(credential)
      },
    })

    const response = await mppx.fetch(httpServer.url)
    expect(response.status).toBe(200)

    // Now remove the vendor
    const removeHash = await ownerWalletClient.writeContract({
      address: guardianAddress,
      abi: GUARDIAN_ABI,
      functionName: 'removeRecipient',
      args: [newVendor.address],
    })
    await waitForTransactionReceipt(client, { hash: removeHash })

    httpServer.close()
  })

  // -------------------------------------------------------------------------
  // Test 6: Owner emergency withdraws
  // -------------------------------------------------------------------------

  test('owner can emergency withdraw all funds', { timeout: 30_000 }, async () => {
    const ownerWalletClient = createWalletClient({
      account: accounts[0],
      chain,
      transport: http(),
    })

    // Top up guardian with more funds first
    await Actions.token.transferSync(client, {
      account: accounts[0],
      chain,
      token: asset as Hex.Hex,
      to: guardianAddress,
      amount: 10_000_000n,
    })

    // Emergency withdraw
    const withdrawHash = await ownerWalletClient.writeContract({
      address: guardianAddress,
      abi: GUARDIAN_ABI,
      functionName: 'withdraw',
      args: [asset],
    })
    const receipt = await waitForTransactionReceipt(client, { hash: withdrawHash })
    expect(receipt.status).toBe('success')

    // Re-fund for future tests
    await Actions.token.transferSync(client, {
      account: accounts[0],
      chain,
      token: asset as Hex.Hex,
      to: guardianAddress,
      amount: 50_000_000n,
    })
  })
})
