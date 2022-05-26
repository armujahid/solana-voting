import assert from "assert";
import { expect } from "chai";
import * as anchor from "@project-serum/anchor";
import { Example3 } from "../target/types/example3";
const { SystemProgram } = anchor.web3;

describe("Tests for example3-consortium", async () => {
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
  const program = anchor.workspace.Example3 as anchor.Program<Example3>;

  // Global addresses for easy loading to subsequent tests
  let bump;
  let consortiumPDA;
  let questionPDA;
  let answerPDA;
  let answerPDA2;
  let answerPDAFails;
  let memberPDA;
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

  it("Creates a consortium account", async () => {
    // Seed for the consortium PDA
    let seedString: string = "consortium";
    let seed: Buffer = Buffer.from(seedString);

    [consortiumPDA, bump] = await anchor.web3.PublicKey.findProgramAddress(
      [seed, chairperson.publicKey.toBytes()],
      program.programId
    );

    // Create a consortium
    await program.methods
      .initialiseConsortium(seedString)
      .accounts({
        consortium: consortiumPDA,
        chairperson: chairperson.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([chairperson])
      .rpc();

    let consortiumState = await program.account.consortium.fetch(consortiumPDA);

    // Assert consortium question count set to zero
    expect(consortiumState.questionCount).to.equal(0);

    // Assert authority matches consortium chairperson
    expect(consortiumState.chairperson.toString()).to.equal(
      chairperson.publicKey.toString()
    );
  });

  it("Chairman adds members", async () => {
    const memberWeight = 150;

    [memberPDA, bump] = await anchor.web3.PublicKey.findProgramAddress(
      [
        Buffer.from(consortiumPDA.toBytes()),
        Buffer.from(member1.publicKey.toBytes()),
      ],
      program.programId
    );

    await program.methods
      .addMember(memberWeight, true, member1.publicKey)
      .accounts({
        consortium: consortiumPDA,
        chairperson: chairperson.publicKey,
        member: memberPDA,
        systemProgram: SystemProgram.programId,
      })
      .signers([chairperson])
      .rpc();

    // Retrieve member PDA state
    let memberState = await program.account.member.fetch(memberPDA);

    // Assert members weight is correct
    expect(memberState.weight).to.equal(memberWeight);

    // Assert this member can initiate answers
    expect(memberState.proposeAnswers).to.equal(true);

    // PDA for member 2
    [memberPDA2, bump] = await anchor.web3.PublicKey.findProgramAddress(
      [
        Buffer.from(consortiumPDA.toBytes()),
        Buffer.from(member2.publicKey.toBytes()),
      ],
      program.programId
    );

    await program.methods
      .addMember(memberWeight, true, member2.publicKey)
      .accounts({
        consortium: consortiumPDA,
        chairperson: chairperson.publicKey,
        member: memberPDA2,
        systemProgram: SystemProgram.programId,
      })
      .signers([chairperson])
      .rpc();

    // Retrieve member PDA state
    let memberState2 = await program.account.member.fetch(memberPDA);

    // Assert members weight is correct
    expect(memberState2.weight).to.equal(memberWeight);

    // Assert this member can initiate answers
    expect(memberState2.proposeAnswers).to.equal(true);
  });

  it("Chairman adds a member with different settings", async () => {
    const memberWeight3 = 100; // more votes

    [memberPDA3, bump] = await anchor.web3.PublicKey.findProgramAddress(
      [
        Buffer.from(consortiumPDA.toBytes()),
        Buffer.from(member3.publicKey.toBytes()),
      ],
      program.programId
    );

    await program.methods
      .addMember(memberWeight3, false, member3.publicKey)
      .accounts({
        consortium: consortiumPDA,
        chairperson: chairperson.publicKey,
        member: memberPDA3,
        systemProgram: SystemProgram.programId,
      })
      .signers([chairperson])
      .rpc();

    // Retrieve member PDA state
    let memberState3 = await program.account.member.fetch(memberPDA3);

    // Assert member's weight is correct
    expect(memberState3.weight).to.equal(memberWeight3);

    // Assert member's address is correct
    expect(memberState3.key.toString()).to.equal(member3.publicKey.toString());

    // Assert this member can't initiate answers
    expect(memberState3.proposeAnswers).to.equal(false);
  });

  it("Non-chairpersons can't add members", async () => {
    let [member3PDA, bump2] = await anchor.web3.PublicKey.findProgramAddress(
      [
        Buffer.from(consortiumPDA.toBytes()),
        Buffer.from(member4.publicKey.toBytes()),
      ],
      program.programId
    );

    // Attempt to add member3 as member (a member)
    try {
      await program.methods
        .addMember(66, true, member4.publicKey)
        .accounts({
          consortium: consortiumPDA,
          chairperson: chairperson.publicKey,
          member: member3PDA,
          systemProgram: SystemProgram.programId,
        })
        .signers([member4])
        .rpc();

      assert(false);
    } catch (err) {
      assert(err);
    }
  });

  it("Chairman can add question", async () => {
    let questionText = "What's the best fruit?";

    // Get consortium counter for PDA derivation
    let consortiumQuestionCounter = (
      await program.account.consortium.fetch(consortiumPDA)
    ).questionCount;

    // Consutruct buffer containing latest index
    const questionCounterBuffer = Buffer.alloc(4);
    questionCounterBuffer.writeUIntBE(consortiumQuestionCounter, 0, 4);

    // Derive question account
    [questionPDA, bump] = await anchor.web3.PublicKey.findProgramAddress(
      [
        Buffer.from(consortiumPDA.toBytes()), // Byte buffer from consortium PDA
        questionCounterBuffer, // Byte buffer of the question counter
      ],
      program.programId
    );

    // Make deadline
    let deadline: number = new Date().getTime() + 10000;

    await program.methods
      .addQuestion(questionText, new anchor.BN(deadline))
      .accounts({
        consortium: consortiumPDA,
        chairperson: chairperson.publicKey,
        question: questionPDA,
        systemProgram: SystemProgram.programId,
      })
      .signers([chairperson])
      .rpc();

    // Retrieve question account state
    let questionState = await program.account.question.fetch(questionPDA);

    // Assert question text is correct
    expect(questionState.question).to.equal(questionText);

    // Assert question deadline is correct
    expect(parseInt(questionState.deadline.toString())).to.equal(deadline);

    // Assert no answers have been added
    expect(questionState.ansCounter).to.equal(0);

    // Assert no winner has been picked
    expect(questionState.winnerSelected).to.equal(false);

    // Assert winner index initialised to zero (not really necessary to intialsie it thought)
    expect(questionState.winnerIdx).to.equal(0);
  });

  it("Member with correct privileges can submit an answer", async () => {
    // Consutruct buffer containing latest answer index
    const answerCounterBuffer = Buffer.alloc(1);
    answerCounterBuffer.writeUIntBE(
      (await program.account.question.fetch(questionPDA)).ansCounter,
      0,
      1
    );

    // Derive the address of the answer account
    [answerPDA, bump] = await anchor.web3.PublicKey.findProgramAddress(
      [Buffer.from(questionPDA.toBytes()), answerCounterBuffer],
      program.programId
    );

    await program.methods
      .addAnswer(answerText)
      .accounts({
        question: questionPDA,
        member: member1.publicKey,
        memberStruct: memberPDA,
        answer: answerPDA,
        systemProgram: SystemProgram.programId,
      })
      .signers([member1])
      .rpc();

    // Assert question answer count has incremented
    expect(
      (await program.account.question.fetch(questionPDA)).ansCounter
    ).to.equal(1);

    // Retrieve state of the answer account
    let answerState = await program.account.answer.fetch(answerPDA);

    // Assert answer set correctly
    expect(answerState.text).to.equal(answerText);

    // Assert answer votes is initialised to zero
    expect(answerState.votes).to.equal(0);

    // Consutruct buffer containing latest answer index
    const answerCounterBuffer2 = Buffer.alloc(1);
    answerCounterBuffer2.writeUIntBE(
      (await program.account.question.fetch(questionPDA)).ansCounter,
      0,
      1
    );

    // Derive the address of the answer account
    [answerPDA2, bump] = await anchor.web3.PublicKey.findProgramAddress(
      [Buffer.from(questionPDA.toBytes()), answerCounterBuffer2],
      program.programId
    );

    await program.methods
      .addAnswer(answerText2)
      .accounts({
        question: questionPDA,
        member: member2.publicKey,
        memberStruct: memberPDA2,
        answer: answerPDA2,
        systemProgram: SystemProgram.programId,
      })
      .signers([member2])
      .rpc();

    // Assert question answer count has incremented to 2
    expect(
      (await program.account.question.fetch(questionPDA)).ansCounter
    ).to.equal(2);

    // Retrieve state of the answer account
    let answerState2 = await program.account.answer.fetch(answerPDA2);

    // Assert answer set correctly
    expect(answerState2.text).to.equal(answerText2);

    // Assert answer votes is zero
    expect(answerState2.votes).to.equal(0);
  });

  it("Member without correct privileges can't submit an answer", async () => {
    try {
      // Consutruct buffer containing latest answer index
      const answerCounterBuffer = Buffer.alloc(1);
      answerCounterBuffer.writeUIntBE(
        (await program.account.question.fetch(questionPDA)).ansCounter,
        0,
        1
      );

      // Derive the address of the answer account
      [answerPDAFails, bump] = await anchor.web3.PublicKey.findProgramAddress(
        [Buffer.from(questionPDA.toBytes()), answerCounterBuffer],
        program.programId
      );

      await program.methods
        .addAnswer("Sausage")
        .accounts({
          question: questionPDA,
          member: member3.publicKey,
          memberStruct: memberPDA3,
          answer: answerPDAFails,
          systemProgram: SystemProgram.programId,
        })
        .signers([member3])
        .rpc();

      assert(false);
    } catch (err) {
      assert(err);
    }
  });

  it("Can't add member using privillaged member's PDA", async () => {
    try {
      // Consutruct buffer containing latest answer index
      const answerCounterBuffer = Buffer.alloc(1);
      answerCounterBuffer.writeUIntBE(
        (await program.account.question.fetch(questionPDA)).ansCounter,
        0,
        1
      );

      // Derive the address of the answer account
      [answerPDAFails, bump] = await anchor.web3.PublicKey.findProgramAddress(
        [Buffer.from(questionPDA.toBytes()), answerCounterBuffer],
        program.programId
      );

      await program.methods
        .addAnswer("Dog")
        .accounts({
          question: questionPDA,
          member: member2.publicKey, // Passing member3 account
          memberStruct: memberPDA2, // Passing member3 PDA
          answer: answerPDAFails,
          systemProgram: SystemProgram.programId,
        })
        .signers([memberScammer])
        .rpc();

      assert(false);
    } catch (err) {
      assert(err);
    }
  });

  it("Vote cast as member1 for answer1", async () => {
    // Derive the address of the voted account
    [votedPDA, bump] = await anchor.web3.PublicKey.findProgramAddress(
      [
        Buffer.from(member1.publicKey.toBytes()),
        Buffer.from(questionPDA.toBytes()),
      ],
      program.programId
    );

    // Get start answer tally
    let tallyStart: number = (await program.account.answer.fetch(answerPDA))
      .votes;

    await program.methods
      .vote()
      .accounts({
        answer: answerPDA,
        voted: votedPDA,
        question: questionPDA,
        member: member1.publicKey,
        memberStruct: memberPDA,
        systemProgram: SystemProgram.programId,
      })
      .signers([member1])
      .rpc();

    // Get end answer tally
    let tallyEnd: number = (await program.account.answer.fetch(answerPDA))
      .votes;
    let memberWeight: number = (await program.account.member.fetch(memberPDA))
      .weight;

    // Assert that tally has increased by the weight of the member
    expect(tallyEnd - tallyStart).to.be.equal(memberWeight);

    // Check that votedPDA exists by account having lamports
    await provider.connection.getBalance(votedPDA);
  });

  it("Vote cast as member2 for answer2", async () => {
    // Derive the address of the voted account
    [votedPDA2, bump] = await anchor.web3.PublicKey.findProgramAddress(
      [
        Buffer.from(member2.publicKey.toBytes()),
        Buffer.from(questionPDA.toBytes()),
      ],
      program.programId
    );

    // Get start answer tally
    let tallyStart2: number = (await program.account.answer.fetch(answerPDA2))
      .votes;

    await program.methods
      .vote()
      .accounts({
        answer: answerPDA2,
        voted: votedPDA2,
        question: questionPDA,
        member: member2.publicKey,
        memberStruct: memberPDA2,
        systemProgram: SystemProgram.programId,
      })
      .signers([member2])
      .rpc();

    // Get end answer tally
    let tallyEnd2: number = (await program.account.answer.fetch(answerPDA2))
      .votes;
    let memberWeight2: number = (await program.account.member.fetch(memberPDA2))
      .weight;

    // Assert that tally has increased by the weight of the member
    expect(tallyEnd2 - tallyStart2).to.be.equal(memberWeight2);

    // Check that votedPDA exists by account having lamports
    await provider.connection.getBalance(votedPDA2);
  });

  it("Vote cast as member3 for answer1", async () => {
    // Derive the address of the voted account
    [votedPDA3, bump] = await anchor.web3.PublicKey.findProgramAddress(
      [
        Buffer.from(member3.publicKey.toBytes()),
        Buffer.from(questionPDA.toBytes()),
      ],
      program.programId
    );

    // Get start answer1 tally
    let tallyStart: number = (await program.account.answer.fetch(answerPDA))
      .votes;

    await program.methods
      .vote()
      .accounts({
        answer: answerPDA,
        voted: votedPDA3,
        question: questionPDA,
        member: member3.publicKey,
        memberStruct: memberPDA3,
        systemProgram: SystemProgram.programId,
      })
      .signers([member3])
      .rpc();

    // Get end answer1 tally
    let tallyEnd: number = (await program.account.answer.fetch(answerPDA))
      .votes;
    let memberWeight3: number = (await program.account.member.fetch(memberPDA3))
      .weight;

    // Assert that tally has increased by the weight of the member
    expect(tallyEnd - tallyStart).to.be.equal(memberWeight3);

    // Check that votedPDA exists by account having lamports
    await provider.connection.getBalance(votedPDA2);
  });

  it("Can't vote using privillaged member's PDA", async () => {
    try {
      // Consutruct buffer containing latest answer index
      const answerCounterBuffer = Buffer.alloc(1);
      answerCounterBuffer.writeUIntBE(
        (await program.account.question.fetch(questionPDA)).ansCounter,
        0,
        1
      );

      // Derive the address of the answer account
      [answerPDAFails, bump] = await anchor.web3.PublicKey.findProgramAddress(
        [Buffer.from(questionPDA.toBytes()), answerCounterBuffer],
        program.programId
      );

      await program.methods
        .vote()
        .accounts({
          answer: answerPDA2,
          voted: votedPDA2,
          question: questionPDA,
          member: member3.publicKey, // Passing member3 account
          memberStruct: memberPDA3, // Passing member3 PDA
          systemProgram: SystemProgram.programId,
        })
        .signers([memberScammer])
        .rpc();

      assert(false);
    } catch (err) {
      assert(err);
    }
  });

  it("Tally votes fails with insuficcient answer accounts provided", async () => {
    try {
      await program.methods
        .tally()
        .accounts({
          consortium: consortiumPDA,
          caller: chairperson.publicKey,
          question: questionPDA,
        })
        .remainingAccounts([
          { pubkey: answerPDA, isWritable: false, isSigner: false },
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
        consortium: consortiumPDA,
        caller: chairperson.publicKey,
        question: questionPDA,
      })
      .remainingAccounts([
        { pubkey: answerPDA, isWritable: false, isSigner: false },
        { pubkey: answerPDA2, isWritable: false, isSigner: false },
      ])
      .signers([chairperson])
      .rpc();

    // Retrieve PDA state for the question
    let questionState = await program.account.question.fetch(questionPDA);

    // Assert answer 0 won
    expect(questionState.winnerIdx).to.equal(0);

    // Assert vote is over
    expect(questionState.winnerSelected).to.equal(true);

    // Consutruct buffer containing latest answer index
    const answerCounterBuffer = Buffer.alloc(1);
    answerCounterBuffer.writeUIntBE(questionState.winnerIdx, 0, 1);

    // Derive the address of the winning answer account
    let [winnerAnswerPDA, bump] =
      await anchor.web3.PublicKey.findProgramAddress(
        [Buffer.from(questionPDA.toBytes()), answerCounterBuffer],
        program.programId
      );

    // Assert right answer has been picked
    let winnerAsnwerState = await program.account.answer.fetch(winnerAnswerPDA);
    expect(winnerAsnwerState.text).to.equal(answerText);
  });
});
