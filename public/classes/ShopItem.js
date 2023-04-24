import DbAsset from "./DbAsset.js";

export default class ShopItem extends DbAsset{

	static TYPES = {
        FOOD : 'FOOD',
        DRINK : 'DRINK',
        MISC : 'MISC',
    };

	constructor(...args){
		super(...args);

		this.name = "";
        this.description = "";
        this.barcode = "";
        this.active = 0;
        this.stock = 0;
        this.cost = 1500;   // ören
        this.image = "";
        this.age_restriction = 0;
        this.type = ShopItem.TYPES.FOOD;
        this.comment = '';          // Admin-only comment
		

		this.load(...args);
	}

	rebase(){}

}

