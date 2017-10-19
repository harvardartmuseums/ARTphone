//See https://github.com/cooperhewitt/objectphone

var express = require("express"),
	twilio = require("twilio"),
	rest = require("restler");

var app = express();

var apikey = process.env.APIKEY;

app.get('/', function(request, response) {
	var twilioResponse = new twilio.TwimlResponse();

	twilioResponse.say("Welcome to art phone.")
		.gather({
			action: "initial-handler",
			method: "GET",
			numDigits: 1
		}, function() {
			this.say("Press one on your phone to search the Harvard Art Museums collection by object ID.")
				.say("Press two for a random object.")
				.say("Or, press three to learn more about art phone.");
		});

	twilioResponse.say("I'm sorry, I missed that, please try again.");
	twilioResponse.redirect("/", {method: "GET"});

	response.setHeader("Content-Type", "text/xml");
	response.end(twilioResponse.toString());
});

app.get('/initial-handler', function(request, response) {
	var digits = request.query.Digits;
	
	var twilioResponse = new twilio.TwimlResponse();

	if (digits == 1) {
		twilioResponse.gather({
			action: "/object",
			method: "GET",
			timeout: 10
		}, function() {
			this.say("Ok. Enter an object ID followed by the pound key and we will see what we can do.");
		});

		response.setHeader("Content-Type", "text/xml");
		response.end(twilioResponse.toString());
	}

	if (digits == 2)  {
		twilioResponse.say("Fetching a random object. Please hold while we dig through the crates.")
			.redirect("/random", {method: "GET"});

		response.setHeader("Content-Type", "text/xml");
		response.end(twilioResponse.toString());		
	}

	if (digits == 3) {
		twilioResponse.say("Art phone is a research and development project of the Harvard Art Museums.")
			.say("It is an experiment in data accessibility and malleability.")
			.say("It is based on the Cooper Hewitt Museum's object phone project.")
			.pause({length: 1})
			.redirect("/", {method: "GET"});

		response.setHeader("Content-Type", "text/xml");
		response.end(twilioResponse.toString());	
	}

	twilioResponse.say("I missed that. Please try again.")
		.redirect("/");
	response.end(twilioResponse.toString());
});

app.get('/object-action-handler', function(request, response) {
	var objectid = request.query.objectid;
	var apiQuery = "https://api.harvardartmuseums.org/object/" + objectid + "?apikey=" + apikey;

	var twilioResponse = new twilio.TwimlResponse();

	rest.get(apiQuery)
		.on("complete", function(data) {
			if (data) {
				twilioResponse.sms("I am a " + data.worktypes[0].worktype + ". " +
									"My title is " + data.title + ". " +
									"Visit me at " + data.url + ".")
				.redirect("/", {method: "GET"});

			} else {
				//do nothing
			}

			response.setHeader("Content-Type", "text/xml");
			response.end(twilioResponse.toString());	
		})
		.on("error", function(error) {
			// twilioResponse.sms("Something went wrong. Please try again.");
			
			// response.setHeader("Content-Type", "text/xml");
			// response.end(twilioResponse.toString());	
		});				
});

app.get('/object', function(request, response) {
	var digits = request.query.Digits;
	
	var twilioResponse = new twilio.TwimlResponse();

	rest.get("https://api.harvardartmuseums.org/object/" + digits + "?apikey=" + apikey)
		.on("complete", function(data) {
			if (data.objectid) {
				twilioResponse.say("We found something for you.")
					.say("I am a " + data.worktypes[0].worktype + ".")
					.say("My title is " + data.title + ".")
					.redirect("/", {method: "GET"});

			} else {
				twilioResponse.say("I'm sorry, we couldn't find that object. Please try again.")
					.redirect("/", {method: "GET"});

			}

			response.setHeader("Content-Type", "text/xml");
			response.end(twilioResponse.toString());	
		})
		.on("error", function(error) {
			twilioResponse.say("Something went wrong. Please try again.")
				.redirect("/");
			
			response.setHeader("Content-Type", "text/xml");
			response.end(twilioResponse.toString());	
		});
});

app.get('/random', function(request, response) {
	var twilioResponse = new twilio.TwimlResponse();

	rest.get("https://api.harvardartmuseums.org/object?s=random&size=1&q=title:*&apikey=" + apikey)
		.on("complete", function(data) {
			var slowObjectID = data.records[0].objectid.toString().replace(/\B(?=(\d{1})+(?!\d))/g, ", ");

			twilioResponse.say("We found something for you.")
				.say("I am a " + data.records[0].worktypes[0].worktype + ".")
				.say("My title is " + data.records[0].title + ".")
				.pause({length: 1})
				.say("For future reference my ID number is, " + slowObjectID + ".")
				.gather({
					action: "object-action-handler?objectid=" + data.records[0].objectid,
					method: "GET",
					numDigits: 1
				}, function() {
					this.say("Press one on your phone to receive a text message containing this information.")
						.say("or, stay on the line to start over.");
				})
				.redirect("/", {method: "GET"});

			response.setHeader("Content-Type", "text/xml");
			response.end(twilioResponse.toString());	
		})
		.on("error", function(error) {
			twilioResponse.say("Something went wrong. Please try again.")
				.redirect("/");
			
			response.setHeader("Content-Type", "text/xml");
			response.end(twilioResponse.toString());	
		});
});

