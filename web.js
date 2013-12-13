var express = require("express"),
	twilio = require("twilio"),
	rest = require("restler");

var app = express();

var twilioResponse = new twilio.TwimlResponse();

app.get('/', function(request, response) {
	twilioResponse.say("Welcome to HAM phone.");

	rest.get("http://api.harvardartmuseums.org/collection/object?s=random&size=1", {timeout:10000})
		.on("complete", function(result) {
			twilioResponse.say(result.records[0].title);

			response.setHeader("Content-Type", "text/xml")
			response.end(twilioResponse.toString());
		
		}).on("timeout", function(ms) {
			response.setHeader("Content-Type", "text/xml")
			response.end(twilioResponse.toString());

		});

});

var port = process.env.PORT || 5000;
app.listen(port, function() {
	console.log("Listening on " + port);
});