use anchor_lang::prelude::*;

declare_id!("BG8eNGD8vvPpegz6NojiFS2n6yPHV5yt9LJngp1QCkFf");

#[program]
mod example3 {
    use super::*;       

    // Creates a PDA for the consortium
    pub fn initialise_consortium(ctx: Context<CreateConsortium>, _seed: String) -> Result<()> {        
        let consortium: &mut Account<Consortium> = &mut ctx.accounts.consortium;        
        consortium.chairperson = ctx.accounts.chairperson.key();                         
        Ok(())
    }

    // Creates a PDA for the member
    pub fn add_member(ctx: Context<AddMember>, weight: u8, propose_answers: bool, member_acc: Pubkey) -> Result<()> {        
        let member: &mut Account<Member> = &mut ctx.accounts.member;        
        member.weight = weight;
        member.key = member_acc;
        member.propose_answers = propose_answers;        
        Ok(())
    }

    // Creates a PDA for the question
    pub fn add_question(ctx: Context<AddQuestion>, question_question: String, question_deadline: i64) -> Result<()> {        
        let question: &mut Account<Question> = &mut ctx.accounts.question;
        let consortium: &mut Account<Consortium> = &mut ctx.accounts.consortium;  
        question.question = question_question;        
        question.deadline = question_deadline;        
        consortium.question_count += 1;   
        Ok(())
    }

    // Creates a PDA for the answer
    pub fn add_answer(ctx: Context<AddAnswer>, text: String) -> Result<()> {        
        let question: &mut Account<Question> = &mut ctx.accounts.question;
        let answer: &mut Account<Answer> = &mut ctx.accounts.answer;     
        question.ans_counter += 1;      
        answer.text = text;
        Ok(())
    }

    // Creates a PDA for a casted vote
    pub fn vote(ctx: Context<Vote>) -> Result<()> {              
        let answer: &mut Account<Answer> = &mut ctx.accounts.answer;  
        let member: &mut Account<Member> = &mut ctx.accounts.member_struct;          
        answer.votes += member.weight as u32;    // Cast vote        
        Ok(())
    }

    // Winning answer gets validated and stored in the question PDA
    pub fn tally(ctx: Context<Tally>) -> Result<()> {   

        let question: &mut Account<Question> = &mut ctx.accounts.question;        

        // All of the acounts not explicitely mentioned in the Tally context
        let answers: Vec<AccountInfo> = ctx.remaining_accounts.to_vec();
        let mut winner: (u32, u8) = (0,0);            

        msg!("Receieved {:?} answers accounts",answers.len());

        // Check that accounts passed is equal to the counter
        assert!(answers.len() == question.ans_counter as usize);        

        // Need to loop over answer indexes of the given question        
        for (idx, answer) in answers.iter().enumerate() {      

            // Check that the PDA match
            let (pda_answer, _bump) = Pubkey::find_program_address(&[question.key().as_ref(), &[idx as u8]], &ctx.program_id);                        
            msg!("pda_answer: {:?}",pda_answer);
            msg!("answer.key(): {:?}",answer.key());
            assert!(pda_answer == answer.key());            
            
            // Cast AccountInfo as Asnwer struct
            let tmp_answer: Account<Answer> = Account::try_from(&answer)?;        

            msg!("{:?} votes {:?}",tmp_answer.text, tmp_answer.votes);
            
            // Check if votes exceed current leader
            if tmp_answer.votes > winner.0 {
                winner.0 = tmp_answer.votes;
                winner.1 = idx as u8;
            }
        }        

        // Set the winner idx in the question account
        question.winner_idx = winner.1;
        question.winner_selected = true;

        msg!("EXIT");

        Ok(())
    }    
}

// Accounts instructions
////////////////////////////////////////////////////////////////

#[derive(Accounts)]
#[instruction(seed: String)]
pub struct CreateConsortium<'info> {            
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
    pub consortium: Account<'info, Consortium>,       
    #[account(mut)]                                 
    pub chairperson: Signer<'info>,                  
    pub system_program: Program<'info, System>,      
}

