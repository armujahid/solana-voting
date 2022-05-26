import { expect } from "chai";
import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { Example2 } from "../target/types/example2";

const { SystemProgram } = anchor.web3;
import { sha256 } from "js-sha256";

describe("Tests for example2-rps", async () => {
  // Get handles
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.Example2 as Program<Example2>;
  const LAMPORTS_PER_SOL = 1000000000;

  // Account address generated here
  const game = anchor.web3.Keypair.generate();
  const player1 = anchor.web3.Keypair.generate();
  const player2 = anchor.web3.Keypair.generate();

  // Hands with added salt
  const handStringPlayer1 = "0 siyfgsuyrandomsalt"; // player 1 has paper
  const handStringPlayer2 = "1 sirandoPPPfglllfkky"; // player 2 has scissors

  // Hashed hands with salt
  let hashedhandStringPlayer1: number[] = sha256.digest(handStringPlayer1);
  let hashedhandStringPlayer2: number[] = sha256.digest(handStringPlayer2);

  before(async () => {
    // Airdrop test accounts
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(
        player1.publicKey,
        2 * LAMPORTS_PER_SOL
      )
    );
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(
        player2.publicKey,
        2 * LAMPORTS_PER_SOL
      )
    );
  });

  it("Creates a new game", async () => {
    // Create a new game
    await program.methods
      .newGame(player2.publicKey)
      .accounts({
        game: game.publicKey,
        player1: player1.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([game, player1])
      .rpc();

    let gameState = await program.account.game.fetch(game.publicKey);

    // Check that player keys match those submitted above
    expect(gameState.players[0].toString()).to.equal(
      player1.publicKey.toString()
    );
    expect(gameState.players[1].toString()).to.equal(
      player2.publicKey.toString()
    );

    // Check that hash submissions are initialised
    expect(gameState.hashSubmitted[0]).to.equal(false);
    expect(gameState.hashSubmitted[1]).to.equal(false);

    // Check that hashes are initialised to zero
    for (let i = 0; i < gameState.hashedHand[0].length; i++) {
      expect(gameState.hashedHand[0][i]).to.equal(0);
      expect(gameState.hashedHand[1][i]).to.equal(0);
    }
  });

  it("Player 1 submits hash for their move", async () => {
    await program.methods
      .placeHash(hashedhandStringPlayer1)
      .accounts({
        game: game.publicKey,
        player: player1.publicKey,
      })
      .signers([player1])
      .rpc();

    // Get game account state
    let gameState = await program.account.game.fetch(game.publicKey);

    for (let i = 0; i < hashedhandStringPlayer2.length; i++)
      expect(gameState.hashedHand[0][i]).to.equal(hashedhandStringPlayer1[i]);

    // Check that flag has been ticked off for account
    expect(gameState.hashSubmitted[0] != gameState.hashSubmitted[1]).to.equal(
      true
    );
  });

  it("Player 2 submits hash for their move", async () => {
    await program.methods
      .placeHash(hashedhandStringPlayer2)
      .accounts({
        game: game.publicKey,
        player: player2.publicKey,
      })
      .signers([player2])
      .rpc();

    // Get game account state
    let gameState = await program.account.game.fetch(game.publicKey);

    // Checks that every on chain element equals those submitted
    for (let i = 0; i < hashedhandStringPlayer2.length; i++)
      expect(gameState.hashedHand[1][i]).to.equal(hashedhandStringPlayer2[i]);

    // Check thaty flag has been ticked off for account
    expect(gameState.hashSubmitted[0] && gameState.hashSubmitted[1]).to.equal(
      true
    );
  });

  it("Submits hand player 1", async () => {
    await program.methods
      .placeHand(handStringPlayer1)
      .accounts({
        game: game.publicKey,
        player: player1.publicKey,
      })
      .signers([player1])
      .rpc();

    // Get game account state
    let gameState = await program.account.game.fetch(game.publicKey);

    // Check hand submitted for player 1
    expect(gameState.handSubmitted[0]).to.equal(true);
  });

  it("Submits hand player 2", async () => {
    await program.methods
      .placeHand(handStringPlayer2)
      .accounts({
        game: game.publicKey,
        player: player2.publicKey,
      })
      .signers([player2])
      .rpc();

    // Get game account state
    let gameState = await program.account.game.fetch(game.publicKey);

    // Check hand submitted for player 2
    expect(gameState.handSubmitted[1]).to.equal(true);
  });

  it("Player1: Rock, Player 2: Paper", async () => {
    const game = anchor.web3.Keypair.generate();

    // Hands with salt
    const handStringPlayer1 = "0 HuHASUhDil"; // player 1 has paper
    const handStringPlayer2 = "1 ehehehe"; // player 2 has scissors
    let hashedhandStringPlayer1: number[] = sha256.digest(handStringPlayer1);
    let hashedhandStringPlayer2: number[] = sha256.digest(handStringPlayer2);

    // Airdrop test accounts
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(
        player1.publicKey,
        2 * LAMPORTS_PER_SOL
      )
    );
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(
        player2.publicKey,
        2 * LAMPORTS_PER_SOL
      )
    );

    await program.methods
      .newGame(player2.publicKey)
      .accounts({
        game: game.publicKey,
        player1: player1.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([game, player1])
      .rpc();

    await program.methods
      .placeHash(hashedhandStringPlayer1)
      .accounts({
        game: game.publicKey,
        player: player1.publicKey,
      })
      .signers([player1])
      .rpc();

    await program.methods
      .placeHash(hashedhandStringPlayer2)
      .accounts({
        game: game.publicKey,
        player: player2.publicKey,
      })
      .signers([player2])
      .rpc();

    await program.methods
      .placeHand(handStringPlayer1)
      .accounts({
        game: game.publicKey,
        player: player1.publicKey,
      })
      .signers([player1])
      .rpc();

    await program.methods
      .placeHand(handStringPlayer2)
      .accounts({
        game: game.publicKey,
        player: player2.publicKey,
      })
      .signers([player2])
      .rpc();

    // Get game account state
    let gameState = await program.account.game.fetch(game.publicKey);

    // Check hand submitted for player 2
    expect(gameState.winner).to.equal(player2.publicKey.toString());
  });

  it("Player1: Rock, Player 1: Rock", async () => {
    const game = anchor.web3.Keypair.generate();

    // Hands with salt
    const handStringPlayer1 = "0 siyfgsuyLOLfguy"; // player 1 has paper
    const handStringPlayer2 = "0 suyfgsuyfgsewfesfef"; // player 2 has scissors
    let hashedhandStringPlayer1: number[] = sha256.digest(handStringPlayer1);
    let hashedhandStringPlayer2: number[] = sha256.digest(handStringPlayer2);

    // Create a new game
    await program.methods
      .newGame(player2.publicKey)
      .accounts({
        game: game.publicKey,
        player1: player1.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([game, player1])
      .rpc();

    await program.methods
      .placeHash(hashedhandStringPlayer1)
      .accounts({
        game: game.publicKey,
        player: player1.publicKey,
      })
      .signers([player1])
      .rpc();

    await program.methods
      .placeHash(hashedhandStringPlayer2)
      .accounts({
        game: game.publicKey,
        player: player2.publicKey,
      })
      .signers([player2])
      .rpc();

    await program.methods
      .placeHand(handStringPlayer1)
      .accounts({
        game: game.publicKey,
        player: player1.publicKey,
      })
      .signers([player1])
      .rpc();

    await program.methods
      .placeHand(handStringPlayer2)
      .accounts({
        game: game.publicKey,
        player: player2.publicKey,
      })
      .signers([player2])
      .rpc();

    // Get game account state
    let gameState = await program.account.game.fetch(game.publicKey);

    // Check hand submitted for player 2
    expect(gameState.winner).to.equal("DRAW");
  });
});
