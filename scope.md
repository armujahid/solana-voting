Solana voting:

1. Hardcoded (or dynamic) list of something (project, person or something else)
2. Each Account can cast only one (or multiple?) vote
3. Show aggregated amount of votes per project

2022-05-12: Minimal Design:
1) An account with count field for each proposal
2) Any account can vote and each vote will be incrementing count for a particular account
3) A UI to show counts for each account/proposal
4) Voting will be closed x number of blocks after proposal submission?

Endpoints:
1) create_proposal
2) open_voting
3) vote
4) close_voting
5) read_votes?

2022-05-19 (updated on 2022-05-30):
1) Some pre-selected accounts (chairperson(s)?) will be able to submit proposals/topics and open voting
2) Each account can vote unlimited number of times but for each vote some SOL will have to be locked/stacked (For simplicity I think we should just deposit SOL to Proposal's PDAs)
3) chairperson(s) will be able to close voting? Or Should we close voting after X number of blocks after openning of voting?
4) Locked/Stacked SOL will be returned at the end of voting to each voter (return all desposited SOL from all PDAs to respective voters after subtracting transaction fee)




Tasks:
* Project Design
* Front End (Web, Wallet integration etc.)
  1) form to submit proposal (Title, Description)
  2) display all submited proposals with their scores (deposited SOL in proposal PDA) (Title, Votes = Sol balance, Address of the PDA so that we can use it to deposit SOL) (1 SOL = 1 Vote)
  3) Close vote screen (with just close button?)
* Backend - Smart Contract
  1) Create one PDA per proposal. Keep track of PDA count in count (FE will use that count to find and list all proposal PDAs)
  2) in Voting phase. keep track of deposited SOL per PDA for each voter (There must be a way to extract this info from blockchain without us keeping track of this info)
  3) close_voting endpoint that should check for chairperson's signature before closing voting
  4) In close_voting we should also return all desposited SOL from all PDAs to respective voters after subtracting transaction fee
    OR
  Transfer deposited SOL to the winning project and get an NFT in return
User Experience/Flow:



Task Distribution:
* Anna, Kisekka David - FE
* Ahmed Ali, Yusuf Kelo  - Smart Contract
* Abdul Rauf - Design?
