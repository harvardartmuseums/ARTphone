var express = require("express"),
	twilio = require("twilio");

var app = express();

var twilioResponse = new twilio.TwimlResponse();

app.get('/', function(request, response) {
	twilioResponse.say("Welcome to HAM phone.");

	response.setHeader("Content-Type", "text/xml")
	response.send(twilioResponse.toString());
});

var port = process.env.PORT || 5000;
app.listen(port, function() {
	console.log("Listening on " + port);
});