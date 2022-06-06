import assert from "assert";
import { expect } from "chai";
import * as anchor from "@project-serum/anchor";
import { Voting } from "../target/types/voting";
const { SystemProgram } = anchor.web3;

describe("Tests", async () => {
  const provider = anchor.AnchorProvider.local();
  const LAMPORTS_PER_SOL = 1000000000;

  // Configure the client to use the local cluster.
  anchor.setProvider(provider);

  // Test account address generated here
  const chairperson = anchor.web3.Keypair.generate();
  const voter1 = anchor.web3.Keypair.generate();
  const voter2 = anchor.web3.Keypair.generate();
  const voter3 = anchor.web3.Keypair.generate();
  const voter4 = anchor.web3.Keypair.generate();
  const memberScammer = anchor.web3.Keypair.generate();

  // Get program IDL for rock-paper-scissor
  const program = anchor.workspace.Voting as anchor.Program<Voting>;

  // Global addresses for easy loading to subsequent tests
  let bump;
  let votingPDA;
  let proposal1PDA;
  let questionPDA;
  let proposal2PDA;
  let answerPDA2;
  let answerPDAFails;
  let voter1PDA;
  let voter2PDA;
  let voter3PDA;
  let votedPDA;
  let votedPDA2;
  let votedPDA3;

  // test answer
  let answerText = "Blueberry";
  let answerText2 = "Mango";

  before(async () => {
    // Top up all acounts that will need lamports for account creation
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(
        voter1.publicKey,
        2 * LAMPORTS_PER_SOL
      )
    );
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(
        voter2.publicKey,
        2 * LAMPORTS_PER_SOL
      )
    );
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(
        voter3.publicKey,
        2 * LAMPORTS_PER_SOL
      )
    );
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(
        voter4.publicKey,
        2 * LAMPORTS_PER_SOL
      )
    );
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(
        chairperson.publicKey,
        2 * LAMPORTS_PER_SOL
      )
    );
  });

  it("Creates a voting account", async () => {
    // Seed for the voting PDA
    let seedString: string = "voting";
    let seed: Buffer = Buffer.from(seedString);

    [votingPDA, bump] = await anchor.web3.PublicKey.findProgramAddress(
      [seed, chairperson.publicKey.toBytes()],
      program.programId
    );
    
    // Make deadline
    let deadline: number = new Date().getTime() + 10000;

    // Create a voting
    await program.methods
      .initialiseVoting(seedString, new anchor.BN(deadline))
      .accounts({
        voting: votingPDA,
        chairperson: chairperson.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([chairperson])
      .rpc();

    let votingState = await program.account.voting.fetch(votingPDA);

    // Assert voting proposal count set to zero
    expect(votingState.proposalCount).to.equal(0);

    // Assert authority matches voting chairperson
    expect(votingState.chairperson.toString()).to.equal(
      chairperson.publicKey.toString()
    );

    // Assert voting deadline is correct
    expect(parseInt(votingState.deadline.toString())).to.equal(deadline);

    // Assert no winner has been picked
    expect(votingState.winnerSelected).to.equal(false);

    // Assert winner index initialised to zero (not really necessary to intialsie it thought)
    expect(votingState.winnerIdx).to.equal(0);
  });


  it("Chairman can add proposal", async () => {
    let proposalText = "proposal1";

    // Get voting counter for PDA derivation
    let votingProposalCounter = (
      await program.account.voting.fetch(votingPDA)
    ).proposalCount;
    // console.log({votingProposalCounter})

    // Consutruct buffer containing latest index
    const proposalCounterBuffer = Buffer.alloc(4);
    proposalCounterBuffer.writeUIntBE(votingProposalCounter, 0, 4);

    // Derive proposal account
    [proposal1PDA, bump] = await anchor.web3.PublicKey.findProgramAddress(
      [
        Buffer.from(votingPDA.toBytes()), // Byte buffer from voting PDA
        proposalCounterBuffer, // Byte buffer of the proposal counter
      ],
      program.programId
    );

    await program.methods
      .addProposal(proposalText)
      .accounts({
        voting: votingPDA,
        chairperson: chairperson.publicKey,
        proposal: proposal1PDA,
        systemProgram: SystemProgram.programId,
      })
      .signers([chairperson])
      .rpc();

    // Retrieve proposal account state
    let proposalState = await program.account.proposal.fetch(proposal1PDA);

    // Assert proposal text is correct
    expect(proposalState.proposal).to.equal(proposalText);

    // Assert no votes have been added
    expect(proposalState.voteCounter).to.equal(0);

    votingProposalCounter = (
      await program.account.voting.fetch(votingPDA)
    ).proposalCount;
    // console.log({votingProposalCounter})
  });

  it("Chairman can add another proposal", async () => {
    let proposalText = "proposal2";

    // Get voting counter for PDA derivation
    let votingProposalCounter = (
      await program.account.voting.fetch(votingPDA)
    ).proposalCount;
    // console.log({votingProposalCounter})

    // Consutruct buffer containing latest index
    const proposalCounterBuffer = Buffer.alloc(4);
    proposalCounterBuffer.writeUIntBE(votingProposalCounter, 0, 4);

    // Derive proposal account
    [proposal2PDA, bump] = await anchor.web3.PublicKey.findProgramAddress(
      [
        Buffer.from(votingPDA.toBytes()), // Byte buffer from voting PDA
        proposalCounterBuffer, // Byte buffer of the proposal counter
      ],
      program.programId
    );

    await program.methods
      .addProposal(proposalText)
      .accounts({
        voting: votingPDA,
        chairperson: chairperson.publicKey,
        proposal: proposal2PDA,
        systemProgram: SystemProgram.programId,
      })
      .signers([chairperson])
      .rpc();

    // Retrieve proposal account state
    let proposalState = await program.account.proposal.fetch(proposal2PDA);

    // Assert proposal text is correct
    expect(proposalState.proposal).to.equal(proposalText);

    // Assert no votes have been added
    expect(proposalState.voteCounter).to.equal(0);

    votingProposalCounter = (
      await program.account.voting.fetch(votingPDA)
    ).proposalCount;
    // console.log({votingProposalCounter})
  });

  it("Vote cast as voter1 for proposal1", async () => {
    // Derive the address of the voted account
    [votedPDA, bump] = await anchor.web3.PublicKey.findProgramAddress(
      [
        Buffer.from(voter1.publicKey.toBytes()),
        // Buffer.from(votingPDA.toBytes()), // allow vote to just one proposal
        Buffer.from(proposal1PDA.toBytes()), // allow votes to multiple proposals
      ],
      program.programId
    );

    // Get start answer tally
    let tallyStart: number = (await program.account.proposal.fetch(proposal1PDA))
      .voteCounter;

    await program.methods
      .vote()
      .accounts({
        voted: votedPDA,
        voting: votingPDA,
        proposal: proposal1PDA,
        voter: voter1.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([voter1])
      .rpc();

    // Get end answer tally
    let tallyEnd: number = (await program.account.proposal.fetch(proposal1PDA))
      .voteCounter;

    // initial voteCounter
    expect(tallyStart).to.be.equal(0);
    // Assert that tally has increased by the weight of the member
    expect(tallyEnd - tallyStart).to.be.equal(1);

    // Check that votedPDA exists by account having lamports
    await provider.connection.getBalance(votedPDA);
  });

  

  it("Vote cast as voter2 for proposal2", async () => {
    // Derive the address of the voted account
    [votedPDA2, bump] = await anchor.web3.PublicKey.findProgramAddress(
      [
        Buffer.from(voter2.publicKey.toBytes()),
        // Buffer.from(votingPDA.toBytes()), // allow vote to just one proposal
        Buffer.from(proposal2PDA.toBytes()), // allow votes to multiple proposals
      ],
      program.programId
    );

    // Get start answer tally
    let tallyStart: number = (await program.account.proposal.fetch(proposal2PDA))
      .voteCounter;

    await program.methods
      .vote()
      .accounts({
        voted: votedPDA2,
        voting: votingPDA,
        proposal: proposal2PDA,
        voter: voter2.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([voter2])
      .rpc();

    // Get end answer tally
    let tallyEnd: number = (await program.account.proposal.fetch(proposal2PDA))
      .voteCounter;

    // initial voteCounter
    expect(tallyStart).to.be.equal(0);
    // Assert that tally has increased by the weight of the member
    expect(tallyEnd - tallyStart).to.be.equal(1);

    // Check that votedPDA exists by account having lamports
    await provider.connection.getBalance(votedPDA2);
  });

  it("Vote cast as voter1 for proposal2", async () => {
    // Derive the address of the voted account
    [votedPDA, bump] = await anchor.web3.PublicKey.findProgramAddress(
      [
        Buffer.from(voter1.publicKey.toBytes()),
        // Buffer.from(votingPDA.toBytes()), // allow vote to just one proposal
        Buffer.from(proposal2PDA.toBytes()), // allow votes to multiple proposals
      ],
      program.programId
    );

    // Get start answer tally
    let tallyStart: number = (await program.account.proposal.fetch(proposal2PDA))
      .voteCounter;

    await program.methods
      .vote()
      .accounts({
        voted: votedPDA,
        voting: votingPDA,
        proposal: proposal2PDA,
        voter: voter1.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([voter1])
      .rpc();

    // Get end answer tally
    let tallyEnd: number = (await program.account.proposal.fetch(proposal2PDA))
      .voteCounter;

    // initial voteCounter
    expect(tallyStart).to.be.equal(1);
    // Assert that tally has increased by the weight of the member
    expect(tallyEnd - tallyStart).to.be.equal(1);

    // Check that votedPDA exists by account having lamports
    await provider.connection.getBalance(votedPDA);
  });

  it("Vote cast as voter2 for proposal1", async () => {
    // Derive the address of the voted account
    [votedPDA2, bump] = await anchor.web3.PublicKey.findProgramAddress(
      [
        Buffer.from(voter2.publicKey.toBytes()),
        // Buffer.from(votingPDA.toBytes()), // allow vote to just one proposal
        Buffer.from(proposal1PDA.toBytes()), // allow votes to multiple proposals
      ],
      program.programId
    );

    // Get start answer tally
    let tallyStart: number = (await program.account.proposal.fetch(proposal1PDA))
      .voteCounter;

    await program.methods
      .vote()
      .accounts({
        voted: votedPDA2,
        voting: votingPDA,
        proposal: proposal1PDA,
        voter: voter2.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([voter2])
      .rpc();

    // Get end answer tally
    let tallyEnd: number = (await program.account.proposal.fetch(proposal1PDA))
      .voteCounter;

    // initial voteCounter
    expect(tallyStart).to.be.equal(1);
    // Assert that tally has increased by the weight of the member
    expect(tallyEnd - tallyStart).to.be.equal(1);

    // Check that votedPDA exists by account having lamports
    await provider.connection.getBalance(votedPDA2);
  });


  it("Tally votes fails with insuficcient proposal accounts provided", async () => {
    try {
      await program.methods
        .tally()
        .accounts({
          voting: votingPDA,
          caller: chairperson.publicKey,
        })
        .remainingAccounts([
          { pubkey: proposal1PDA, isWritable: false, isSigner: false },
        ])
        .signers([chairperson])
        .rpc();

      assert(false);
    } catch (err) {
      assert(err);
    }
  });

  it("Tally votes", async () => {
    await program.methods
      .tally()
      .accounts({
        voting: votingPDA,
        caller: chairperson.publicKey,
      })
      .remainingAccounts([
        { pubkey: proposal1PDA, isWritable: false, isSigner: false },
        { pubkey: proposal2PDA, isWritable: false, isSigner: false },
      ])
      .signers([chairperson])
      .rpc();

    // Retrieve PDA state for the proposal
    let votingState = await program.account.proposal.fetch(votingPDA);

    // Assert proposal 1 won (index 0)
    expect(votingState.winnerIdx).to.equal(0);

    // Assert vote is over
    expect(votingState.winnerSelected).to.equal(true);

  });
});
