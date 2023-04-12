import User from './modules/User.js';
import Swish from './modules/Swish.js';
import SwishTransaction from './modules/SwishTransaction.js';
import DB from './modules/DB.js';
import { ShopItem } from './modules/ShopItem.js';

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
    
        // Public tasks
        let fn = "pub"+task;
        if( typeof this[fn] === "function" )
            return await this[fn].call(this, ...args);
        
        // Logged in tasks
        fn = "pvt"+task;
        if( typeof this[fn] === "function" ){

            if( !this.user.isLoggedIn() ){
                throw new Error("Access denied");
            }
            return await this[fn].call(this, ...args);

        }

        // Admin tasks
        fn = "adm"+task;
        if( typeof this[fn] === "function" ){

            if( !this.user.isLoggedIn() || !this.user.isAdmin() ){
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








    /* Pvt: LOGIN REQUIRED */
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

    // Todo: Get shop items
    /*
        Gets an array of active shop items
        Note: Admins also get inactive shop items
    */
    async pvtGetShopItems(){

        // Todo: Continue

    }
    
    // Todo: Purchase shop item
    async pvtPurchaseShopItem(){

        // Todo: Continue


    }







    /* Adm: ADMIN REQUIRED */
    /*
        Creates or updates admin a shop item
        id : id of the item to alter. 0 creates a new one
        data can contain any of the keys defined in ShopItem. Name is required if you're creating a new one.
    */
    async admCreateShopItem( id, data = {} ){

        if( typeof data !== "object" )
            throw new Error("Data invalid for ShopItem");

        id = Math.trunc(id);
        
        if( !id && !String(data.name).trim() )
            throw new Error("Ett namn krävs för varje produkt.");

        let cur = new ShopItem();
        // Update an existing one
        if( id > 0 ){
            cur = await ShopItem.get(id);
            if( !cur )
                throw new Error("Produkten hittades inte");
        }

        // Update fields
        for( let field of ShopItem.ADMIN_SETTABLE ){
            
            if( data.hasOwnProperty(field) )
                cur[field] = data[field];

        }
        await cur.saveOrInsert();

        // Todo: Handle image upload after making sure it's inserted

        return cur.getOut(true);

    }


}


