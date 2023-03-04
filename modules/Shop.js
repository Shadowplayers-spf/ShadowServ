import DB from "./DB.js";
import { Component } from "./ShadowServ.js";

export default class Shop extends Component{


    constructor(){
        super(...arguments);

        this.items = [];    // Collection of ShopItem
        

    }

}

export class ShopItem extends DB{

    static table = "shop_items";

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




    }

}
