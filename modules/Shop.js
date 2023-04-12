import DB from "./DB.js";
import { Component } from "./ShadowServ.js";

export default class Shop extends Component{


    constructor(){
        super(...arguments);

        this.items = [];    // Collection of ShopItem
        

    }

}


