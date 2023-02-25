console.log("Initializing...");
import Config from './config.js';
import ShadowServ from './modules/ShadowServ.js';
import Ebas from './modules/Ebas.js';
import DB from './modules/DB.js';
import { ShopItem } from './modules/Shop.js';

(async () => {
    
    try{
        await DB.begin(Config.mysql_user, Config.mysql_pass, Config.mysql_db);
    }
    catch(err){
        console.error("Failed to connect to MYSQL");
        console.error(err);
        process.exit();
    }
    const server = new ShadowServ();
    server.begin();
    server.addComponent("ebas", new Ebas(Config.ebas_id, Config.ebas_key));

    // Testing
    const item = new ShopItem();
    const out = await ShopItem.get(1);
    console.log("Item", out);
    
})();

