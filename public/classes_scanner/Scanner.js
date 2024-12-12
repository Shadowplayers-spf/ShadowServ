import Rest from "../classes/Rest.js";
import User from "../classes/User.js";
import ShopItem from "../classes/ShopItem.js";

export default class Scanner{

	text = '';
	userid = 0;
	logoutSec = 0;
	page = 'login';
	user = new User();
	timer_autoLogout = null;
	timer_scanRst = null;
	timer_err = null;
	timer_purchase = null;
	
	// Transaction history
	transactions = [];

	initRest( task, args = []){
		return new Rest(task, args, {
			scanner : localStorage.scanner_token || ''
		});
	}

	async setPage( page = 'login' ){

		this.page = page;
		document.querySelectorAll("#pages > div.page").forEach(
			el => el.classList.toggle("hidden", el.dataset.id !== page)
		);

		if( page === "user" ){
			this.drawUser();
			this.refreshUserTimeout();
		}

	}

	refreshUserTimeout(){

		clearInterval(this.timer_autoLogout);
		this.logoutSec = 60*2;
		this.timer_autoLogout = setInterval(() => {
			
			--this.logoutSec;
			document.querySelector("#pages > div[data-id=user] input.logout").value = 'Logga Ut ['+this.logoutSec+']';
			if( this.logoutSec <= 0 ){
				this.logoutUser();
			}

		}, 1e3);

	}

	logoutUser(){
		this.user = new User();
		this.transactions = [];
		clearInterval(this.timer_autoLogout);
		this.setPage("main");
	}

	// Root login
	onLoggedIn(){
		//document.querySelector("body").requestFullscreen();
	}

	async login( pw ){

		password = pw;
		const req = this.initRest("Login", [pw]); 
		try{

			const out = await req.run();
			if( out ){
				localStorage.scanner_token = out;
				this.setPage("main");
				this.onLoggedIn();
			}
		}catch(err){
			this.handleError(err);
		}
	}

	async begin(){

		const loginForm = document.querySelector("#login");
		
        loginForm.onsubmit = async event => {
            event.preventDefault();
            this.login(loginForm.querySelector("input[name=password]").value);
		};

		if( localStorage.scanner_token ){

			const rest = this.initRest("ValidateToken");
			const out = await rest.run();
			if( out ){
				this.setPage("main");
				this.onLoggedIn();
			}

		}

		window.onkeydown = event => {
			
			clearTimeout(this.timer_scanRst);
			if( event.key === "Enter" ){
				this.onEnter();
			}
			else if( event.key && event.key.length === 1 ){
				this.text += event.key;
				this.timer_scanRst = setTimeout(this.onEnter.bind(this), 100);
			}

		};

		document.querySelector("#pages > div[data-id=user] input.logout").onclick = this.logoutUser.bind(this);

		const swishButton = document.querySelector("#add-credits input[type=submit]");
		
		// Add credits
		document.querySelector("#add-credits").onsubmit = async event => {
			event.preventDefault();
			swishButton.value = 'Lägger till...';
			swishButton.disabled = true;
			try{
				await this.addShopCredit(document.querySelector("#add-credits input[name=amount]").value);
				swishButton.value = 'Klart!';
			}catch(err){
				this.handleError(err);
				swishButton.value = 'Fel uppstod!';
			}
			
			document.querySelectorAll("#add-credits input").forEach(el => el.blur());

			setTimeout(() => {
				swishButton.disabled = false;
				swishButton.value = 'Jag har swishat!';
			}, 3e3);

		};

	}

