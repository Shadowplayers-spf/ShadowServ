import DB from "./DB.js";
import User from "./User.js";
import ShopItem from "./ShopItem.js";

export default class ScannerTransaction extends DB{

    static table = "scanner_transactions";


    constructor(){
        super(...arguments);

		this.user = 0;
		this.date = '';
		this.amount = 0; 			// ören, negativt vid inköp, positivt vid försäljning
		this.balance_after = 0; 	// User balance after transaction
		this.product = 0;			// Product ID
		this.product_name = '';

        this.load(...arguments);

    }

    // Returns data to the front end
    async getOut( admin = false ){

        const out = {
            id : this.id,
			date : this.date,
			amount : this.amount,
			balance_after : this.balance_after,
			product : this.product,
			product_name : this.product_name,
        };
        return out;

    }

	static async getByUser( user, limit = 100 ){

		let query = "SELECT * FROM "+ScannerTransaction.table+" WHERE user=? ORDER BY date DESC";
		const params = [user.id];
		if( limit > 0 ){
			query += " LIMIT ?";
			params.push(limit);
		}

		const rows = await this.query(query, params);
		return rows.map(el => new this(el));

	}

	// returns remaining credit on success. Product is only needed on subtract
	static async create( user, amount, product ){
		
		// Add shop credit doesn't need a product
		if( amount > 0 )
			product = 0;
		
		if( !(user instanceof User) )
			throw new Error("Expected user object in ScannerTransaction.");
		if( amount < 0 && !(product instanceof ShopItem) )
			throw new Error("Expected product object in ScannerTransaction.");
		if( isNaN(amount) )
			throw new Error("Expected numeric amount in ScannerTransaction.");
		if( Math.trunc(amount) !== amount )
			throw new Error("Expected integer amount in ScannerTransaction.");

		let productName = 'SWISH';
		if( product instanceof ShopItem )
			productName = product.name;

		const conn = await DB.getTransactionConnection();
		try{

			if( amount < 0 )
				await user.subShopCredit(Math.abs(amount), conn);
			else
				await user.addShopCredit(amount, conn);
			
			// Insert one of these
			await this.query("INSERT INTO "+ScannerTransaction.table+" (user, amount, product, balance_after, product_name) VALUES (?,?,?,?,?)", [
				user.id, amount, (product ? product.id : 0), user.shop_credit, productName
			], conn);
			await DB.finalizeTransaction(conn); // Finalizes and releases
			
        }catch(err){
            
			console.error(err);
            await DB.rollbackTransaction(conn);
            throw err; // Rethrow and let the parent catch handle it.
            
        }

		await user.refreshShopCredit();
		return user.shop_credit;


	}



}

