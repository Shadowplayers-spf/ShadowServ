import DbAsset from "./DbAsset.js";

export default class User extends DbAsset{

    constructor( data ){
        super(data);

        this.id = 0;
        this.nick = "";
        this.member = 0;
        this.privilege = 0;
        this.created = "";
        this.updated = "";
        this.session_token = "";
        this.shop_credit = 0;       // Öre

        this.load(data);
    }

    exists(){
        return this.id > 0;
    }

    rebase(){

    }

    getCreditSek(){
        return Math.trunc(this.shop_credit/100);
    }

    isAdmin(){
        return this.privilege >= 10;
    }
    

}