	async onEnter(){

		const text = this.text;
		this.text = '';
		
		// Log in user
		if( this.page === "main" ){
			
			if( isNaN(text) || text.length < 3 )
				return;

			const rest = this.initRest("GetUser", [text]);
			try{

				const data = await rest.run();
				this.user = new User(data.user);
				this.transactions = data.transactions;
				this.setPage("user");

			}catch(err){
				this.handleError(err);
			}

		}
		else if( this.page === "user" ){

			// Log out if scanning ID again
			if( parseInt(text) === this.user.card ){
				this.logoutUser();
				return;
			}

			if( document.activeElement?.tagName === "INPUT" )
				return;
			
			if( text.length < 5 )
				return;

			try{
				await this.makePurchase(text);
			}catch(err){
				this.handleError(err);
			}


		}


	}


	drawUser(){

		document.querySelector("#pages > div[data-id=user] em.credits").innerText = this.user.getCreditSek();
		let trs = [];
		for( let transaction of this.transactions ){
			const tr = document.createElement("tr");
			trs.push(tr);
			tr.classList.add(transaction.amount < 0 ? "purchase" : "swish");
			
			const date = new Date(transaction.date);
			const secondsAgo = Math.trunc(new Date().getTime() - date.getTime())/1e3;
			let label = 'Just Nu';
			if( secondsAgo > 60 )
				label = Math.floor(secondsAgo/60) + ' minut'+(Math.floor(secondsAgo/60) > 1 ? 'er' : '')+' sedan';
			if( secondsAgo > 3600 )
				label = Math.floor(secondsAgo/3600) + ' timm'+(Math.floor(secondsAgo/3600) > 1 ? 'ar' : 'e')+' sedan';
			if( secondsAgo > 86400 )
				label = Math.floor(secondsAgo/86400) + ' dag'+(Math.floor(secondsAgo/86400) > 1 ? 'ar' : '')+' sedan';

			let td = document.createElement("td");
			td.innerText = label;
			tr.append(td);

			td = document.createElement("td");
			td.innerText = transaction.product_name;
			tr.append(td);

			td = document.createElement("td");
			td.style.fontStyle = "italic";
			td.innerText = transaction.amount/100 +" kr";
			tr.append(td);

			td = document.createElement("td");
			td.innerText = transaction.balance_after/100 + " kr";
			tr.append(td);

		}

		document.querySelector("#pages > div[data-id=user] table.logItems tbody").replaceChildren(...trs);

	}

	async makePurchase( barcode ){

		clearTimeout(this.timer_purchase);
		document.querySelector("#purchaseSuccess").classList.toggle("hidden", true);

		const rest = this.initRest("MakePurchase", [this.user.card, barcode]);
		const out = await rest.run();
		if( out ){

			this.user.shop_credit = out.shop_credit;
			this.transactions = out.transactions;
			this.refreshUserTimeout();
			this.drawUser();
			const asset = new ShopItem(out.asset);

			document.querySelector("#purchaseSuccess span.product").innerText = asset.name;
			document.querySelector("#purchaseSuccess span.price").innerText = asset.cost/100;
			document.querySelector("#purchaseSuccess > div.content").style.backgroundImage = `url(${asset.getImage()})`;
			document.querySelector("#purchaseSuccess").classList.toggle("hidden", false);

			this.timer_purchase = setTimeout(() => {
				document.querySelector("#purchaseSuccess").classList.toggle("hidden", true);
			}, 6e3);


		}

	}

	async addShopCredit( amount ){
		
		amount = Math.trunc(amount);
		if( amount < 1 ){
			throw new Error("Felaktig summa.");
		}
		const rest = this.initRest("AddCredits", [this.user.card, amount]);
		const out = await rest.run();
		if( out ){
			this.user.shop_credit = out.shop_credit;
			this.transactions = out.transactions;
			this.refreshUserTimeout();
			this.drawUser();
			document.querySelector("#add-credits input[name=amount]").value = '';
		}

	}

	handleError(err){

		const msg = err.message ? err.message : err;
		console.error(msg);
		const alert = document.getElementById("alert");
		alert.innerText = msg;
		alert.classList.toggle("hidden", false);
		clearTimeout(this.timer_autoHideError);
		this.timer_autoHideError = setTimeout(() => alert.classList.toggle("hidden", true), 5000);

	}


}
