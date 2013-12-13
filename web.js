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
			finishOnKey: "*"
		}, function() {
			this.say("Press one on your phone to search the Harvard Art Museums collection by object ID.")
				.say("or, For a random object, press 2.");
		});

	twilioResponse.say("I'm sorry, I missed that, please try again.");
	twilioResponse.redirect("/")

	response.setHeader("Content-Type", "text/xml");
	response.end(twilioResponse.toString());
});

app.get('/initial-handler', function(request, response) {
	var digits = request.query.Digits;
	
	var twilioResponse = new twilio.TwimlResponse();

	if (digits == 1) {
		twilioResponse.say("Fetching an object.");
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

app.get('/random', function(request, response) {
	var twilioResponse = new twilio.TwimlResponse();

	rest.get("http://api.harvardartmuseums.org/collection/object?s=random&size=1")
		.on("complete", function(data) {
			twilioResponse.say("We found something for you.")
				.say("The title is " + data.records[0].title)
				.redirect("/", {method: "GET"});

			response.end(twilioResponse.toString());	
		});


	twilioResponse.say("Something went wrong. Please try again.")
		.redirect("/");
	response.end(twilioResponse.toString());	
});

var port = process.env.PORT || 5000;
app.listen(port, function() {
	console.log("Listening on " + port);
});