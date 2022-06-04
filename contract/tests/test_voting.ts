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
  const member1 = anchor.web3.Keypair.generate();
  const member2 = anchor.web3.Keypair.generate();
  const member3 = anchor.web3.Keypair.generate();
  const member4 = anchor.web3.Keypair.generate();
  const memberScammer = anchor.web3.Keypair.generate();

  // Get program IDL for rock-paper-scissor
  const program = anchor.workspace.Voting as anchor.Program<Voting>;

  // Global addresses for easy loading to subsequent tests
  let bump;
  let votingPDA;
  let proposalPDA;
  let questionPDA;
  let answerPDA;
  let answerPDA2;
  let answerPDAFails;
  let voterPDA;
  let memberPDA2;
  let memberPDA3;
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
        member1.publicKey,
        2 * LAMPORTS_PER_SOL
      )
    );
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(
        member2.publicKey,
        2 * LAMPORTS_PER_SOL
      )
    );
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(
        member3.publicKey,
        2 * LAMPORTS_PER_SOL
      )
    );
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(
        member4.publicKey,
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
    let proposalText = "What's the best fruit?";

    // Get voting counter for PDA derivation
    let votingProposalCounter = (
      await program.account.voting.fetch(votingPDA)
    ).proposalCount;

    // Consutruct buffer containing latest index
    const proposalCounterBuffer = Buffer.alloc(4);
    proposalCounterBuffer.writeUIntBE(votingProposalCounter, 0, 4);

    // Derive proposal account
    [proposalPDA, bump] = await anchor.web3.PublicKey.findProgramAddress(
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
        proposal: proposalPDA,
        systemProgram: SystemProgram.programId,
      })
      .signers([chairperson])
      .rpc();

    // Retrieve proposal account state
    let proposalState = await program.account.proposal.fetch(proposalPDA);

    // Assert proposal text is correct
    expect(proposalState.proposal).to.equal(proposalText);

    // Assert no votes have been added
    expect(proposalState.voteCounter).to.equal(0);
  });

  // it("Member with correct privileges can submit an answer", async () => {
  //   // Consutruct buffer containing latest answer index
  //   const answerCounterBuffer = Buffer.alloc(1);
  //   answerCounterBuffer.writeUIntBE(
  //     (await program.account.proposal.fetch(questionPDA)).ansCounter,
  //     0,
  //     1
  //   );

  //   // Derive the address of the answer account
  //   [answerPDA, bump] = await anchor.web3.PublicKey.findProgramAddress(
  //     [Buffer.from(questionPDA.toBytes()), answerCounterBuffer],
  //     program.programId
  //   );

  //   await program.methods
  //     .addAnswer(answerText)
  //     .accounts({
  //       proposal: questionPDA,
  //       member: member1.publicKey,
  //       memberStruct: voterPDA,
  //       answer: answerPDA,
  //       systemProgram: SystemProgram.programId,
  //     })
  //     .signers([member1])
  //     .rpc();

  //   // Assert proposal answer count has incremented
  //   expect(
  //     (await program.account.proposal.fetch(questionPDA)).ansCounter
  //   ).to.equal(1);

  //   // Retrieve state of the answer account
  //   let answerState = await program.account.answer.fetch(answerPDA);

  //   // Assert answer set correctly
  //   expect(answerState.text).to.equal(answerText);

  //   // Assert answer votes is initialised to zero
  //   expect(answerState.votes).to.equal(0);

  //   // Consutruct buffer containing latest answer index
  //   const answerCounterBuffer2 = Buffer.alloc(1);
  //   answerCounterBuffer2.writeUIntBE(
  //     (await program.account.proposal.fetch(questionPDA)).ansCounter,
  //     0,
  //     1
  //   );

  //   // Derive the address of the answer account
  //   [answerPDA2, bump] = await anchor.web3.PublicKey.findProgramAddress(
  //     [Buffer.from(questionPDA.toBytes()), answerCounterBuffer2],
  //     program.programId
  //   );

  //   await program.methods
  //     .addAnswer(answerText2)
  //     .accounts({
  //       proposal: questionPDA,
  //       member: member2.publicKey,
  //       memberStruct: memberPDA2,
  //       answer: answerPDA2,
  //       systemProgram: SystemProgram.programId,
  //     })
  //     .signers([member2])
  //     .rpc();

  //   // Assert proposal answer count has incremented to 2
  //   expect(
  //     (await program.account.proposal.fetch(questionPDA)).ansCounter
  //   ).to.equal(2);

  //   // Retrieve state of the answer account
  //   let answerState2 = await program.account.answer.fetch(answerPDA2);

  //   // Assert answer set correctly
  //   expect(answerState2.text).to.equal(answerText2);

  //   // Assert answer votes is zero
  //   expect(answerState2.votes).to.equal(0);
  // });

  // it("Member without correct privileges can't submit an answer", async () => {
  //   try {
  //     // Consutruct buffer containing latest answer index
  //     const answerCounterBuffer = Buffer.alloc(1);
  //     answerCounterBuffer.writeUIntBE(
  //       (await program.account.proposal.fetch(questionPDA)).ansCounter,
  //       0,
  //       1
  //     );

  //     // Derive the address of the answer account
  //     [answerPDAFails, bump] = await anchor.web3.PublicKey.findProgramAddress(
  //       [Buffer.from(questionPDA.toBytes()), answerCounterBuffer],
  //       program.programId
  //     );

  //     await program.methods
  //       .addAnswer("Sausage")
  //       .accounts({
  //         proposal: questionPDA,
  //         member: member3.publicKey,
  //         memberStruct: memberPDA3,
  //         answer: answerPDAFails,
  //         systemProgram: SystemProgram.programId,
  //       })
  //       .signers([member3])
  //       .rpc();

  //     assert(false);
  //   } catch (err) {
  //     assert(err);
  //   }
  // });

  // it("Can't add member using privillaged member's PDA", async () => {
  //   try {
  //     // Consutruct buffer containing latest answer index
  //     const answerCounterBuffer = Buffer.alloc(1);
  //     answerCounterBuffer.writeUIntBE(
  //       (await program.account.proposal.fetch(questionPDA)).ansCounter,
  //       0,
  //       1
  //     );

  //     // Derive the address of the answer account
  //     [answerPDAFails, bump] = await anchor.web3.PublicKey.findProgramAddress(
  //       [Buffer.from(questionPDA.toBytes()), answerCounterBuffer],
  //       program.programId
  //     );

  //     await program.methods
  //       .addAnswer("Dog")
  //       .accounts({
  //         proposal: questionPDA,
  //         member: member2.publicKey, // Passing member3 account
  //         memberStruct: memberPDA2, // Passing member3 PDA
  //         answer: answerPDAFails,
  //         systemProgram: SystemProgram.programId,
  //       })
  //       .signers([memberScammer])
  //       .rpc();

  //     assert(false);
  //   } catch (err) {
  //     assert(err);
  //   }
  // });

  // it("Vote cast as member1 for answer1", async () => {
  //   // Derive the address of the voted account
  //   [votedPDA, bump] = await anchor.web3.PublicKey.findProgramAddress(
  //     [
  //       Buffer.from(member1.publicKey.toBytes()),
  //       Buffer.from(questionPDA.toBytes()),
  //     ],
  //     program.programId
  //   );

  //   // Get start answer tally
  //   let tallyStart: number = (await program.account.answer.fetch(answerPDA))
  //     .votes;

  //   await program.methods
  //     .vote()
  //     .accounts({
  //       answer: answerPDA,
  //       voted: votedPDA,
  //       proposal: questionPDA,
  //       member: member1.publicKey,
  //       memberStruct: voterPDA,
  //       systemProgram: SystemProgram.programId,
  //     })
  //     .signers([member1])
  //     .rpc();

  //   // Get end answer tally
  //   let tallyEnd: number = (await program.account.answer.fetch(answerPDA))
  //     .votes;
  //   let memberWeight: number = (await program.account.member.fetch(voterPDA))
  //     .weight;

  //   // Assert that tally has increased by the weight of the member
  //   expect(tallyEnd - tallyStart).to.be.equal(memberWeight);

  //   // Check that votedPDA exists by account having lamports
  //   await provider.connection.getBalance(votedPDA);
  // });

  // it("Vote cast as member2 for answer2", async () => {
  //   // Derive the address of the voted account
  //   [votedPDA2, bump] = await anchor.web3.PublicKey.findProgramAddress(
  //     [
  //       Buffer.from(member2.publicKey.toBytes()),
  //       Buffer.from(questionPDA.toBytes()),
  //     ],
  //     program.programId
  //   );

  //   // Get start answer tally
  //   let tallyStart2: number = (await program.account.answer.fetch(answerPDA2))
  //     .votes;

  //   await program.methods
  //     .vote()
  //     .accounts({
  //       answer: answerPDA2,
  //       voted: votedPDA2,
  //       proposal: questionPDA,
  //       member: member2.publicKey,
  //       memberStruct: memberPDA2,
  //       systemProgram: SystemProgram.programId,
  //     })
  //     .signers([member2])
  //     .rpc();

  //   // Get end answer tally
  //   let tallyEnd2: number = (await program.account.answer.fetch(answerPDA2))
  //     .votes;
  //   let memberWeight2: number = (await program.account.member.fetch(memberPDA2))
  //     .weight;

  //   // Assert that tally has increased by the weight of the member
  //   expect(tallyEnd2 - tallyStart2).to.be.equal(memberWeight2);

  //   // Check that votedPDA exists by account having lamports
  //   await provider.connection.getBalance(votedPDA2);
  // });

  // it("Vote cast as member3 for answer1", async () => {
  //   // Derive the address of the voted account
  //   [votedPDA3, bump] = await anchor.web3.PublicKey.findProgramAddress(
  //     [
  //       Buffer.from(member3.publicKey.toBytes()),
  //       Buffer.from(questionPDA.toBytes()),
  //     ],
  //     program.programId
  //   );

  //   // Get start answer1 tally
  //   let tallyStart: number = (await program.account.answer.fetch(answerPDA))
  //     .votes;

  //   await program.methods
  //     .vote()
  //     .accounts({
  //       answer: answerPDA,
  //       voted: votedPDA3,
  //       proposal: questionPDA,
  //       member: member3.publicKey,
  //       memberStruct: memberPDA3,
  //       systemProgram: SystemProgram.programId,
  //     })
  //     .signers([member3])
  //     .rpc();

  //   // Get end answer1 tally
  //   let tallyEnd: number = (await program.account.answer.fetch(answerPDA))
  //     .votes;
  //   let memberWeight3: number = (await program.account.member.fetch(memberPDA3))
  //     .weight;

  //   // Assert that tally has increased by the weight of the member
  //   expect(tallyEnd - tallyStart).to.be.equal(memberWeight3);

  //   // Check that votedPDA exists by account having lamports
  //   await provider.connection.getBalance(votedPDA2);
  // });

  // it("Can't vote using privillaged member's PDA", async () => {
  //   try {
  //     // Consutruct buffer containing latest answer index
  //     const answerCounterBuffer = Buffer.alloc(1);
  //     answerCounterBuffer.writeUIntBE(
  //       (await program.account.proposal.fetch(questionPDA)).ansCounter,
  //       0,
  //       1
  //     );

  //     // Derive the address of the answer account
  //     [answerPDAFails, bump] = await anchor.web3.PublicKey.findProgramAddress(
  //       [Buffer.from(questionPDA.toBytes()), answerCounterBuffer],
  //       program.programId
  //     );

  //     await program.methods
  //       .vote()
  //       .accounts({
  //         answer: answerPDA2,
  //         voted: votedPDA2,
  //         proposal: questionPDA,
  //         member: member3.publicKey, // Passing member3 account
  //         memberStruct: memberPDA3, // Passing member3 PDA
  //         systemProgram: SystemProgram.programId,
  //       })
  //       .signers([memberScammer])
  //       .rpc();

  //     assert(false);
  //   } catch (err) {
  //     assert(err);
  //   }
  // });

  // it("Tally votes fails with insuficcient answer accounts provided", async () => {
  //   try {
  //     await program.methods
  //       .tally()
  //       .accounts({
  //         voting: votingPDA,
  //         caller: chairperson.publicKey,
  //         proposal: questionPDA,
  //       })
  //       .remainingAccounts([
  //         { pubkey: answerPDA, isWritable: false, isSigner: false },
  //       ])
  //       .signers([chairperson])
  //       .rpc();

  //     assert(false);
  //   } catch (err) {
  //     assert(err);
  //   }
  // });

  // it("Tally votes", async () => {
  //   await program.methods
  //     .tally()
  //     .accounts({
  //       voting: votingPDA,
  //       caller: chairperson.publicKey,
  //       proposal: questionPDA,
  //     })
  //     .remainingAccounts([
  //       { pubkey: answerPDA, isWritable: false, isSigner: false },
  //       { pubkey: answerPDA2, isWritable: false, isSigner: false },
  //     ])
  //     .signers([chairperson])
  //     .rpc();

  //   // Retrieve PDA state for the proposal
  //   let questionState = await program.account.proposal.fetch(questionPDA);

  //   // Assert answer 0 won
  //   expect(questionState.winnerIdx).to.equal(0);

  //   // Assert vote is over
  //   expect(questionState.winnerSelected).to.equal(true);

  //   // Consutruct buffer containing latest answer index
  //   const answerCounterBuffer = Buffer.alloc(1);
  //   answerCounterBuffer.writeUIntBE(questionState.winnerIdx, 0, 1);

  //   // Derive the address of the winning answer account
  //   let [winnerAnswerPDA, bump] =
  //     await anchor.web3.PublicKey.findProgramAddress(
  //       [Buffer.from(questionPDA.toBytes()), answerCounterBuffer],
  //       program.programId
  //     );

  //   // Assert right answer has been picked
  //   let winnerAsnwerState = await program.account.answer.fetch(winnerAnswerPDA);
  //   expect(winnerAsnwerState.text).to.equal(answerText);
  // });
});