app.get('/sms', function(request, response) {	
	var digits = request.query.Body || "";

	switch (digits.trim().toLowerCase()) {
		case "random":
			sendSMSRandomObject(request, response);
			break;
		case "random person":
			sendSMSRandomPerson(request, response);
			break;
		case "about":
			sendSMSAbout(request, response);
			break;
		default:	
			sendSMSSpecificObject(request, response);
	}
});

var port = process.env.PORT || 5000;
app.listen(port, function() {
	console.log("Listening on " + port);
});

function sendSMSAbout(request, response) {
	var twilioResponse = new twilio.TwimlResponse();

	twilioResponse.message(function() {
		this.body("ARTphone is a R&D project of the Harvard Art Museums.")
			.body("It is an experiment in data accessibility and malleability.")
			.body("It is based on the Cooper-Hewitt Museum's object phone project.");
		});

	response.setHeader("Content-Type", "text/xml");
	response.end(twilioResponse.toString());	
}


function sendSMSRandomObject(request, response) {
	var apiQuery = "https://api.harvardartmuseums.org/object?s=random&size=1&q=title:*&apikey=" + apikey;
	var twilioResponse = new twilio.TwimlResponse();

	rest.get(apiQuery)
		.on("complete", function(data) {
			if (data) {
				data = data.records ? data.records[0] : data;

				var d = new Date();
				var daysSinceLastAccess = (d - new Date(data.dateoflastpageview))/(1000 * 60 * 60 * 24);
				var linkMessage = "";
				var imageURL = "";

				if (daysSinceLastAccess > 45) {
					linkMessage = "I haven't been viewed in quite some time. Come visit at " + data.url + ".";
				} else {
					linkMessage = "Get my whole story at " + data.url + ".";
				}

				if (data.primaryimageurl) {
					if (data.imagepermissionlevel == 0) {
						imageURL = "http://ids.lib.harvard.edu/ids/view/" + data.images[0].idsid + "?width=500&height=500";
					}
				}

				twilioResponse.message(function() {
					this.body("I am a " + data.worktypes[0].worktype + ".")
						.body("My title is " + data.title + ".")
						.body(linkMessage)
						.media(imageURL);
					});

			} else {
				//do nothing
			}

			response.setHeader("Content-Type", "text/xml");
			response.end(twilioResponse.toString());	
		})
		.on("error", function(error) {
			twilioResponse.sms("Something went wrong. Please try again.");
			
			response.setHeader("Content-Type", "text/xml");
			response.end(twilioResponse.toString());	
		});
}

function sendSMSRandomPerson(request, response) {
	var apiQuery = "https://api.harvardartmuseums.org/person?s=random&size=1&q=displayname:*&apikey=" + apikey;
	var twilioResponse = new twilio.TwimlResponse();

	rest.get(apiQuery)
		.on("complete", function(data) {
			if (data) {
				data = data.records ? data.records[0] : data;
				var linkMessage = "";

				if (data.objectcount === 1) {
					linkMessage = "I'm associated with 1 work of art in the collection. Check it out at " + data.url + ".";
				} else if (data.objectcount > 1) {
					linkMessage = "I'm associated with " + data.objectcount + " works of art in the collection. Check them out at " + data.url + ".";
				}				

				twilioResponse.message(function() {
					this.body("Hi. I am " + data.displayname + ".")
						.body(linkMessage);
					});

			} else {
				//do nothing
			}

			response.setHeader("Content-Type", "text/xml");
			response.end(twilioResponse.toString());	
		})
		.on("error", function(error) {
			twilioResponse.sms("Something went wrong. Please try again.");
			
			response.setHeader("Content-Type", "text/xml");
			response.end(twilioResponse.toString());	
		});
}

function sendSMSSpecificObject(request, response) {
	var digits = request.query.Body;
	var apiQuery = "https://api.harvardartmuseums.org/object/" + digits.trim() + "?apikey=" + apikey;
	var twilioResponse = new twilio.TwimlResponse();

	rest.get(apiQuery)
		.on("complete", function(data) {
			if (data.objectid) {
				data = data.records ? data.records[0] : data;

				var d = new Date();
				var daysSinceLastAccess = (d - new Date(data.dateoflastpageview))/(1000 * 60 * 60 * 24);
				var linkMessage = "";
				var imageURL = "";

				if (daysSinceLastAccess > 45) {
					linkMessage = "I haven't been viewed in quite some time. Come visit at " + data.url + ".";
				} else {
					linkMessage = "Get my whole story at " + data.url + ".";
				}

				if (data.primaryimageurl) {
					if (data.imagepermissionlevel == 0) {
						imageURL = "https://ids.lib.harvard.edu/ids/view/" + data.images[0].idsid + "?width=500&height=500";
					}
				}				

				twilioResponse.message(function() {
					this.body("I am a " + data.worktypes[0].worktype + ".")
						.body("My title is " + data.title + ".")
						.body(linkMessage)
						.media(imageURL);
					});

			} else {
				twilioResponse.message(digits + " doesn't mean anything to me. Please try again.");
			}

			response.setHeader("Content-Type", "text/xml");
			response.end(twilioResponse.toString());	
		})
		.on("error", function(error) {
			twilioResponse.sms("Something went wrong. Please try again.");
			
			response.setHeader("Content-Type", "text/xml");
			response.end(twilioResponse.toString());	
		});
}