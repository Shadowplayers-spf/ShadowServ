import DB from "./DB.js";
/*
	Transaction log

*/
export default class ShopTransaction extends DB{

    static table = "shop_transactions";

    constructor(){
        super(...arguments);

        this.item = 0;
        this.user = 0;

        this.load(...arguments);
    }

	

}

