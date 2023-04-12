const out = {};
out.setServer = function(server){
	this.server = server;
}
out.setRestToken = function(token){
	this.token = token;
};
out.run = async function( name, args = [] ){

	console.log(">> Unit test >> ", name, args);
	if( typeof this[name] === 'function' ){ 

		
		try{

			const out = await this[name](...args);
			console.log("Unit test result for "+name+" : ");
			console.log(out);

		}
		catch(err){
			console.error("Unit test failed: ", err);
		}

	}
	else{
		console.log("!! UNIT TEST MISSING !!");
	}

};


out.createSwishTransaction = function(amount, phone){

	return this.server.runRest({
        body : {
            task : 'CreateSwishTransaction',
            token : this.token,
            args : [amount, phone],
        }
    });

};

out.refreshTransactions = function(){

	return this.server.runRest({
        body : {
            task : 'RefreshTransactions',
            token : this.token,
            args : [],
        }
    });

};

out.getUser = function(){

	return this.server.runRest({
        body : {
            task : 'GetUser',
            token : this.token,
            args : [],
        }
    });
	

}

// Todo:
// pvtGetShopItems
// pvtPurchaseShopItem
// pvtGetPurchaseHistory
// admCreateShopItem


export default out;
