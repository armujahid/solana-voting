use anchor_lang::prelude::*;

declare_id!("8q9Xm51HBw8s8DknD5P11RvBm2WovX2VageztBf2xdzH");

#[program]
mod voting {
    use super::*;       

    // Creates a PDA for the voting
    pub fn initialise_voting(ctx: Context<CreateVoting>, _seed: String) -> Result<()> {        
        let voting: &mut Account<Voting> = &mut ctx.accounts.voting;        
        voting.chairperson = ctx.accounts.chairperson.key();                         
        Ok(())
    }

    // // Creates a PDA for the member
    // pub fn add_member(ctx: Context<AddMember>, weight: u8, propose_answers: bool, member_acc: Pubkey) -> Result<()> {        
    //     let voter: &mut Account<Voter> = &mut ctx.accounts.voter;        
    //     voter.weight = weight;
    //     voter.key = member_acc;
    //     voter.propose_answers = propose_answers;        
    //     Ok(())
    // }

    // Creates a PDA for the proposal
    pub fn add_proposal(ctx: Context<AddProposal>, proposal_proposal: String) -> Result<()> {        
        let proposal: &mut Account<Proposal> = &mut ctx.accounts.proposal;
        let voting: &mut Account<Voting> = &mut ctx.accounts.voting;  
        proposal.proposal = proposal_proposal;        
        // voting.deadline = proposal_deadline;        
        voting.proposal_count += 1;   
        Ok(())
    }

    // // Creates a PDA for the answer
    // pub fn add_answer(ctx: Context<AddAnswer>, text: String) -> Result<()> {        
    //     let proposal: &mut Account<Proposal> = &mut ctx.accounts.question;
    //     let answer: &mut Account<Answer> = &mut ctx.accounts.answer;     
    //     question.vote_counter += 1;      
    //     answer.text = text;
    //     Ok(())
    // }

    // Creates a PDA for a casted vote
    pub fn vote(ctx: Context<Vote>) -> Result<()> {              
        let proposal: &mut Account<Proposal> = &mut ctx.accounts.proposal;  
        // let voter: &mut Account<Voter> = &mut ctx.accounts.voter_struct;          
        proposal.vote_counter += 1; // TODO: increment according to received lamports     
        Ok(())
    }

    // Winning answer gets validated and stored in the question PDA
    pub fn tally(ctx: Context<Tally>) -> Result<()> {   

        let voting: &mut Account<Voting> = &mut ctx.accounts.voting;        

        // All of the acounts not explicitely mentioned in the Tally context
        let proposals: Vec<AccountInfo> = ctx.remaining_accounts.to_vec();
        let mut winner: (u32, u8) = (0,0);            

        msg!("Receieved {:?} answers accounts",proposals.len());

        // Check that accounts passed is equal to the counter
        assert!(proposals.len() == voting.proposal_count as usize);        

        // Need to loop over proposal indexes 
        for (idx, proposal) in proposals.iter().enumerate() {      

            // Check that the PDA match
            let (pda_proposal, _bump) = Pubkey::find_program_address(&[voting.key().as_ref(), &[idx as u8]], &ctx.program_id);                        
            msg!("pda_proposal: {:?}",pda_proposal);
            msg!("proposal.key(): {:?}",proposal.key());
            assert!(pda_proposal == proposal.key());            
            
            // Cast AccountInfo as Asnwer struct
            let tmp_proposal: Account<Proposal> = Account::try_from(&proposal)?;        

            msg!("{:?} votes {:?}",tmp_proposal.proposal, tmp_proposal.vote_counter);
            
            // Check if votes exceed current leader
            if tmp_proposal.vote_counter > winner.0 {
                winner.0 = tmp_proposal.vote_counter;
                winner.1 = idx as u8;
            }
        }        

        // Set the winner idx in the question account
        voting.winner_idx = winner.1;
        voting.winner_selected = true;

        msg!("EXIT");

        Ok(())
    }    
}

// Accounts instructions
////////////////////////////////////////////////////////////////

#[derive(Accounts)]
#[instruction(seed: String)]
pub struct CreateVoting<'info> {            
    #[account(
        init, 
        seeds = [
            seed.as_bytes(), 
            chairperson.key().as_ref()
        ], 
        bump, 
        payer = chairperson, 
        space = 80)
    ]
    pub voting: Account<'info, Voting>,       
    #[account(mut)]                                 
    pub chairperson: Signer<'info>,                  
    pub system_program: Program<'info, System>,      
}

