import DbAsset from "./DbAsset.js";

export default class ShopItem extends DbAsset{

	static TYPES = {
        FOOD : 'FOOD',
        DRINK : 'DRINK',
        MISC : 'MISC',
    };
    static TYPES_SE = {
        FOOD : 'MAT',
        DRINK : 'DRICKA',
        MISC : 'BLANDAT',
    };

	constructor(...args){
		super(...args);

		this.name = "";
        this.description = "";
        this.barcode = "";
        this.active = 0;
        this.stock = 0;
        this.cost = 1500;   // ören
        this.age_restriction = 0;
        this.type = ShopItem.TYPES.FOOD;
        this.comment = '';          // Admin-only comment
		

		this.load(...args);
	}

    getTypeSE(){

        return this.constructor.TYPES_SE[this.type] || this.type;

    }
    
    getImage(){
        return '/media/uploads/shop/'+this.id+".jpg";
    }

	rebase(){}

}

