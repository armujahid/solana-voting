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
4) read_votes?

2022-05-19:
1) Some pre-selected accounts (chairperson(s)?) will be able to submit proposals/topics and open voting
2) Each account can vote unlimited number of times but for each vote some SOL will have to be locked/stacked
3) chairperson(s) will be able to close voting? Or Should we close voting after X number of blocks after openning of voting?
4) Locked/Stacked SOL will be returned at the end of voting to each voter


Tasks:
* Project Design
* Front End (Web, Wallet integration etc.)
* Backend - Smart Contract

User Experience/Flow:



Task Distribution:
* Anna, Kisekka David - FE
* Ahmed Ali, Yusuf Kelo  - Smart Contract
* Abdul Rauf - Design?
