const request = require('request');

var scrapeProxies = new Promise((resolve, reject) => {
	
	request({
		method: "GET",
		url: "https://api.proxyscrape.com/?request=displayproxies&proxytype=http&timeout=100&anonymity=transparent&ssl=yes"
	}, (errror, response, body) => {
		if (body) {
			return resolve(body.split("\n"));
		} else {
			return reject();
		}
	});

});
  
module.exports = { scrapeProxies };