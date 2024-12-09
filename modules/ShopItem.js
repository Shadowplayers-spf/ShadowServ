import DB from "./DB.js";


export default class ShopItem extends DB{

    static table = "shop_items";

    static TYPES = {
        FOOD : 'FOOD',
        DRINK : 'DRINK',
        MISC : 'MISC',
    };

    // Fields that are accepted as is using the admin REST entrypoint
    static ADMIN_SETTABLE = [
        'name', 'description', 'barcode', 'active', 'stock', 'cost', 'age_restriction', 'type', 'comment'
    ];

    constructor(){
        super(...arguments);

        this.name = "";
        this.description = "";
        this.barcode = "";
        this.active = 0;
        this.stock = 0;
        this.cost = 1500;   // ören
        this.age_restriction = 0;
        this.type = ShopItem.TYPES.FOOD;
        this.comment = '';          // Admin-only comment

        this.load(...arguments);
    }

    // Returns data to the front end
    async getOut( admin = false ){

        const out = {
            id : this.id,
            name : this.name,
            description : this.description,
            active : this.active,
            cost : this.cost,
            age_restriction : this.age_restriction,
            type : this.type
        };
        if( admin ){
            
            out.barcode = this.barcode;
            out.stock = this.stock;
            out.comment = this.comment;

        }
        return out;

    }

    canBeSold(){
        return this.active && this.cost > 0;
    }

    // Makes sure we don't write bogus values to DB.
    sanitize(){

        this.name = String(this.name).trim();
        if( !this.name )
            this.name = "Unknown item";
        if( this.stock < 0 )
            this.stock = 0;
        if( this.cost < 100 )
            this.cost = 100;

        if( !this.constructor.TYPES[this.type] )
            this.type = this.constructor.TYPES.FOOD;

    }

    async addStock( amount = 0 ){

        amount = Math.trunc(amount);
        if( this.stock + amount < 0 )
            amount = -this.stock;

        if( amount )
            await this.query("UPDATE "+this.constructor.table+" SET stock=stock+? WHERE id=?", [
                amount, this.id
            ]);

    }

    // Saves changes or inserts a new one if this.id = 0
    async saveOrInsert(){

        this.sanitize();

        if( !this.id ){
            const q = await this.query("INSERT INTO "+this.constructor.table+" (name) VALUES (?)", [this.name]);
            this.id = q.insertId;
        }

        await this.query("UPDATE "+this.constructor.table+" SET name=?, description=?, barcode=?, active=?, stock=?, cost=?, age_restriction=?, comment=?, type=? WHERE id=?", [
            this.name, this.description, this.barcode, this.active, this.stock, this.cost, this.age_restriction, this.comment, this.type, this.id
        ]);

    }

    // Used with an SQL transaction to subtract stock. Safer than overwriting stock.
    async subtractStock( transaction ){
        
        await this.query("UPDATE "+this.constructor.table+" SET stock = stock-1 WHERE id=?", [this.id], transaction);
        this.stock -= 1;
        
    }

    /*
        Gets a list of all shop items 
    */
    static async getAll( includeInactive = false ){

        const filters = {};
        if( !includeInactive )
            filters.active = 1;

        return await this.get(filters);

    }

    // Gets all items specified by an array of IDs
    static async getMultipleById( ids = [] ){

        if( !Array.isArray(ids) )
            throw new Error("ID list for ShopItem invalid.");
        
        ids = ids.map(el => Math.trunc(el) || 0);
        const qs = ids.map(() => '?');
        const rows = await this.query("SELECT * FROM "+this.table+" WHERE ID IN ("+qs.join(',')+")", ids);
        return rows.map(el => new this(el));

    }


}

