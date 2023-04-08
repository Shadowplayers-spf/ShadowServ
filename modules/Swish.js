import https from 'https';
import fs from 'fs';
import axios from 'axios';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
import Config from '../config.js';
import crypto from 'crypto';

export default class Swish{

	constructor( live = false ){
		
		this.live = live;
		this.spSwishNumber = live ? Config.swishNumber : '1234679304';
		this.certFilePub = live ? 'public.pem' : 'Swish_Merchant_TestCertificate_1234679304.pem';
		this.certFilePvt = live ? 'private.key' : 'Swish_Merchant_TestCertificate_1234679304.key';
		
		this.agent = new https.Agent({
			cert: fs.readFileSync(__dirname+'/../certs/'+this.certFilePub),
			key: fs.readFileSync(__dirname+'/../certs/'+this.certFilePvt),
			ca: fs.readFileSync(__dirname+'/../certs/Swish_TLS_RootCA.pem')
		});
		this.client = axios.create({
			httpsAgent : this.agent
		});

	}


	/*
		Creates a Swish invoice.
		Returns the transaction UUID if successful.
	*/
	async createInvoice( userID, phone, amount = 10 ){

		userID = String(userID);
		phone = String(phone);
		amount = Math.trunc(amount);
		if( amount < 10 )
			throw new Error("Minsta betalning är 10 kr");
		if( amount > 500 )
			throw new Error("Högsta betalning är 500 kr");
		
		const uuid = crypto.randomBytes(16).toString('hex').toUpperCase();
		// Remove +
		if( phone.charAt(0) === '+' )
			phone = phone.substring(1);
		// Swish requires country code, so replace 0 with 46
		if( phone.charAt(0) === '0' )
			phone = "46"+phone.substring(1);
		
		const data = {
			payeePaymentReference : userID,
			callbackUrl : 'https://shadowplayers.com/swishcallback', // Note: NOT USED. We use a refresh button since the server isn't public.
			payerAlias : String(phone),
			payeeAlias : this.spSwishNumber,
			currency : 'SEK',
			amount : String(amount),
			message : Config.swishTitle+": "+amount+" kr.",
		};

		try{
			//const att = 
			await this.client.put(
				"https://mss.cpc.getswish.net/swish-cpcapi/api/v2/paymentrequests/" + uuid,
				data
			);
			//const responseData = att.data;
			return uuid;
		}catch(err){
			console.log("Failed", err.response.data);
		}

		throw new Error("Swish-fel. Försök igen eller kontakta en administratör.");

	}

	/*
		Returns a swish payment request object:
		https://developer.swish.nu/api/payment-request/v2#retrieve-payment-request
		You're probably looking for "status" which can be
		ERROR / PAID CANCELLED DECLINED or ??undefined?? the Swish API docs completely lacks this documentation ¯\_(ツ)_/¯
	*/
	async getInvoice( uuid ){

		try{
			const att = await this.client.get("https://mss.cpc.getswish.net/swish-cpcapi/api/v1/paymentrequests/"+uuid);
			return att.data;
		}
		catch(err){
			console.error("Failed", err.response.data);
		}
		throw new Error("Swish-fel. Försök igen eller kontakta en administratör.");

	}

}


