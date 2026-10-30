const { sendMail, driverController, operatorController, vehicleController, vehicleRoutesController, busController, fuelController } = require('../controllers');

const AuthController = require('../controllers').AuthController;

const travelHistoryController = require('../controllers/travelHistoryController');
const Models = require('../models');
const createDriverRouter = require('./driverApp');

//Api's
module.exports = (app) => {
	// Driver Mobile App APIs
	const driverRouter = createDriverRouter(Models);
	app.use('/api', driverRouter);
	app.use('/api/driver', driverRouter);

	app.get('/api', (req, res) =>
		res.status(200).send({
			message: 'Welcome'
		})
	);

	app.post('/api/authenticate', AuthController.authenticate);
	app.post('/api/sendOtp', sendMail.sendOtp);
	app.post('/api/verifyEmail', AuthController.verifyEmail);


	app.post('/api/saveDriver', driverController.upload_driver_image.single("photo"), driverController.saveDriver);
	app.post('/api/updateDriver', driverController.upload_driver_image.single("photo"), driverController.updateDriver);
	app.post('/api/deleteDriver', driverController.deleteDriver);
	app.get('/api/getDriver', driverController.getDriver);

	app.post('/api/saveOperator', operatorController.upload_operator_image.single("photo"), operatorController.saveOperator);
	app.post('/api/updateOperator', operatorController.upload_operator_image.single("photo"), operatorController.updateOperator);
	app.post('/api/deleteOperator', operatorController.deleteOperator);
	app.get('/api/getOperator', operatorController.getOperator);

	app.get('/api/getVehicleMaster', vehicleController.getVehicleMaster);
	app.post('/api/saveVehicle', vehicleController.saveVehicle);
	app.post('/api/updateVehicle', vehicleController.updateVehicle);
	app.post('/api/deleteVehicle', vehicleController.deleteVehicle);

	app.get('/api/getVehicleRoutes', vehicleRoutesController.getVehicleRoutes);
	app.post('/api/saveRoute', vehicleRoutesController.saveRoute);
	app.post('/api/updateRoute', vehicleRoutesController.updateRoute);
	app.post('/api/deleteRoute', vehicleRoutesController.deleteRoute);

	app.get('/api/getBusList', busController.getBusList);
	app.post('/api/getBusData', busController.getBusData);

	app.post('/api/saveDailyUpdates', busController.saveDailyUpdates);
	app.post('/api/updateDailyUpdates', busController.updateDailyUpdates);
	app.post('/api/getOneTripDetails', busController.getOneTripDetails);

	// Travel History & Route Replay Routes
	app.get('/api/getTravelHistory', travelHistoryController.getVehicleHistoryByDate);
	app.post('/api/fetchTravelHistory', travelHistoryController.fetchTravelHistory);

	// Fuel Management Routes
	app.get('/api/getFuelSummary', fuelController.getFuelSummary);
	app.get('/api/getFuelLogs', fuelController.getFuelLogs);
	app.get('/api/getLastRefuelInfo', fuelController.getLastRefuelInfo);
	app.post('/api/saveFuelLog', fuelController.uploadFuelImages, fuelController.saveFuelLog);
	app.post('/api/deleteFuelLog', fuelController.deleteFuelLog);
	app.get('/api/getFuelAlerts', fuelController.getFuelAlerts);
	app.post('/api/resolveFuelAlert', fuelController.resolveFuelAlert);
	app.post('/api/updateVehicleFuelProfile', fuelController.updateVehicleFuelProfile);
};