import Inventory from "./classes/Inventory.js";
import User from "./classes/User.js";

/*
	This page is for layouts shared across multiple pages
*/
export default {

	// Basic template for displaying a product in a modal.
	// div is a div to attach the asset to
	productModal : ( page, div, prod ) => {
		const user = pm.user;

		const bg = page.make("div", "", ["shopBg"], div);
		
		bg.style.backgroundImage = "url('"+prod.getImage()+"')";

		const info = page.make("div", "", ["shopItemData"], div);
		
		page.make('h2', prod.name, [], info);
		
		if( prod.age_restriction )
			page.make('p', "+"+prod.age_restriction+" år", ["subtitle", "restricted"], info);
		
		page.make('p', prod.stock+' i lager', ['subtitle', (prod.stock > 0 ? 'cost' : 'restricted')], info);

		page.make('p', prod.description, ['desc'], info);

		let buyWrap = page.make("div", "", ["buyButton"], info);
		let buyButton = page.make('input', "", [], buyWrap);
		buyButton.type = 'button';
		const funded = prod.cost <= pm.user.shop_credit;
		buyButton.disabled = !funded;
		buyButton.value = 'Köp för '+(prod.cost/100)+'kr';
		
		buyButton.onclick = async () => {

			if( prod.cost > pm.user.shop_credit ){
				pm.error("addError", "För lite kioskkredit på kontot.");
				return false;
			}
			
			await pm.restReq("PurchaseShopItem", prod.id);
			
			const succ = page.make("div");
			page.make("h3", "Köpet Har Genomförts!", [], succ);
			page.make("div", String(prod.name).toUpperCase(), ["productBought", "center"], succ);
			pm.setModal(succ);
			pm.updateShopCredit();

		};
		
		// Admin functions
		if( user.isAdmin() ){
			
			page.make("hr", "", [], info);

			const form = page.make("form", "", ["admEdit"], info);
			
			const restock = page.make("input", "", ["restock"], form);
			restock.type = "number";
			restock.step = 1;
			restock.style.width = "8vmax";
			restock.value = Math.trunc(localStorage['admShopItem_'+prod.id]) || 10;
			
			const submit = page.make("input", "", [], form);
			submit.type = "submit";
			submit.value = "Fyll På";

			restock.style.display = submit.style.display = 'inline-block';

			const button = page.make("input", "", [], form);
			button.value = "Redigera";
			button.type = "button";
			button.dataset.href = "storeEdit/"+String(prod.id);

			form.onsubmit = async event => {
				event.preventDefault();
				
				const amt = Math.trunc(restock.value);
				await pm.restReq("AddStock", [prod.id, amt]);
				pm.setPage('store');

				localStorage['admShopItem_'+prod.id] = amt;

			};

		}

	},
	// Creates a modal that lets admins search and pick users
	userPickerModal : async (page, callback) => {

		// Would make sense to have MYSQL search users, but fuckit. Revise if we ever get more than 1000 users.
		let users = await pm.restReq("GetUsers");
        users = users.map(el => new User(el));
		const div = page.make("div", "", ["center", "userPicker"]);

		const form = page.make("form", "", ["userPicker"], div);
		const input = page.make("input", "", [], form);
		const submit = page.make("input", "", [], form);
		submit.type = "submit";
		submit.value = "Sök Användare";

		const results = page.make("div", "", [], div);
		
		const cb = event => {
			
			const id = Math.trunc(event.currentTarget.dataset.id);
			for( let user of users ){
				
				if( user.id === id ){
					
					pm.clearModal();
					callback(user);
					return;

				}

			}

		};

		form.onsubmit = event => {
			event.preventDefault();

			const searchString = input.value.trim().toLowerCase();
			const filtered = users.filter(el => el.nick.toLowerCase().includes(searchString));
			let out = [];
			for( let user of filtered ){
				
				const res = page.make("div", user.nick, ["searchResult", "section"]);
				res.dataset.id = user.id;
				res.onclick = cb;
				out.push(res);

			}
			if( !filtered.length )
				out = [page.make("div", "Inga Användare Hittades")];

			results.replaceChildren(...out);

		};


		pm.setModal(div);

	},
	// Div is where the modal gets attached
	// onChange is raised if something on the asset is changed, such as who has loaned it, it's raised with 1 arg which is the new asset data from the server
	assetModal : ( page, div, asset, onChange ) => {

		if( !(asset instanceof Inventory) )
			return;

		const bg = page.make("div", "", ["bg"], div);
		const loaned = asset.isLoaned();
		bg.style.backgroundImage = 'url('+asset.getImage()+')';
		
		page.make("h2", asset.name, [], div);
		page.make("p", 
			asset.ages + " | " + 
			asset.getLanguageReadable() +
			(loaned ? " | UTLÅNAD" : '') +
			(asset.complete && asset.complete !== Inventory.COMPLETION.full ? ' | '+asset.getCompletionText() : ''), 
			["subtitle"], div)
		;
		page.make("p", asset.description, [], div);

		if( !loaned && asset.isLoanable() ){
			
			const input = page.make("input", "", ["inline"], div);
			input.type = "button";
			input.value = "Låna Hem";
			input.onclick = async () => {
				
				if( input.disabled )
					return;
				input.value = "Lånar...";
				input.disabled = true;

				try{
					
					const newAsset = await pm.restReq("LoanItem", [asset.id]);
					if( onChange && newAsset )
						onChange(newAsset);
					
				}catch(err){
					pm.addError(err.message, false);
				}
				input.value = "Låna Hem";
				input.disabled = false;

			};

		}

		if( pm.user.isAdmin() ){

			if( loaned )
				page.make("p", "Utlånad till "+asset._holder.nick, ["loanedTo", "bold"], div);
			
			const edit = page.make("input", "", ["inline"], div);
			edit.type = "button";
			edit.value = "Redigera";
			edit.dataset.href = "assetEdit/"+asset.id;

		}

		// Return loaned items. Amins can return for other users.
		if( loaned && (pm.user.isAdmin() || pm.user.id === asset._holder) ){

			const input = page.make("input", "", ["inline"], div);
			input.type = "button";
			input.value = "Lämna Tillbaks";
			input.onclick = async () => {
				
				if( input.disabled )
					return;

				input.value = "Lämnar tillbaka...";
				input.disabled = true;

				try{
					
					const newAsset = await pm.restReq("ReturnItem", [asset.id]);
					if( onChange && newAsset )
						onChange(newAsset);
					
				}catch(err){
					pm.addError(err.message, false);
				}
				input.value = "Låna Hem";
				input.disabled = false;

			};

		}

	},

};

