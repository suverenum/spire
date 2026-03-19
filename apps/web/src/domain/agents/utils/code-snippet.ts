/**
 * Copy-paste ready code snippet for developers.
 * Displayed on the landing page and agent wallet detail page.
 */
export const AGENT_CODE_SNIPPET = `import { Credential } from 'mppx'
import { Mppx, tempo } from 'mppx/client'
import { createWalletClient, createPublicClient, http, parseAbi } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'

const GUARDIAN_ABI = parseAbi([
  'function pay(address token, address to, uint256 amount) external',
])

// Paste your agent key and guardian address from Agent Bank
const agentKey = '0x...'
const guardianAddress = '0x...'

const account = privateKeyToAccount(agentKey)
const walletClient = createWalletClient({
  account,
  transport: http('https://rpc.moderato.tempo.xyz'),
})
const publicClient = createPublicClient({
  transport: http('https://rpc.moderato.tempo.xyz'),
})

const mppx = Mppx.create({
  polyfill: false,
  methods: [tempo({ account })],
  async onChallenge(challenge) {
    const { amount, currency, recipient } = challenge.request
    const hash = await walletClient.writeContract({
      address: guardianAddress,
      abi: GUARDIAN_ABI,
      functionName: 'pay',
      args: [currency, recipient, BigInt(amount)],
    })
    await publicClient.waitForTransactionReceipt({ hash })
    return Credential.serialize({
      challenge,
      payload: { hash, type: 'hash' },
      source: \`did:pkh:eip155:42431:\${account.address}\`,
    })
  },
})

// Use it — any fetch through mppx is now guarded
const res = await mppx.fetch('https://api.stability.ai/generate', {
  method: 'POST',
  body: formData,
})`;