// #[derive(Accounts)]
// #[instruction(weight: u8, propose_answers: bool, member_acc: Pubkey)] 
// pub struct AddMember<'info> {            
//     #[account(
//         init,     
//         constraint = chairperson.key == &voting.chairperson,
//         seeds = [
//             voting.key().as_ref(), 
//             member_acc.as_ref()
//         ],         
//         bump, 
//         payer = chairperson, 
//         space = 180)
//     ]
//     pub voter: Account<'info, Voter>,       
//     #[account(mut)]    
//     pub voting: Account<'info, Voting>,      
//     #[account(mut)]                
//     pub chairperson: Signer<'info>,                  
//     pub system_program: Program<'info, System>,      
// }

#[derive(Accounts)]
pub struct AddProposal<'info> {            
    #[account(
        init, 
        seeds = [
            voting.key().as_ref(), 
            &voting.proposal_count.to_be_bytes()
        ], 
        bump, 
        payer = chairperson, 
        space = 180)
    ]
    pub proposal: Account<'info, Proposal>,       
    #[account(mut)]        
    pub voting: Account<'info, Voting>,      
    #[account(mut)]                
    pub chairperson: Signer<'info>,                  
    pub system_program: Program<'info, System>,      
}

// #[derive(Accounts)]
// pub struct AddAnswer<'info> {            
//     #[account(
//         init, 
//         constraint = voter_struct.propose_answers == true && 
//                     voting.deadline > Clock::get().unwrap().unix_timestamp &&
//                     voting.winner_selected == false &&  
//                     voter_struct.key == *voter.key,
//         seeds = [
//             question.key().as_ref(), 
//             &question.vote_counter.to_be_bytes()
//         ], 
//         bump, 
//         payer = voter, 
//         space = 100)
//     ]
//     pub answer: Account<'info, Answer>,           
//     #[account(mut, constraint = voter_struct.propose_answers == true)]
//     pub proposal: Account<'info, Proposal>,           
//     #[account(mut)]                
//     pub voter: Signer<'info>,                    
//     pub voter_struct: Account<'info, Voter>,     
//     pub system_program: Program<'info, System>,      
// }

#[derive(Accounts)]
pub struct Vote<'info> {           
    #[account(
        init, 
        constraint = voting.deadline > Clock::get().unwrap().unix_timestamp && 
        voting.winner_selected == false &&
        voter_struct.key == *voter.key,                                                
        seeds = [
            voter.key().as_ref(), 
            proposal.key().as_ref() 
        ], 
        bump, 
        payer = voter, 
        space = 8)
    ]
    pub voted: Account<'info, Voted>,       // Account that by existing (having lamports) shows that this address has voted
    #[account(
        mut, 
        constraint = voting.deadline > Clock::get().unwrap().unix_timestamp)
    ]
    pub proposal: Account<'info, Proposal>,
    pub voting: Account<'info, Voting>,  
    #[account(mut)]                
    pub voter: Signer<'info>,                    // Signature of the member    
    pub voter_struct: Account<'info, Voter>,        
    pub system_program: Program<'info, System>,       
}

#[derive(Accounts)]
pub struct Tally<'info> {            
    #[account(mut)]                
    pub caller: Signer<'info>,                  
    #[account(mut, 
        constraint = (caller.key() == voting.chairperson ||
                voting.deadline < Clock::get().unwrap().unix_timestamp) 
                    && voting.winner_selected  == false
    )]        
    pub proposal: Account<'info, Proposal>,          // To set index of the winning answer            
    pub voting: Account<'info, Voting>,      
}


// Accounts
////////////////////////////////////////////////////////////////

#[account]
pub struct Voting {    
    pub chairperson: Pubkey,
    pub proposal_count: u32,
    pub winner_idx: u8,    
    pub winner_selected: bool,
    pub deadline: i64,
}

#[account]
pub struct Voter {        
    pub key: Pubkey,
    pub weight: u8, 
    pub propose_answers: bool,
}

#[account]
pub struct Voted {}

#[account]
pub struct Proposal { 
    pub proposal: String, 
    pub vote_counter: u32,
}

// #[account]
// pub struct Answer { 
//     pub text: String,      
//     pub votes: u32,        
// }

