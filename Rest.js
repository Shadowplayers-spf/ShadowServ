import User from './modules/User.js';
import Swish from './modules/Swish.js';
import SwishTransaction from './modules/SwishTransaction.js';
import DB from './modules/DB.js';
import { ShopItem } from './modules/ShopItem.js';
import ShopTransaction from './modules/ShopTransaction.js';
import sharp from 'sharp';
import Inventory from './modules/Inventory.js';
import InventoryLoanLog from './modules/InventoryLoanLog.js';
import config from './config.js';
import AdminLog from './modules/AdminLog.js';


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
    
        try{
            // Public tasks
            let fn = "pub"+task;
            if( typeof this[fn] === "function" ){
                return await this[fn].call(this, ...args);
            }
            
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
        }
        catch( err ){
            throw err; // rethrow because async
        }       

        throw new Error("Task invalid: "+task);

    }

    // Gets userdata for active user
    async pubGetUser(){

        return await this.user.getOut(true);

    }
    
    

    // Fetches userdata and generates a new 
    async pubLogin( nick, password ){

        const att = await this.user.logIn(nick, password);
        if( !att ){
            throw new Error("Felaktig användare/lösenord. Försök igen!");
        }
        const out = await this.user.getOut(true);
        return out;
        
    }








    /* Pvt: LOGIN REQUIRED */
    async pvtLogout(){
        
        await this.user.destroyToken(true);
        this.user = new User();
        return await this.user.getOut(true);

    }

    /*
        Updates the current user's password. Pre must match the previous password. Post is the new password to be set
    */
    async pvtChangePassword( pre, post ){

        const cur = this.user.validatePassword(pre);
        if( !cur )
            throw new Error("Nuvarande lösenord stämmer inte");
        post = this.user.testPasswordSecurity(post); // Throws an error if it doesn't pass
        await this.user.setNewPassword(post);

        return true;

    }

    /* 
        Amount is in SEK
        phone is the phone nr
        returns true on success
    */
    async pvtCreateSwishTransaction( amount, phone ){

        amount = Math.trunc(amount);

        const uuid = await Swish.createInvoice(this.user.id, phone, amount); // True = live
        await SwishTransaction.create(this.user, uuid, amount);
        
        return true;

    }

    // Returns a user object with updated credits.
    async pvtRefreshTransactions(){

        const conn = await DB.getTransactionConnection();
        try{

            const pending = await SwishTransaction.getPendingByUser(this.user);
            // Nothing to do
            if( !pending.length )
                return await this.user.getOut(true);

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


            return await this.user.getOut(true);

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
        const ret = out.map(el => el.getOut(isAdmin));
        return await Promise.all(ret);

    }
    
    /*
        Purchase an item from the shop using shop credit
        Returns true on success
    */
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
            ],
            swish : [
                swishtransactions...
            ]
        }
    */
    async pvtGetPurchaseHistory(){

        const purchases = await ShopTransaction.getAllByUser(this.user);
        const items = new Map(); // Creates a map of unique items
        const purchaseData = await Promise.all(purchases.map(el => {
            
            items.set(el.item, true);
            return el.getOut();

        }));

        let purchaseItems = [];
        if( items.size ){
            const boughtItems = await ShopItem.getMultipleById(Array.from(items.keys()));
            purchaseItems = await Promise.all(boughtItems.map(el => el.getOut()));
        }

        const swish = await SwishTransaction.getPaidByUser(this.user);

        
        const out = {
            purchases : purchaseData,
            boughtItems : purchaseItems,
            swishTransactions : await Promise.all(swish.map(el => el.getOut()))
        };
        return out;

    }

    /*
        Takes a barcode and returns if it exists
        On success, returns:
        {
            type : "ShopItem" / "Inventory",
            data : (obj)asset_data
        }
    */
    async pvtBarcodeScanned( code ){
        
        code = String(code);
        // First check if a product exists
        let item = await ShopItem.get({barcode : code}, 1);
        if( item?.exists() && item.active )
            return {
                type : 'ShopItem',
                data : await item.getOut()
            };


        // Then try inventory
        item = await Inventory.get({barcode : code}, 1);
        if( item?.exists() && item.active )
            return {
                type : 'Inventory',
                data : await item.getOut()
            };
            
        
        throw new Error("Streckkoden hittades inte. Försök igen!");

    }


    /*
        Returns
        {out : (arr)enabled_Inventory}
    */
    async pvtGetAssets(){

        const isAdmin = this.user.isAdmin();
        const out = await Inventory.getAll(isAdmin);
        return await Promise.all(out.map(el => el.getOut(isAdmin, this.user.id)));

    }

    /* Loan an item home */
    async pvtLoanItem( itemID ){

        const loaned = await Inventory.getLoanedByUser();
        if( loaned.length >= config.max_loanable )
            throw new Error("Du har lånat för många saker. Lämna in några för att låna mer!");

        itemID = Math.trunc(itemID);
        if( !itemID )
            throw new Error("Felaktigt ID");

        const asset = await Inventory.get(itemID, 1);
        if( !asset )
            throw new Error("Prylen hittades inte.");

        if( asset.holder > 0 )
            throw new Error("Prylen är redan utlånad.");
        
        if( !asset.loanable )
            throw new Error("Prylen går ej att låna.");

        const att = await asset.setHolder(this.user.id);
        if( !att )
            throw new Error("Utlåningen misslyckades");

        InventoryLoanLog.create(this.user, asset, InventoryLoanLog.types.loaned);
        return await asset.getOut(this.user.isAdmin(), this.user.id);

    }

    async pvtReturnItem( itemID ){
        itemID = Math.trunc(itemID);
        if( !itemID )
            throw new Error("Felaktigt ID");

        const asset = await Inventory.get(itemID, 1);
        if( !asset )
            throw new Error("Prylen hittades inte");
        
        const holder = asset.holder;
        
        // admins can return other peoples items
        if( holder !== this.user.id && !this.user.isAdmin() )
            throw new Error("Prylen är inte utlånad till dig?");
        
        const att = await asset.resetHolder();
        if( !att )
            throw new Error("Tilbakalämningen misslyckades");

        if( this.user.isAdmin() && holder !== this.user.id ){
            
            try{
                AdminLog.create(this.user, AdminLog.TYPES.loanEdit, {holder : holder}, {holder : asset.holder});
            }catch(err){
                console.error("Failed to make admin log", err);
            }
        }

        InventoryLoanLog.create(this.user, asset, InventoryLoanLog.types.returned);
        return await asset.getOut(this.user.isAdmin(), this.user.id);

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
        
        const pre = new ShopItem(cur);

        // Update fields
        for( let field of ShopItem.ADMIN_SETTABLE ){
            
            if( data.hasOwnProperty(field) )
                cur[field] = data[field];

        }
        await cur.saveOrInsert();

        // Admin log
        try{
            AdminLog.create(this.user, AdminLog.TYPES.shopItemEdit, pre, cur);
        }catch(err){
            console.error("Failed to make admin log", err);
        }

        // Handle image upload after making sure it's inserted
        let file;
        if( this.files[0] )
            file = this.files[0].path;
        else if( data.imgURL )
            file = new ArrayBuffer(data.imgURL, "base64");
        if( file ){
            try{
                await sharp(file)
                .resize({
                    width:512,
                    height:512,
                    withoutEnlargement : true
                })
                .jpeg({
                    quality : 60
                })
                .toFile('public/media/uploads/shop/'+cur.id+'.jpg');
                
            }catch(err){
                console.error("Unable to upload file", err);
            }

        }

        return await cur.getOut(true);

    }

    /*
        Creates or updates an asset (games etc we offer)
        id : id of the item to alter. 0 creates a new one
        data can contain any of the keys defined in Inventory. Name is required if you're creating a new one.
    */
    async admCreateAsset( id, data = {} ){

        if( typeof data !== "object" )
            throw new Error("Data invalid for CreateAsset");

        id = Math.trunc(id);
        
        if( !id && !String(data.name).trim() )
            throw new Error("Ett namn krävs för varje enhet.");

        let cur = new Inventory();
        // Update an existing one
        if( id > 0 ){
            
            cur = await Inventory.get(id, 1);
            if( !cur )
                throw new Error("Enheten hittades inte");

        }

        const pre = new Inventory(cur);

        // Update fields
        for( let field of Inventory.ADMIN_SETTABLE ){
            
            if( data.hasOwnProperty(field) )
                cur[field] = data[field];

        }
        await cur.saveOrInsert();

        try{
            AdminLog.create(this.user, AdminLog.TYPES.inventoryEdit, pre, cur);
        }catch(err){
            console.error("Failed to create admin log", err);
        }


        let file;
        if( this.files[0] )
            file = this.files[0].path;
        // Handle image upload after making sure it's inserted
        if( file ){
            
            try{
                await sharp(file)
                .resize({
                    width:512,
                    height:512,
                    withoutEnlargement : true
                })
                .jpeg({
                    quality : 60
                })
                .toFile('public/media/uploads/inventory/'+cur.id+'.jpg');
                
            }catch(err){
                console.error("Unable to upload file", err);
            }

        }

        return await cur.getOut(true);

    }

    /*
        Adds or subtracts from stock of an item by id
    */
    async admAddStock( id, amount = 1 ){
        id = Math.trunc(id);

        const item = await ShopItem.get(id);
        if( !item )
            throw new Error("Item not found");

        const pre = new ShopItem(item);
        await item.addStock(amount);
        try{
            AdminLog.create(this.user, AdminLog.TYPES.inventoryEdit, pre, item);
        }catch(err){
            console.error("Admin long failed to create", err);
        }
        return true;

    }

    /*
        Get a list of users in nick ascending order
    */
    async admGetUsers( start = 0, limit = 0 ){

        const users = await User.getAll(start, limit);
        return await Promise.all(users.map(el => el.getOut(true)));

    }

    /*
        Save user settings. User must have a lower privilege than the admin
        Returns the user object after changes have been applied
    */
    async admSaveUserSettings( userid, data = {} ){

        const user = await User.get({deleted:0, id:userid}, 1);
        if( !user || !user.exists() )
            throw new Error("User not found");
        if( user.privilege >= this.user.privilege )
            throw new Error("Can't edit user with equal or higher privilege");
        
        const pre = new User(user);
        await user.modify(this.user, data);
        try{
            AdminLog.create(this.user, AdminLog.TYPES.userEdit, pre, user);
        }catch(err){
            console.error("Failed to make admin log", err);
        }
        return await user.getOut();
        
    }

    /*
        Generates a new password for a user. User has to have a lower privilege than the admin
        Returns: {
            password : (str)password
        }
    */
    async admGenerateUserPassword( userid ){

        const user = await User.get({deleted:0, id:userid}, 1);
        if( !user || !user.exists() )
            throw new Error("User not found");
        if( user.privilege >= this.user.privilege )
            throw new Error("Can't edit user with equal or higher privilege");

        
        const passwd = await user.generateRandomPassword();
        return {
            password : passwd
        };

    }

    /*
        Deletes a user. User must have a lower privilege than the admin.
    */
    async admDeleteUser( userid ){

        const user = await User.get({deleted:0, id:userid}, 1);
        if( !user || !user.exists() )
            throw new Error("User not found");
        if( user.privilege >= this.user.privilege )
            throw new Error("Can't delete user with equal or higher privilege");
        try{
            AdminLog.create(this.user, AdminLog.TYPES.userDelete, user, {id:user.id});
        }catch(err){
            console.error("Failed to make admin log", err);
        }
        await user.delete();
        return true;

    }

    /*
    
    */
    async admRegister( nick, password, discord = "" ){

        nick = String(nick).trim();
        password = String(password);
        discord = String(discord).trim();

        const user = new User();

        // The rest is handled by User
        await user.register(nick, password, discord);

        const out = await this.user.getOut(true);
        return out;

    }

}


