import User from './modules/User.js';
import Swish from './modules/Swish.js';
import SwishTransaction from './modules/SwishTransaction.js';
import DB from './modules/DB.js';

export default class Rest{

    constructor( server, req = {} ){

        this.server = server;
        this.body = req.body;
        this.user = new User();

    }

    async getUser(){

        if( this.body.token )
            await this.user.loadByToken(this.body.token);
        if( this.user.isLoggedIn() )
            await this.user.refreshToken();

    }

    async exec(){

        await this.getUser();
        let 
            task = this.body.task,
            args = this.body.args
        ;
        if( !Array.isArray(args) )
            args = [args];
    
        let fn = "pub"+task;
        if( typeof this[fn] === "function" )
            return await this[fn].call(this, ...args);
        
        fn = "pvt"+task;
        if( typeof this[fn] === "function" ){

            if( !this.user.isLoggedIn() ){
                throw new Error("Access denied");
            }
            return await this[fn].call(this, ...args);

        }

        throw new Error("Task invalid: "+task);

    }

    // Gets userdata for active user
    async pubGetUser(){

        return this.user.getOut(true);

    }
    
    async pubRegister( nick, password0, password1, discord = "" ){

        nick = String(nick).trim();
        password0 = String(password0);
        password1 = String(password1);
        discord = String(discord).trim();

        const user = new User();
        this.user = user;

        if( password0 !== password1 )
            throw new Error("Passwords don't match");

        // The rest is handled by User
        await user.register(nick, password0, discord);

        const out = this.user.getOut(true);
        return out;

    }

    // Fetches userdata and generates a new 
    async pubLogin( nick, password ){

        const att = await this.user.logIn(nick, password);
        if( !att ){
            throw new Error("Felaktig användare/lösenord. Försök igen!");
        }
        const out = this.user.getOut(true);
        return out;
        
    }

    async pvtLogout(){
        
        await this.user.destroyToken(true);
        this.user = new User();
        return this.user.getOut(true);

    }

    async pvtCreateSwishTransaction( amount, phone ){

        const uuid = await Swish.createInvoice(this.user.id, phone, amount); // True = live
        await SwishTransaction.create(this.user, uuid);
        
        return true;

    }

    // Returns a user object with updated credits.
    async pvtRefreshTransactions(){

        const conn = await DB.getTransactionConnection();
        try{

            const pending = await SwishTransaction.getPendingByUser(this.user);

            const promises = [];
            for( let tx of pending )
                promises.push(tx.refresh(conn)); // Note: tx.refresh returns 0 or a value in whole SEK to add
            const results = await Promise.all(promises);

            let amountPaid = 0;
            for( let result of results )
                amountPaid += result;

            if( amountPaid )
                await this.user.addShopCredit(amountPaid, conn); // Note: AddShopCredit takes whole SEK
            
            await DB.finalizeTransaction(conn); // Finalizes and releases


            return this.user.getOut(true);

        }catch(err){
            
            await DB.rollbackTransaction(conn);
            throw err; // Rethrow and let the parent catch handle it.
            
        }        

    }


}


