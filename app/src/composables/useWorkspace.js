import { computed } from 'vue'
import { useAnchorWallet } from 'solana-wallets-vue'
// import { Connection, clusterApiUrl, PublicKey } from '@solana/web3.js'
import { Connection, PublicKey } from '@solana/web3.js'
//  import { Provider } from '@project-serum/anchor'
import idl from '../../../target/idl/solana_twitter.json'
import * as anchor  from '@project-serum/anchor';

const preflightCommitment = 'processed'
const commitment = 'confirmed';


const programID = new PublicKey(idl.metadata.address)

const { Program, AnchorProvider } = anchor;

let workspace = null
export const useWorkspace = () => workspace

export const initWorkspace = () => {

  const wallet = useAnchorWallet()
  const connection = new Connection('https://api.devnet.solana.com');//('http://127.0.0.1:8899')
  const provider = computed(() => new AnchorProvider(connection, wallet.value, { preflightCommitment, commitment }))
  const program = computed(() => new Program(idl, programID, provider.value))

  workspace = {
    wallet,
    connection,
    provider,
    program,
  }
}