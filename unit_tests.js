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
			console.dir(out, {depth:20});

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
	

};

out.getShopItems = function(){

	return this.server.runRest({
        body : {
            task : 'GetShopItems',
            token : this.token,
            args : [],
        }
    });

};


out.purchaseShopItem = function( item ){

	return this.server.runRest({
        body : {
            task : 'PurchaseShopItem',
            token : this.token,
            args : [item],
        }
    });

};

out.getPurchaseHistory = function(){

	return this.server.runRest({
        body : {
            task : 'GetPurchaseHistory',
            token : this.token,
            args : [],
        }
    });

}

out.createShopItem = function(id, data){

	return this.server.runRest({
        body : {
            task : 'CreateShopItem',
            token : this.token,
            args : [id, data],
        }
    });

}


export default out;
