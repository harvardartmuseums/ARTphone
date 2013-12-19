//See https://github.com/cooperhewitt/objectphone

var express = require("express"),
	twilio = require("twilio"),
	rest = require("restler");

var app = express();

app.get('/', function(request, response) {
	var twilioResponse = new twilio.TwimlResponse();

	twilioResponse.say("Welcome to HAM phone.")
		.gather({
			action: "initial-handler",
			method: "GET",
			numDigits: 1
		}, function() {
			this.say("Press one on your phone to search the Harvard Art Museums collection by object ID.")
				.say("or, For a random object, press 2.");
		});

	twilioResponse.say("I'm sorry, I missed that, please try again.");
	twilioResponse.redirect("/");

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

	twilioResponse.say("I missed that. Please try again.")
		.redirect("/");
	response.end(twilioResponse.toString());
});

app.get('/object', function(request, response) {
	var digits = request.query.Digits;
	
	var twilioResponse = new twilio.TwimlResponse();

	rest.get("http://api.harvardartmuseums.org/collection/object/" + digits)
		.on("complete", function(data) {
			if (data) {
				twilioResponse.say("We found something for you.")
					.say("I am a " + data.subclassification + ".")
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

	rest.get("http://api.harvardartmuseums.org/collection/object?s=random&size=1&q=title:*")
		.on("complete", function(data) {
			var slowObjectID = data.records[0].objectid.toString().replace(/\B(?=(\d{1})+(?!\d))/g, ", ");
			
			twilioResponse.say("We found something for you.")
				.say("I am a " + data.records[0].subclassification + ".")
				.say("My title is " + data.records[0].title + ".")
				.pause({length: 1})
				.say("For future reference my ID number is, " + slowObjectID + ".")
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
	var digits = request.query.Body;

	var twilioResponse = new twilio.TwimlResponse();

	rest.get("http://api.harvardartmuseums.org/collection/object/" + digits)
		.on("complete", function(data) {
			if (data) {
				twilioResponse.message(function() {
					this.body("I am a " + data.subclassification + ".")
						.body("My title is " + data.title + ".")
						.body("Get my whole story at " + data.url);
						// .media(data.primaryimageurl + "?width=200&height=200");
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
});

var port = process.env.PORT || 5000;
app.listen(port, function() {
	console.log("Listening on " + port);
});