#[derive(Accounts)]
#[instruction(weight: u8, propose_answers: bool, member_acc: Pubkey)] 
pub struct AddMember<'info> {            
    #[account(
        init,     
        constraint = chairperson.key == &consortium.chairperson,
        seeds = [
            consortium.key().as_ref(), 
            member_acc.as_ref()
        ],         
        bump, 
        payer = chairperson, 
        space = 180)
    ]
    pub member: Account<'info, Member>,       
    #[account(mut)]    
    pub consortium: Account<'info, Consortium>,      
    #[account(mut)]                
    pub chairperson: Signer<'info>,                  
    pub system_program: Program<'info, System>,      
}

#[derive(Accounts)]
pub struct AddQuestion<'info> {            
    #[account(
        init, 
        seeds = [
            consortium.key().as_ref(), 
            &consortium.question_count.to_be_bytes()
        ], 
        bump, 
        payer = chairperson, 
        space = 180)
    ]
    pub question: Account<'info, Question>,       
    #[account(mut)]        
    pub consortium: Account<'info, Consortium>,      
    #[account(mut)]                
    pub chairperson: Signer<'info>,                  
    pub system_program: Program<'info, System>,      
}

#[derive(Accounts)]
pub struct AddAnswer<'info> {            
    #[account(
        init, 
        constraint = member_struct.propose_answers == true && 
                    question.deadline > Clock::get().unwrap().unix_timestamp &&
                    question.winner_selected == false &&  
                    member_struct.key == *member.key,
        seeds = [
            question.key().as_ref(), 
            &question.ans_counter.to_be_bytes()
        ], 
        bump, 
        payer = member, 
        space = 100)
    ]
    pub answer: Account<'info, Answer>,           
    #[account(mut, constraint = member_struct.propose_answers == true)]
    pub question: Account<'info, Question>,           
    #[account(mut)]                
    pub member: Signer<'info>,                    
    pub member_struct: Account<'info, Member>,     
    pub system_program: Program<'info, System>,      
}

#[derive(Accounts)]
pub struct Vote<'info> {           
    #[account(
        init, 
        constraint = question.deadline > Clock::get().unwrap().unix_timestamp && 
        question.winner_selected == false &&
        member_struct.key == *member.key,                                                
        seeds = [
            member.key().as_ref(), 
            question.key().as_ref() 
        ], 
        bump, 
        payer = member, 
        space = 8)
    ]
    pub voted: Account<'info, Voted>,       // Account that by existing (having lamports) shows that this address has voted
    #[account(
        mut, 
        constraint = question.deadline > Clock::get().unwrap().unix_timestamp)
    ]
    pub answer: Account<'info, Answer>,           // Answer PDA to transfer weighted votes to
    pub question: Account<'info, Question>,  
    #[account(mut)]                
    pub member: Signer<'info>,                    // Signature of the member    
    pub member_struct: Account<'info, Member>,        
    pub system_program: Program<'info, System>,       
}

#[derive(Accounts)]
pub struct Tally<'info> {            
    #[account(mut)]                
    pub caller: Signer<'info>,                  
    #[account(mut, 
        constraint = (caller.key() == consortium.chairperson ||
                    question.deadline < Clock::get().unwrap().unix_timestamp) 
                    && question.winner_selected  == false
    )]        
    pub question: Account<'info, Question>,          // To set index of the winning answer            
    pub consortium: Account<'info, Consortium>,      
}


// Accounts
////////////////////////////////////////////////////////////////

#[account]
pub struct Consortium {    
    pub chairperson: Pubkey,
    pub question_count: u32,     
}

#[account]
pub struct Member {        
    pub key: Pubkey,
    pub weight: u8, 
    pub propose_answers: bool,
}

#[account]
pub struct Voted {}

#[account]
pub struct Question { 
    pub question: String, 
    pub ans_counter: u8,  
    pub deadline: i64,
    pub winner_idx: u8,    
    pub winner_selected: bool,    
}

#[account]
pub struct Answer { 
    pub text: String,      
    pub votes: u32,        
}

