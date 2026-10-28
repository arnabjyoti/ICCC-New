const AuthController = require('./AuthController');
const sendMail = require('./sendMail');
const driverController = require('./driverController');
const operatorController = require('./operatorController');
const vehicleController = require('./vehicleController');
const vehicleRoutesController = require('./vehicleRoutesController');
const busController = require('./busController');
const travelHistoryController = require('./travelHistoryController');
const fuelController = require('./fuelController');
module.exports = {
	AuthController,
	sendMail,
	driverController,
	operatorController,
	vehicleController,
	vehicleRoutesController,
	busController,
	travelHistoryController,
	fuelController
};
