console.log("Initializing...");
import Config from './config.js';
import ShadowServ from './modules/ShadowServ.js';
import Ebas from './modules/Ebas.js';
import DB from './modules/DB.js';
import Swish from './modules/Swish.js';
import UnitTests from './unit_tests.js';

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
    Swish.begin(false); // Set to true for live


    /* Unit tests*/
    UnitTests.setServer(server);
    UnitTests.setRestToken('9a0acbedfe7b5fd40d65fb16d249cec4ef9e733ccc063355025dc60c56eca11e07ff7d03f675f1ebf58e3ea368833804'); // Set to login token of user you want to test

    // Create a swish transaction
    //UnitTests.run('createSwishTransaction', [100, '46709802111']);
    
    // Get user data
    await UnitTests.run('getUser');

    // Refresh a swish transaction for a user
    await UnitTests.run('refreshTransactions');
    
    
})();

