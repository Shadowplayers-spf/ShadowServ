import DbAsset from "./DbAsset.js";

export default class Device extends DbAsset{

	static TYPES = {
		SmartSwitch : 'SmartSwitch',
	};

	constructor(...args){
		super(...args);

		this.name = "";
		this.status = {};
		this.type = "";
		this.updated = "";
		this.last_seen = 0;
		this.created = "";
		this.config = {};
		this.active = false;
		
		this.load(...args);
	}

	rebase(){}
	
	getDashDiv(){

		let div = document.createElement("div");
		div.classList.add("device");
		div.dataset.id = this.id;

		let el = document.createElement("span");
		div.appendChild(el);
		el.classList.add("name");
		el.innerText = this.name;
		
		el = document.createElement("span");
		div.appendChild(el);
		el.classList.add("status");
		let text = '';
		if( this.type === this.constructor.TYPES.SmartSwitch ){
			text = this.status.on ? 'ON' : 'OFF';
			if( !this.status.on )
				div.classList.add("red");
		}
		
		el.innerText = text;

		console.log(this);


		return div;

	}

	getWeekSelect( defaultVal = 0 ){
		const select = document.createElement("select");
		select.name = "day";
		select.classList.add("inline");
		const days = ['Måndag', 'Tisdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lördag', 'Söndag'];
		for( let i = 0; i < 7; i++ ){
			const opt = document.createElement("option");
			opt.value = i;
			opt.innerText = days[i];
			opt.selected = defaultVal === i;
			select.appendChild(opt);
		}

		return select;
	}

	getHourSelect( defaultVal = 0 ){
		const select = document.createElement("select");
		select.name = "hour";
		select.classList.add("inline");
		for( let i = 0; i < 24; i++ ){
			const opt = document.createElement("option");
			opt.value = i;
			opt.innerText = String(i).padStart(2, '0');
			opt.selected = defaultVal === i;
			select.appendChild(opt);
		}

		return select;
	}

	getScheduleDiv( day, hour ){

		day = day || 0;
		hour = hour || 0;
		const scheduleDiv = document.createElement("div");
		scheduleDiv.classList.add("scheduleItem");

		const daySelect = this.getWeekSelect(day);
		scheduleDiv.appendChild(daySelect);

		let span = document.createElement("span");
		scheduleDiv.appendChild(span);
		span.innerText = ' Kl.';

		const hourSelect = this.getHourSelect(hour);
		scheduleDiv.appendChild(hourSelect);
		
		let remButton = document.createElement("input");
		remButton.type = "button";
		remButton.value = "X";
		remButton.classList.add("remove", "inline");
		scheduleDiv.appendChild(remButton);
		remButton.onclick = () => {
			scheduleDiv.remove();
		};
		return scheduleDiv;

	}

	getModal( pm ){

		// Build a modal
		const form = document.createElement("form");
		
		const name = document.createElement("input");
		name.name = "name";
		name.value = this.name;
		form.appendChild(name);

		let label = document.createElement("label");
		form.appendChild(label);
		let span = document.createElement("span");
		label.appendChild(span);
		span.innerText = "Aktiv ";
		const active = document.createElement("input");
		active.type = "checkbox";
		active.name = "active";
		active.checked = Boolean(this.active);
		label.appendChild(active);

		if( this.type === this.constructor.TYPES.SmartSwitch ){

			form.appendChild(document.createElement("br"));
			span = document.createElement("span");
			span.innerText = "Ladda 6 timmar varje vecka:";
			form.appendChild(span);

			let schedule = document.createElement("div");
			form.appendChild(schedule);
			let arr = this.config.weekly;
			if( !Array.isArray(arr) )
				arr = [];
			for( let evt of arr ){
				schedule.appendChild(this.getScheduleDiv(evt.day, evt.hour));
			}

			let addButton = document.createElement("input");
			addButton.type = "button";
			addButton.value = "+";
			form.appendChild(addButton);
			addButton.onclick = () => {
				schedule.appendChild(this.getScheduleDiv());
			};

		}


		const submit = document.createElement("input");
		submit.type = "submit";
		submit.value = "Spara";
		form.appendChild(submit);

		if( this.type === this.constructor.TYPES.SmartSwitch ){

			form.appendChild(document.createElement("br"));
			
			let onOff = {
				turnOff : document.createElement("input"),
				turnOn : document.createElement("input")
			};
			
			const shouldTurnOff = this.config.override > Date.now()-3600e3*6;
			const turnOff = onOff.turnOff;
			turnOff.classList.toggle("hidden", !shouldTurnOff);
			turnOff.type = "button";
			turnOff.value = "Avbryt Ladda Nu";
			form.appendChild(turnOff);
			turnOff.onclick = async () => {
				
				if( await pm.restReq("SetDeviceConf", [this.id, {
					config : {override:0}
				}]) ){
					onOff.turnOff.classList.toggle("hidden", true);
					onOff.turnOn.classList.toggle("hidden", false);
				}
			};
			
			

			const turnOn = onOff.turnOn;
			turnOn.classList.toggle("hidden", shouldTurnOff);
			turnOn.type = "button";
			turnOn.value = "Ladda Nu 6 Timmar";
			form.appendChild(turnOn);
			turnOn.onclick = async () => {

				if( await pm.restReq("SetDeviceConf", [this.id, {
					config : {override:Date.now()}
				}]) ){
					onOff.turnOn.classList.toggle("hidden", true);
					onOff.turnOff.classList.toggle("hidden", false);
				}
				
			};

			

		}
		
		form.onsubmit = async event => {
			event.preventDefault();
			
			let data = {
				name: name.value,
				active: active.checked,
				config : {
					weekly : [],
				}
			};
			
			let weeklyDivs = form.querySelectorAll(".scheduleItem");
			for( let div of weeklyDivs ){
				data.config.weekly.push({
					day: Math.trunc(div.querySelector("select[name='day']").value),
					hour: Math.trunc(div.querySelector("select[name='hour']").value)
				});
			}
			
			clearTimeout(submit._timeout);
			submit.value = 'Sparar...';
			if( await pm.restReq("SetDeviceConf", [this.id, data]) ){
				submit.value = 'Klart!';
				clearTimeout(submit._timeout);
				submit._timeout = setTimeout(() => {
					submit.value = 'Spara';
				}, 2000);
			}
			else{
				submit.value = 'Spara';
			}
			


		}



		return form;

	}


}

