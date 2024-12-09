import Rest from "../classes/Rest.js";
import User from "../classes/User.js";
import ShopItem from "../classes/ShopItem.js";

let password = '';

export default class Scanner{

	text = '';
	userid = 0;
	page = 'login';
	user = new User();
	timer_autoLogout = null;
	timer_scanRst = null;
	timer_err = null;
	timer_purchase = null;

	initRest( task, args = []){
		return new Rest(task, args, {
			scanner : localStorage.token
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
		clearTimeout(this.timer_autoLogout);
		this.timer_autoLogout = setTimeout(this.logoutUser.bind(this), 600e3);
	}

	logoutUser(){
		this.user = new User();
		clearTimeout(this.timer_autoLogout);
		this.setPage("main");
	}

	async login( pw ){

		password = pw;
		const req = this.initRest("Login", [pw]); 
		try{

			const out = await req.run();
			if( out ){
				localStorage.token = out;
				this.setPage("main");
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

		if( localStorage.token ){

			const rest = this.initRest("ValidateToken");
			const out = await rest.run();
			console.log("Validate token result", out);
			if( out ){
				this.setPage("main");
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

				const user = await rest.run();
				this.user = new User(user);
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
		

	}

	async makePurchase( barcode ){

		clearTimeout(this.timer_purchase);
		document.querySelector("#purchaseSuccess").classList.toggle("hidden", true);

		const rest = this.initRest("MakePurchase", [this.user.card, barcode]);
		const out = await rest.run();
		if( out ){

			this.user.shop_credit = out.shop_credit;
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
