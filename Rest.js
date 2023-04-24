import User from './modules/User.js';
import Swish from './modules/Swish.js';
import SwishTransaction from './modules/SwishTransaction.js';
import DB from './modules/DB.js';
import { ShopItem } from './modules/ShopItem.js';
import ShopTransaction from './modules/ShopTransaction.js';


export default class Rest{

    constructor( server, req = {} ){

        this.files = req.files;
        this.server = server;
        this.body = req.body;
        this.user = new User();
        const ct = String(req?.headers?.["content-type"]);

        // multipart/form-data is used for requests with a file. In that request, args are a string and need to be JSON parsed
        if( ct.startsWith("multipart/form-data") ){
            if( this.body.args ){
                try{
                    this.body.args =  JSON.parse(this.body.args);
                }catch(err){
                    this.body.args = [];
                }
            }
        }

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

            // amountPaid is in whole SEK. We have to convert it to cents.
            if( amountPaid )
                await this.user.addShopCredit(amountPaid*100, conn);
            
            await DB.finalizeTransaction(conn); // Finalizes and releases


            return this.user.getOut(true);

        }catch(err){
            
            await DB.rollbackTransaction(conn);
            throw err; // Rethrow and let the parent catch handle it.
            
        }        

    }

    /*
        Gets an array of active shop items
        Note: Admins also get inactive shop items
    */
    async pvtGetShopItems(){

        const isAdmin = this.user.isAdmin();
        const out = await ShopItem.getAll(isAdmin);
        return out.map(el => el.getOut(isAdmin));
        
    }
    
    async pvtPurchaseShopItem( itemID ){
        
        itemID = Math.trunc(itemID);
        if( itemID < 1 )
            throw new Error("Invalid item ID. Contact an administrator.");

        const item = await ShopItem.get(itemID, 1);
        if( !item || !item.active )
            throw new Error("Produkten hittades inte.");

        if( item.cost > this.user.shop_credit )
            throw new Error("För lite kiosk-kredit på kontot. Har du nyligen överfört pengar måste du trycka på refresh-knappen på förstasidan.");

        // Use a MYSQL transaction in case something fails
        const conn = await DB.getTransactionConnection();
        try{
            
            await this.user.subShopCredit(item.cost, conn);
            await item.subtractStock(conn);
            const tx = await ShopTransaction.create(item.id, this.user.id, item.cost, conn);
            if( !tx.id )
                throw new Error("Unable to create receipt, contact an admin.");
            
            await DB.finalizeTransaction(conn);

        }catch(err){
            
            await DB.rollbackTransaction(conn);
            throw err; // Rethrow and let the parent catch handle it.

        }

        return true;

    }

    /* 
        Gets your purchase history in the past year.
        returns {
            purchases : [
                ShopTransaction0,1,2...
            ],
            items : [
                ShopItem1,2,3... Note: Includes inactive.
            ]
        }
    */
    async pvtGetPurchaseHistory(){

        const purchases = await ShopTransaction.getAllByUser(this.user);
        const items = new Map(); // Creates a map of unique items
        const purchaseData = purchases.map(el => {
            
            items.set(el.item, true);
            return el.getOut();

        });

        const boughtItems = await ShopItem.getMultipleById(Array.from(items.keys()));
        const purchaseItems = boughtItems.map(el => el.getOut());

        return {
            purchases : purchaseData,
            boughtItems : purchaseItems
        };


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
            cur = await ShopItem.get(id, 1);
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
        if( this.files[0] ){
            console.log("Todo: Handle upload of ", this.files[0]);
        }

        return cur.getOut(true);

    }


}


