import DB from "./DB.js";


export class ShopItem extends DB{

    static table = "shop_items";

    static TYPES = {
        FOOD : 'FOOD',
        DRINK : 'DRINK',
        MISC : 'MISC',
    };

    // Fields that are accepted as is using the admin REST entrypoint
    static ADMIN_SETTABLE = [
        'name', 'description', 'barcode', 'active', 'stock', 'cost', 'image', 'age_restriction', 'type', 'comment'
    ];

    constructor(){
        super(...arguments);

        this.name = "";
        this.description = "";
        this.barcode = "";
        this.active = 1;
        this.stock = 0;
        this.cost = 1500;   // ören
        this.image = "";
        this.age_restriction = 0;
        this.type = ShopItem.TYPES.FOOD;
        this.comment = '';          // Admin-only comment

        this.load(...arguments);
    }

    // Returns data to the front end
    getOut( admin = false ){

        const out = {
            id : this.id,
            name : this.name,
            description : this.description,
            barcode : this.barcode,
            active : this.active,
            cost : this.cost,
            image : this.image,
            age_restriction : this.age_restriction
        };
        if( admin ){
            
            out.stock = this.stock;
            out.comment = this.comment;

        }
        return out;

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

    // Saves changes or inserts a new one if this.id = 0
    async saveOrInsert(){

        this.sanitize();

        if( !this.id ){
            const q = await this.query("INSERT INTO "+this.constructor.table+" (name) VALUES (?)", [this.name]);
            this.id = q.insertId;
        }

        await this.query("UPDATE "+this.constructor.table+" SET name=?, description=?, barcode=?, active=?, stock=?, cost=?, image=?, age_restriction=?, comment=?, type=? WHERE id=?", [
            this.name, this.description, this.barcode, this.active, this.stock, this.cost, this.image, this.age_restriction, this.comment, this.type, this.id
        ]);

    }

}

