/*
	This page is for layouts shared across multiple pages
*/
export default {

	// Basic template for displaying a product in a modal.
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

	}

};

